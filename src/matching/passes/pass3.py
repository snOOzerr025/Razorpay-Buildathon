"""
Pass 3 — Refund / Reversal linkage.

Objective: bind negative cash-flow records (refunds, chargebacks) back to
their original charge, so the reconciliation engine understands the full
lifecycle of a payment — not just the initial capture.

Match criteria
--------------
1. Gateway record has ``status IN ('refunded', 'chargeback')``.
2. The gateway record has a ``parent_transaction_id`` pointing to a
   ``canonical_transactions.id`` that was already matched (or is in the
   current unmatched set as a captured transaction).
3. The refund ``gross_amount`` does NOT exceed the parent's ``gross_amount``
   (partial refunds are valid; over-refunds are an exception).
4. The bank settlement has a matching negative (or reduced) ``net_amount``
   within ±₹1.00 of the computed refund net.  If no bank record matches,
   the refund is still linked to its parent as a pending exception (the bank
   credit may come in a later batch).

Tier: HOTL — higher blast radius than exact matches (a wrong refund linkage
corrupts the parent transaction's lifecycle), so a monitored window is
applied before posting, but no explicit human approval is required.

Refund net computation
----------------------
Refund net = refund_gross - (refund_gross * mdr_fee_pct) - (refund_gross * mdr_fee_pct * gst_rate) - tds
The MDR fee and GST on a refund are often reversed by the gateway (fee
recovery), but the exact behavior varies by processor.  The engine stores
the raw amounts and flags discrepancies in the explanation rather than
silently assuming fee recovery.

Design: recall over precision
------------------------------
If a refund has no parent_transaction_id (bad data / missing field), Pass 3
does NOT attempt heuristic matching against all captured records.  That
would produce too many false matches.  The orphaned refund is routed to the
exception queue as ``category = 'transaction_error'``.

Non-negotiable rule compliance
-------------------------------
* Over-refund detection (refund > parent) routes to exception, not auto-match.
* Every candidate has an explanation that references the original parent
  transaction ID and the over-refund check result.
* confidence_score is always None (deterministic pass).
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from src.matching.types import (
    ExceptionCategory,
    MatchCandidate,
    MatchMember,
    MatchPass,
    MatchTier,
    PassResult,
    RecordType,
    UnmatchedRecord,
)

logger = logging.getLogger(__name__)

# Tolerance for refund amount matching against bank settlement
REFUND_AMOUNT_TOLERANCE: Decimal = Decimal("1.00")

# Max days between the original transaction and the refund settlement
REFUND_DATE_WINDOW_DAYS: int = 30   # refunds/chargebacks can take weeks

_REFUND_STATUSES = frozenset({"refunded", "chargeback"})


def run_pass3(
    gateway_records: list[dict[str, Any]],
    bank_records: list[dict[str, Any]],
    ledger_records: list[dict[str, Any]],
    unmatched_gateway_ids: set[int],
    unmatched_bank_ids: set[int],
    unmatched_ledger_ids: set[int],
) -> PassResult:
    """
    Execute Pass 3: refund / reversal linkage.

    Only operates on gateway records with refund/chargeback status that
    remain unmatched after Passes 1 and 2.
    """
    result = PassResult(
        pass_name=MatchPass.PASS3_REFUND,
        unmatched_gateway_ids=set(unmatched_gateway_ids),
        unmatched_bank_ids=set(unmatched_bank_ids),
        unmatched_ledger_ids=set(unmatched_ledger_ids),
    )

    # Index all gateway records by ID for parent lookups
    gw_by_id: dict[int, dict] = {gw["id"]: gw for gw in gateway_records}

    # Index bank records by (currency, net_amount bucket) for fast lookup
    # Use negative amounts for refund credits — some gateways send negative, some positive
    bank_by_currency: dict[str, list[dict]] = {}
    for bank in bank_records:
        if bank["id"] not in unmatched_bank_ids:
            continue
        bank_by_currency.setdefault(bank["currency"], []).append(bank)

    for gw in gateway_records:
        if gw["id"] not in unmatched_gateway_ids:
            continue
        if gw.get("status") not in _REFUND_STATUSES:
            continue

        parent_id = gw.get("parent_transaction_id")
        if not parent_id:
            # No parent link — cannot safely bind. Route to exception.
            logger.warning(
                "Pass3: refund gw=%s has no parent_transaction_id — exception queue",
                gw["id"],
            )
            result.unmatched_gateway_ids.discard(gw["id"])  # pulled out of general pool
            # Will be picked up by Pass 5 as transaction_error
            continue

        parent = gw_by_id.get(int(parent_id))
        if not parent:
            logger.warning(
                "Pass3: parent_transaction_id=%s not found in loaded records for refund gw=%s",
                parent_id, gw["id"],
            )
            continue

        # Over-refund guard
        refund_gross  = _decimal(gw["gross_amount"])
        parent_gross  = _decimal(parent["gross_amount"])
        if refund_gross > parent_gross:
            logger.error(
                "Pass3: OVER-REFUND detected — refund gw=%s gross=%.2f > parent gw=%s gross=%.2f "
                "— routing to exception (transaction_error)",
                gw["id"], refund_gross, parent["id"], parent_gross,
            )
            # Do NOT auto-match. Let Pass 5 classify as transaction_error.
            continue

        # Compute expected refund net (may be negative or positive depending on gateway convention)
        refund_net_expected = _decimal(gw.get("expected_net_amount") or _compute_net(gw))

        # Find a matching bank settlement
        currency  = gw["currency"]
        matched_bank: dict | None = None
        for bank in bank_by_currency.get(currency, []):
            if bank["id"] not in result.unmatched_bank_ids:
                continue
            if _refund_bank_match(bank, refund_net_expected, gw, parent):
                matched_bank = bank
                break

        # Build members
        members = [
            MatchMember(RecordType.CANONICAL_TRANSACTION, gw["id"]),      # refund txn
            MatchMember(RecordType.CANONICAL_TRANSACTION, parent["id"]),  # original charge
        ]
        if matched_bank:
            members.append(MatchMember(RecordType.BANK_SETTLEMENT, matched_bank["id"]))

        explanation = _build_explanation(gw, parent, matched_bank, refund_net_expected)
        candidate = MatchCandidate(
            matched_pass=MatchPass.PASS3_REFUND,
            tier=MatchTier.HOTL,
            members=members,
            explanation=explanation,
            confidence_score=None,
        )
        result.candidates.append(candidate)

        result.unmatched_gateway_ids.discard(gw["id"])
        # Parent transaction is NOT removed from unmatched — it was already matched
        # (or will be) on the captured side. The refund is an additional member.
        if matched_bank:
            result.unmatched_bank_ids.discard(matched_bank["id"])

        logger.debug(
            "Pass3 refund match: refund_gw=%s parent_gw=%s bank=%s",
            gw["id"], parent["id"], matched_bank["id"] if matched_bank else "none",
        )

    result.stats = {
        "matched_count":     len(result.candidates),
        "remaining_gateway": len(result.unmatched_gateway_ids),
        "remaining_bank":    len(result.unmatched_bank_ids),
        "amount_tolerance":  str(REFUND_AMOUNT_TOLERANCE),
        "date_window_days":  REFUND_DATE_WINDOW_DAYS,
    }

    logger.info(
        "Pass 3 complete: %d refund matches | %d gateway remaining | %d bank remaining",
        result.matched_count,
        len(result.unmatched_gateway_ids),
        len(result.unmatched_bank_ids),
    )
    return result


# ---------------------------------------------------------------------------
# Matching predicate
# ---------------------------------------------------------------------------

def _refund_bank_match(
    bank: dict,
    refund_net_expected: Decimal,
    refund_gw: dict,
    parent_gw: dict,
) -> bool:
    """Return True if this bank record is a plausible refund settlement."""
    bank_net   = _decimal(bank["net_amount"])
    # Refund credits: bank may post as negative OR as a separate positive entry
    # depending on gateway. Accept both.
    delta = min(
        abs(bank_net - refund_net_expected),
        abs(bank_net + refund_net_expected),  # negative convention
    )
    if delta > REFUND_AMOUNT_TOLERANCE:
        return False

    # Date: refund settlement must come after the original transaction
    orig_date = _to_date(parent_gw["transaction_ts"])
    bank_date = _to_date(bank["value_date"])
    lag = (bank_date - orig_date).days
    if not (0 <= lag <= REFUND_DATE_WINDOW_DAYS):
        return False

    return True


# ---------------------------------------------------------------------------
# Explanation builder
# ---------------------------------------------------------------------------

def _build_explanation(
    refund_gw: dict,
    parent_gw: dict,
    matched_bank: dict | None,
    refund_net: Decimal,
) -> dict[str, Any]:
    refund_gross = _decimal(refund_gw["gross_amount"])
    parent_gross = _decimal(parent_gw["gross_amount"])

    expl: dict[str, Any] = {
        "pass": MatchPass.PASS3_REFUND.value,
        "refund": {
            "refund_gw_id":         refund_gw["id"],
            "parent_gw_id":         parent_gw["id"],
            "status":               refund_gw.get("status"),
            "refund_gross":         str(refund_gross),
            "parent_gross":         str(parent_gross),
            "over_refund":          refund_gross > parent_gross,
            "computed_refund_net":  str(refund_net),
        },
    }

    if matched_bank:
        bank_net  = _decimal(matched_bank["net_amount"])
        bank_date = _to_date(matched_bank["value_date"])
        orig_date = _to_date(parent_gw["transaction_ts"])
        expl["bank_settlement"] = {
            "bank_settlement_id": matched_bank["id"],
            "bank_net":           str(bank_net),
            "delta":              str(bank_net - refund_net),
            "refund_lag_days":    (bank_date - orig_date).days,
        }
        expl["human_readable_summary"] = (
            f"{refund_gw.get('status', 'refund').title()} ₹{refund_gross:.2f} "
            f"linked to original charge ₹{parent_gross:.2f} "
            f"(TXN {parent_gw.get('external_transaction_id', '?')}). "
            f"Bank credit ₹{bank_net:.2f} (Δ₹{(bank_net - refund_net):+.2f})."
        )
    else:
        expl["human_readable_summary"] = (
            f"{refund_gw.get('status', 'refund').title()} ₹{refund_gross:.2f} "
            f"linked to original charge ₹{parent_gross:.2f} "
            f"(TXN {parent_gw.get('external_transaction_id', '?')}). "
            f"No matching bank credit found — may arrive in a later batch."
        )

    return expl


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def _compute_net(gw: dict) -> Decimal:
    """Compute expected_net_amount from raw fields if not pre-computed."""
    from src.money import expected_net_amount
    return expected_net_amount(
        gross_amount=gw.get("gross_amount", "0"),
        mdr_fee_rate=gw.get("mdr_fee_pct"),
        gst_rate=gw.get("gst_rate"),
        tds_amount=gw.get("tds_amount"),
    )


def _decimal(value: object) -> Decimal:
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def _to_date(value: object) -> date:
    if isinstance(value, date) and not hasattr(value, "hour"):
        return value
    from datetime import datetime
    s = str(value).strip()
    if len(s) == 10:
        return date.fromisoformat(s)
    try:
        return datetime.fromisoformat(s).date()
    except ValueError:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).date()

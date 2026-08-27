"""
Pass 2 — Tolerance-aware match.

Objective: catch real matches that Pass 1 missed because of:
  * Settlement lag: bank value_date is T+1 to T+3 after gateway timestamp
  * Fee rounding: net_amount differs from expected_net by a small delta (≤ AMOUNT_TOLERANCE)
  * Weak reference: no exact UTR/ext_id match, but currency + amount + date window agree

Match criteria (ALL must hold)
-------------------------------
1. Same ``currency``.
2. ``|expected_net_amount - bank_net_amount| ≤ AMOUNT_TOLERANCE`` (default ₹0.50).
   This covers MDR/GST rounding differences between what the engine computes
   and what the bank actually remits.
3. ``bank.value_date`` is within ``[gw.transaction_ts_date, gw.transaction_ts_date + DATE_WINDOW_DAYS]``.
   One-directional: settlement always comes AFTER or same day as the transaction.
4. NOT already matched by Pass 1.

No reference match required — Pass 2 is deliberately looser on identifiers.
If a reference is available and agrees, it is noted in the explanation as
``reference_agree: true``; if absent, ``reference_agree: false`` (not a
disqualification, just reported).

Tier: HOOTL — deterministic within configured bounds.

Ambiguity rule (AGENTS.md: default to surfacing uncertainty)
-------------------------------------------------------------
If multiple gateway records satisfy criteria for the same bank settlement
(same currency + within tolerance amount + within date window), Pass 2 does
NOT pick one silently.  All candidates are returned and routed to Pass 5
(exception queue) with ``category = 'unresolved'``.  A wrong auto-match is
a real error; a surfaced ambiguity is seconds of review time.

Algorithm
---------
Index gateway by ``currency`` only (bucket). Then for each bank settlement
scan the currency bucket and filter by amount tolerance + date. Worst case
O(N²) for same-currency-day batches, but realistic payment ledgers have low
same-currency-same-amount-same-day collision rates. If this proves slow at
scale, add a secondary bucket on ``round(net_amount, -1)`` (₹10 buckets).
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from src.matching.types import (
    MatchCandidate,
    MatchMember,
    MatchPass,
    MatchTier,
    PassResult,
    RecordType,
)

logger = logging.getLogger(__name__)

# Configurable tolerances — kept as module-level constants so they appear
# clearly in the explanation dict and are easy to tune without code changes.
AMOUNT_TOLERANCE: Decimal = Decimal("0.50")   # ₹0.50 max absolute delta
DATE_WINDOW_DAYS: int     = 3                  # settlement lag T+0 to T+3


def run_pass2(
    gateway_records: list[dict[str, Any]],
    bank_records: list[dict[str, Any]],
    ledger_records: list[dict[str, Any]],
    unmatched_gateway_ids: set[int],
    unmatched_bank_ids: set[int],
    unmatched_ledger_ids: set[int],
) -> PassResult:
    """
    Execute Pass 2: tolerance-aware match (settlement lag + fee rounding).

    Only operates on records that remain unmatched after Pass 1.
    """
    result = PassResult(
        pass_name=MatchPass.PASS2_TOLERANCE,
        unmatched_gateway_ids=set(unmatched_gateway_ids),
        unmatched_bank_ids=set(unmatched_bank_ids),
        unmatched_ledger_ids=set(unmatched_ledger_ids),
    )

    # Gateway index: int(amount) -> list[gw] to avoid O(N^2) comparisons
    gw_by_int_amount: dict[int, list[dict]] = {}
    for gw in gateway_records:
        if gw["id"] not in unmatched_gateway_ids:
            continue
        amt = int(_decimal(gw.get("expected_net_amount") or gw.get("gross_amount", "0")))
        gw_by_int_amount.setdefault(amt, []).append(gw)

    # Ledger index: order_id → ledger_row
    ledger_index: dict[str, dict] = {
        led["order_id"]: led
        for led in ledger_records
        if led["id"] in unmatched_ledger_ids
    }

    ambiguous_bank_ids: set[int] = set()

    for bank in bank_records:
        if bank["id"] not in unmatched_bank_ids:
            continue
        if bank["id"] in ambiguous_bank_ids:
            continue

        bank_currency  = bank["currency"]
        bank_net       = _decimal(bank["net_amount"])
        bank_date      = _to_date(bank["value_date"])

        # Collect ALL gateway records that satisfy criteria for this settlement
        qualifying: list[dict] = []
        bank_int = int(bank_net)
        
        # We only need to check [bank_int - 1, bank_int, bank_int + 1] because tolerance is 0.50
        for bucket_key in (bank_int - 1, bank_int, bank_int + 1):
            for gw in gw_by_int_amount.get(bucket_key, []):
                if gw["id"] not in result.unmatched_gateway_ids:
                    continue
                if gw["currency"] != bank_currency:
                    continue
                if _tolerance_match(gw, bank_net, bank_date):
                    qualifying.append(gw)

        if not qualifying:
            continue

        if len(qualifying) > 1:
            # Ambiguous — do not pick silently (AGENTS.md rule 5)
            logger.warning(
                "Pass2 ambiguous: bank=%s net=%.2f has %d qualifying gateway records "
                "— routing to exception queue",
                bank["id"], bank_net, len(qualifying),
            )
            ambiguous_bank_ids.add(bank["id"])
            continue

        # Exactly one qualifying gateway record
        match_gw = qualifying[0]

        members = [
            MatchMember(RecordType.CANONICAL_TRANSACTION, match_gw["id"]),
            MatchMember(RecordType.BANK_SETTLEMENT, bank["id"]),
        ]

        # Opportunistic 3-way ledger linkage
        matched_ledger: dict | None = None
        order_id = match_gw.get("order_id")
        if order_id and order_id in ledger_index:
            lrec = ledger_index[order_id]
            if lrec["id"] in result.unmatched_ledger_ids:
                matched_ledger = lrec
                members.append(MatchMember(RecordType.MERCHANT_LEDGER, lrec["id"]))

        candidate = MatchCandidate(
            matched_pass=MatchPass.PASS2_TOLERANCE,
            tier=MatchTier.HOOTL,
            members=members,
            explanation=_build_explanation(match_gw, bank),
            confidence_score=None,
        )
        result.candidates.append(candidate)

        result.unmatched_gateway_ids.discard(match_gw["id"])
        result.unmatched_bank_ids.discard(bank["id"])
        if matched_ledger:
            result.unmatched_ledger_ids.discard(matched_ledger["id"])

        logger.debug(
            "Pass2 tolerance match: gw=%s bank=%s delta=%.2f lag=%+d days",
            match_gw["id"], bank["id"],
            abs(_decimal(match_gw["expected_net_amount"]) - bank_net),
            (_to_date(bank["value_date"]) - _to_date(match_gw["transaction_ts"])).days,
        )

    result.stats = {
        "matched_count":       len(result.candidates),
        "ambiguous_count":     len(ambiguous_bank_ids),
        "remaining_gateway":   len(result.unmatched_gateway_ids),
        "remaining_bank":      len(result.unmatched_bank_ids),
        "amount_tolerance":    str(AMOUNT_TOLERANCE),
        "date_window_days":    DATE_WINDOW_DAYS,
    }

    logger.info(
        "Pass 2 complete: %d matches | %d ambiguous | %d gateway remaining | %d bank remaining",
        result.matched_count, len(ambiguous_bank_ids),
        len(result.unmatched_gateway_ids), len(result.unmatched_bank_ids),
    )
    return result


# ---------------------------------------------------------------------------
# Matching predicate
# ---------------------------------------------------------------------------

def _tolerance_match(gw: dict, bank_net: Decimal, bank_date: date) -> bool:
    """Return True iff gw satisfies Pass-2 criteria for the given bank record."""
    # Amount within tolerance
    delta = abs(_decimal(gw["expected_net_amount"]) - bank_net)
    if delta > AMOUNT_TOLERANCE:
        return False

    # Date: bank settles AFTER or same day, within DATE_WINDOW_DAYS
    gw_date = _to_date(gw["transaction_ts"])
    lag_days = (bank_date - gw_date).days
    if not (0 <= lag_days <= DATE_WINDOW_DAYS):
        return False

    return True


# ---------------------------------------------------------------------------
# Explanation builder
# ---------------------------------------------------------------------------

def _build_explanation(gw: dict, bank: dict) -> dict[str, Any]:
    gw_net    = _decimal(gw["expected_net_amount"])
    bank_net  = _decimal(bank["net_amount"])
    delta     = bank_net - gw_net
    gw_date   = _to_date(gw["transaction_ts"])
    bank_date = _to_date(bank["value_date"])
    lag_days  = (bank_date - gw_date).days

    # Reference agreement is informational only in Pass 2
    utr       = str(bank.get("utr", "")).strip()
    ext_id    = str(gw.get("external_transaction_id", "")).strip()
    narration = str(bank.get("narration", "")).upper()
    ref_agree = bool(
        (utr and ext_id and (utr == ext_id or utr in narration))
        or (gw.get("order_id") and str(gw.get("order_id", "")) in narration)
    )

    return {
        "pass": MatchPass.PASS2_TOLERANCE.value,
        "field_agreement": {
            "currency": {"agree": True, "value": gw["currency"]},
            "amount": {
                "agree": True,
                "expected_net":      str(gw_net),
                "bank_net":          str(bank_net),
                "delta":             str(delta),
                "tolerance":         str(AMOUNT_TOLERANCE),
                "within_tolerance":  abs(delta) <= AMOUNT_TOLERANCE,
            },
            "date": {
                "agree": True,
                "gateway_date":      str(gw_date),
                "bank_value_date":   str(bank_date),
                "lag_days":          lag_days,
                "window_days":       DATE_WINDOW_DAYS,
            },
            "reference": {
                "agree": ref_agree,
                "gateway_ext_id":    ext_id,
                "bank_utr":          utr,
                "note": (
                    "reference matched" if ref_agree
                    else "matched on amount+date; no reference link"
                ),
            },
        },
        "human_readable_summary": (
            f"Tolerance match: ₹{bank_net:.2f} settled {lag_days}d after transaction "
            f"(delta ₹{delta:+.2f}, tolerance ±₹{AMOUNT_TOLERANCE}). "
            f"{'Ref confirmed.' if ref_agree else 'No ref link — amount+date only.'}"
        ),
    }


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

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

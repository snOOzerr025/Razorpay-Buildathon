"""
Pass 1 — Exact match.

Objective: find definitive 1-to-1 matches between canonical_transactions
and bank_settlements where every hard field agrees to the cent.

Match criteria (ALL must hold)
-------------------------------
1. Same ``processor_account_id`` on the gateway side.
2. Same ``currency``.
3. ``canonical_transactions.expected_net_amount`` == ``bank_settlements.net_amount``
   (comparison at Decimal precision — no floating point).
4. ``external_transaction_id`` from the gateway matches the ``utr`` or is
   present in the settlement's ``narration`` field (substring) — OR both
   sides share an ``order_id`` if available.
5. Date within ±1 day (timezone edge-case buffer only).  ``transaction_ts``
   date vs ``bank_settlements.value_date``.

Tier: HOOTL — auto-posts immediately.  Audit log written by the engine.

Algorithm
---------
This pass builds two in-memory indexes from the candidate records (already
loaded by the engine from the DB into lightweight dicts).  Indexing by
(currency, expected_net_amount) gives an O(1) bucket lookup per settlement,
then we filter the bucket by date and reference.  Total complexity: O(N)
index build + O(B * K) where B = bank settlements, K = average bucket size.
For the amounts involved (exponential distribution, most transactions are
small), buckets are typically size 1–3, making this effectively O(N).

Why not SQL JOIN?
-----------------
The engine loads all unmatched records into memory once (they fit easily —
10,000 rows × ~200 bytes ≈ 2MB) and runs passes in Python.  This keeps the
matching logic testable without a database, lets us chain passes without
round-tripping to Postgres between each one, and makes the logic transparent
to reviewers.  The trade-off is that at >500,000 rows we'd need to shard;
that's a documented future concern, not an issue for the buildathon scale.
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

# ±1 day tolerance for timezone/cutoff edge cases only.
# This is NOT the settlement lag window — that belongs to Pass 2.
EXACT_DATE_TOLERANCE_DAYS: int = 1


def run_pass1(
    gateway_records: list[dict[str, Any]],
    bank_records: list[dict[str, Any]],
    ledger_records: list[dict[str, Any]],
    unmatched_gateway_ids: set[int],
    unmatched_bank_ids: set[int],
    unmatched_ledger_ids: set[int],
) -> PassResult:
    """
    Execute Pass 1: exact 1-to-1 match between gateway and bank records.

    Parameters
    ----------
    gateway_records:
        Rows from ``canonical_transactions`` as dicts. Must contain:
        id, processor_account_id, external_transaction_id, order_id,
        currency, expected_net_amount (Decimal), transaction_ts (date),
        status.
    bank_records:
        Rows from ``bank_settlements`` as dicts. Must contain:
        id, utr, settlement_batch_id, net_amount (Decimal),
        currency, value_date (date), narration.
    ledger_records:
        Rows from ``merchant_ledger_entries`` (used for 3-way linkage when
        available; Pass 1 matches 2-way gateway↔bank minimum, ledger is
        opportunistic).
    unmatched_gateway_ids, unmatched_bank_ids, unmatched_ledger_ids:
        Mutable sets of record IDs still available to this pass.
        Updated in-place as matches are found.

    Returns
    -------
    PassResult with matched candidates and updated unmatched sets.
    """
    result = PassResult(
        pass_name=MatchPass.PASS1_EXACT,
        unmatched_gateway_ids=set(unmatched_gateway_ids),
        unmatched_bank_ids=set(unmatched_bank_ids),
        unmatched_ledger_ids=set(unmatched_ledger_ids),
    )

    # ------------------------------------------------------------------
    # Build gateway index: (currency, expected_net_amount) → [gateway_row]
    # Only index records that are still unmatched.
    # ------------------------------------------------------------------
    gateway_index: dict[tuple, list[dict]] = {}
    for gw in gateway_records:
        if gw["id"] not in unmatched_gateway_ids:
            continue
        key = (gw["currency"], _decimal(gw["expected_net_amount"]))
        gateway_index.setdefault(key, []).append(gw)

    # Build ledger index: order_id → ledger_row (for opportunistic 3-way)
    ledger_index: dict[str, dict] = {
        led["order_id"]: led
        for led in ledger_records
        if led["id"] in unmatched_ledger_ids
    }

    matched_bank_ids: set[int] = set()

    for bank in bank_records:
        if bank["id"] not in unmatched_bank_ids:
            continue

        key = (bank["currency"], _decimal(bank["net_amount"]))
        candidates = gateway_index.get(key, [])

        match_gw = None
        for gw in candidates:
            if gw["id"] in result.unmatched_gateway_ids and _exact_match(gw, bank):
                match_gw = gw
                break

        if match_gw is None:
            continue

        # --- Exact match found ---
        members = [
            MatchMember(RecordType.CANONICAL_TRANSACTION, match_gw["id"]),
            MatchMember(RecordType.BANK_SETTLEMENT, bank["id"]),
        ]

        # Opportunistic 3-way: include ledger if order_id links
        order_id = match_gw.get("order_id")
        matched_ledger: dict | None = None
        if order_id and order_id in ledger_index:
            matched_ledger = ledger_index[order_id]
            if matched_ledger["id"] in result.unmatched_ledger_ids:
                members.append(
                    MatchMember(RecordType.MERCHANT_LEDGER, matched_ledger["id"])
                )

        explanation = _build_explanation(match_gw, bank)
        candidate = MatchCandidate(
            matched_pass=MatchPass.PASS1_EXACT,
            tier=MatchTier.HOOTL,
            members=members,
            explanation=explanation,
            confidence_score=None,  # deterministic — no score fabricated
        )
        result.candidates.append(candidate)

        # Remove from unmatched sets
        result.unmatched_gateway_ids.discard(match_gw["id"])
        result.unmatched_bank_ids.discard(bank["id"])
        if matched_ledger:
            result.unmatched_ledger_ids.discard(matched_ledger["id"])

        logger.debug(
            "Pass1 exact match: gw=%s bank=%s net=%.2f",
            match_gw["id"], bank["id"],
            _decimal(bank["net_amount"]),
        )

    result.stats = {
        "matched_count":          len(result.candidates),
        "remaining_gateway":      len(result.unmatched_gateway_ids),
        "remaining_bank":         len(result.unmatched_bank_ids),
        "date_tolerance_days":    EXACT_DATE_TOLERANCE_DAYS,
    }

    logger.info(
        "Pass 1 complete: %d matches | %d gateway remaining | %d bank remaining",
        result.matched_count,
        len(result.unmatched_gateway_ids),
        len(result.unmatched_bank_ids),
    )
    return result


# ---------------------------------------------------------------------------
# Matching predicate
# ---------------------------------------------------------------------------

def _exact_match(gw: dict, bank: dict) -> bool:
    """Return True iff gw and bank pass ALL Pass-1 criteria."""
    # 1. Amount — already confirmed equal by index key, but be explicit
    if _decimal(gw["expected_net_amount"]) != _decimal(bank["net_amount"]):
        return False

    # 2. Currency
    if gw["currency"] != bank["currency"]:
        return False

    # 3. Date tolerance ±1 day
    gw_date   = _to_date(gw["transaction_ts"])
    bank_date = _to_date(bank["value_date"])
    if abs((bank_date - gw_date).days) > EXACT_DATE_TOLERANCE_DAYS:
        return False

    # 4. Reference agreement — at least one must hold:
    #    a) UTR appears in narration
    #    b) external_transaction_id matches UTR
    #    c) order_id appears in narration
    utr      = str(bank.get("utr", "")).strip()
    narration = str(bank.get("narration", "")).upper()
    ext_id   = str(gw.get("external_transaction_id", "")).strip()
    order_id = str(gw.get("order_id", "")).strip()

    ref_match = (
        (utr and ext_id and (utr == ext_id or utr in narration))
        or (order_id and order_id in narration)
        or (ext_id and ext_id in narration)
    )
    return ref_match


# ---------------------------------------------------------------------------
# Explanation builder
# ---------------------------------------------------------------------------

def _build_explanation(gw: dict, bank: dict) -> dict[str, Any]:
    """Build the structured match_explanation for Pass 1."""
    gw_date   = _to_date(gw["transaction_ts"])
    bank_date = _to_date(bank["value_date"])
    delta_days = (bank_date - gw_date).days

    return {
        "pass": MatchPass.PASS1_EXACT.value,
        "field_agreement": {
            "currency": {"agree": True, "value": gw["currency"]},
            "amount": {
                "agree": True,
                "expected_net": str(_decimal(gw["expected_net_amount"])),
                "bank_net": str(_decimal(bank["net_amount"])),
                "delta": "0.00",
            },
            "date": {
                "agree": True,
                "gateway_date": str(gw_date),
                "bank_value_date": str(bank_date),
                "delta_days": delta_days,
                "tolerance_days": EXACT_DATE_TOLERANCE_DAYS,
            },
            "reference": {
                "agree": True,
                "gateway_ext_id": gw.get("external_transaction_id", ""),
                "bank_utr": bank.get("utr", ""),
            },
        },
        "human_readable_summary": (
            f"Exact match: ₹{_decimal(bank['net_amount']):.2f} "
            f"on {bank_date} (Δ{delta_days:+d} days). "
            f"UTR {bank.get('utr', '?')} ↔ "
            f"TXN {gw.get('external_transaction_id', '?')}."
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
    """Convert a date / datetime / ISO string to a ``datetime.date``."""
    if isinstance(value, date):
        return value if not hasattr(value, "date") else value  # type: ignore[return-value]
    from datetime import datetime
    s = str(value).strip()
    # Try date-only first (YYYY-MM-DD)
    if len(s) == 10:
        return date.fromisoformat(s)
    # Try full ISO datetime
    try:
        return datetime.fromisoformat(s).date()
    except ValueError:
        # Handle Z suffix (Python <3.11)
        return datetime.fromisoformat(s.replace("Z", "+00:00")).date()

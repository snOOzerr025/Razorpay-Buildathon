"""
Pass 5 — Exception queue routing.

Everything that survives Passes 1–4 unmatched is classified and inserted
into the ``exceptions`` table.  This pass does NOT produce ``MatchCandidate``
objects — it produces ``UnmatchedRecord`` objects with a suggested category.

Classification heuristics
--------------------------
The spec (docs/04 §1) defines four categories:

  timing_difference  — Record exists on both sides but outside all tolerance
                       windows.  Most common: settlement arrived too late or
                       too early.  Signal: gateway record has a counterpart
                       bank record close in amount but outside the date window.

  transaction_error  — Data integrity problem: missing external_id, duplicate
                       ID, refund without a parent, over-refund detected, or
                       a captured transaction with no ledger entry and no bank
                       counterpart within any reasonable window.

  bank_initiated     — Bank record with no plausible gateway counterpart at
                       all (fee debit, service charge, adjustment credit that
                       the gateway never logged as a transaction).

  unresolved         — Everything else.  No signal is strong enough to
                       classify more specifically.  Goes to HITL review.

Implementation note
-------------------
This pass operates in two sweeps:

  Sweep 1 (gateway residuals): classify each unmatched canonical_transaction.
  Sweep 2 (bank residuals):    classify each unmatched bank_settlement.

Ledger residuals are noted in the stats but treated as low-priority — a
missing ledger entry is most likely a data ingestion lag, not a financial
discrepancy, and is handled by a separate reconciliation job (out of scope
for the engine core).

Non-negotiable rule compliance
-------------------------------
* No LLM calls.  Classification is purely heuristic / rule-based (AGENTS.md §1).
* The ``dollar_value`` field on every exception is set to the record's amount
  so the dashboard can sort by financial impact (₹ at risk).
* Every exception inserted also triggers an audit_log write in engine.py.
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from src.matching.types import (
    ExceptionCategory,
    PassResult,
    MatchPass,
    RecordType,
    UnmatchedRecord,
)

logger = logging.getLogger(__name__)

# Heuristic: if a gateway record has a bank record within this amount band
# (but outside the date window), classify as timing_difference.
TIMING_AMOUNT_BAND: Decimal  = Decimal("1.00")

# Date lookahead for timing heuristic (beyond the Pass 2 window)
TIMING_LOOKAHEAD_DAYS: int   = 14


def run_pass5(
    gateway_records: list[dict[str, Any]],
    bank_records: list[dict[str, Any]],
    ledger_records: list[dict[str, Any]],
    unmatched_gateway_ids: set[int],
    unmatched_bank_ids: set[int],
    unmatched_ledger_ids: set[int],
) -> PassResult:
    """
    Execute Pass 5: classify residuals and populate the exception queue.

    Returns a PassResult where ``candidates`` is always empty (Pass 5 does
    not produce matches) and the unmatched sets reflect any records cleared
    by classification. The ``stats`` dict contains the exception breakdown
    by category for the dashboard reporting template.
    """
    result = PassResult(
        pass_name=MatchPass.PASS4_SPLIT,   # placeholder — engine sets correctly
        unmatched_gateway_ids=set(unmatched_gateway_ids),
        unmatched_bank_ids=set(unmatched_bank_ids),
        unmatched_ledger_ids=set(unmatched_ledger_ids),
    )
    # Correct the pass name for this output
    result.pass_name = MatchPass.PASS1_EXACT   # will be overridden by engine

    exceptions: list[UnmatchedRecord] = []

    # Index all bank records for heuristic lookups
    all_bank: dict[int, dict] = {b["id"]: b for b in bank_records}

    # ---------- Sweep 1: unmatched gateway records ---------------------------
    for gw in gateway_records:
        if gw["id"] not in unmatched_gateway_ids:
            continue

        category = _classify_gateway(gw, all_bank, unmatched_bank_ids)
        dollar_value = _decimal(gw.get("expected_net_amount") or gw.get("gross_amount", "0"))

        exceptions.append(UnmatchedRecord(
            record_type=RecordType.CANONICAL_TRANSACTION,
            record_id=gw["id"],
            dollar_value=dollar_value,
            suggested_category=category,
        ))
        logger.debug(
            "Pass5 exception(gateway): gw=%s category=%s amount=%.2f",
            gw["id"], category.value, dollar_value,
        )

    # ---------- Sweep 2: unmatched bank records ------------------------------
    for bank in bank_records:
        if bank["id"] not in unmatched_bank_ids:
            continue

        category = _classify_bank(bank, gateway_records, unmatched_gateway_ids)
        dollar_value = abs(_decimal(bank["net_amount"]))

        exceptions.append(UnmatchedRecord(
            record_type=RecordType.BANK_SETTLEMENT,
            record_id=bank["id"],
            dollar_value=dollar_value,
            suggested_category=category,
        ))
        logger.debug(
            "Pass5 exception(bank): bank=%s category=%s amount=%.2f",
            bank["id"], category.value, dollar_value,
        )

    # ---------- Sweep 3: unmatched ledger (low-priority) --------------------
    for led in ledger_records:
        if led["id"] not in unmatched_ledger_ids:
            continue
        exceptions.append(UnmatchedRecord(
            record_type=RecordType.MERCHANT_LEDGER,
            record_id=led["id"],
            dollar_value=abs(_decimal(led["expected_amount"])),
            suggested_category=ExceptionCategory.UNRESOLVED,
        ))

    # ---------- Stats for dashboard ------------------------------------------
    cat_counts: dict[str, int] = {c.value: 0 for c in ExceptionCategory}
    for exc in exceptions:
        cat_counts[exc.suggested_category.value] += 1

    total_value = sum(e.dollar_value for e in exceptions)

    result.stats = {
        "exception_count":     len(exceptions),
        "by_category":         cat_counts,
        "total_value_at_risk": str(total_value),
        "gateway_exceptions":  sum(1 for e in exceptions if e.record_type == RecordType.CANONICAL_TRANSACTION),
        "bank_exceptions":     sum(1 for e in exceptions if e.record_type == RecordType.BANK_SETTLEMENT),
        "ledger_exceptions":   sum(1 for e in exceptions if e.record_type == RecordType.MERCHANT_LEDGER),
    }
    # Attach exceptions to result for engine to persist
    result._exceptions = exceptions  # type: ignore[attr-defined]

    logger.info(
        "Pass 5 complete: %d exceptions | by_category=%s | total_value=₹%s",
        len(exceptions), cat_counts, total_value,
    )
    return result


# ---------------------------------------------------------------------------
# Classification heuristics
# ---------------------------------------------------------------------------

def _classify_gateway(
    gw: dict,
    all_bank: dict[int, dict],
    unmatched_bank_ids: set[int],
) -> ExceptionCategory:
    """Classify an unmatched gateway record into an exception category."""
    status = gw.get("status", "")

    # Refund/chargeback with no parent → data error
    if status in ("refunded", "chargeback") and not gw.get("parent_transaction_id"):
        return ExceptionCategory.TRANSACTION_ERROR

    # Missing external ID → data error
    if not gw.get("external_transaction_id", "").strip():
        return ExceptionCategory.TRANSACTION_ERROR

    gw_net  = _decimal(gw.get("expected_net_amount") or "0")
    gw_date = _to_date(gw["transaction_ts"])
    currency = gw["currency"]

    # Look for a bank record close in amount but outside date window → timing
    for bid in unmatched_bank_ids:
        bank = all_bank.get(bid)
        if not bank:
            continue
        if bank["currency"] != currency:
            continue
        bank_net  = _decimal(bank["net_amount"])
        if abs(bank_net - gw_net) > TIMING_AMOUNT_BAND:
            continue
        bank_date = _to_date(bank["value_date"])
        lag = (bank_date - gw_date).days
        # Beyond the Pass 2 window (>3 days) but within the lookahead → timing
        if 3 < lag <= TIMING_LOOKAHEAD_DAYS + 3:
            return ExceptionCategory.TIMING_DIFFERENCE

    return ExceptionCategory.UNRESOLVED


def _classify_bank(
    bank: dict,
    gateway_records: list[dict],
    unmatched_gateway_ids: set[int],
) -> ExceptionCategory:
    """Classify an unmatched bank record into an exception category."""
    bank_net  = _decimal(bank["net_amount"])
    bank_date = _to_date(bank["value_date"])
    currency  = bank["currency"]

    # Negative bank entry with no gateway match → bank-initiated (fee/reversal)
    if bank_net < Decimal("0"):
        return ExceptionCategory.BANK_INITIATED

    # Look for a gateway record close in amount but outside date window → timing
    for gw in gateway_records:
        if gw["id"] not in unmatched_gateway_ids:
            continue
        if gw["currency"] != currency:
            continue
        gw_net = _decimal(gw.get("expected_net_amount") or "0")
        if abs(bank_net - gw_net) > TIMING_AMOUNT_BAND:
            continue
        gw_date = _to_date(gw["transaction_ts"])
        lag = (bank_date - gw_date).days
        if 3 < lag <= TIMING_LOOKAHEAD_DAYS + 3:
            return ExceptionCategory.TIMING_DIFFERENCE

    # No gateway counterpart at all → bank-initiated
    return ExceptionCategory.BANK_INITIATED


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def _decimal(value: object) -> Decimal:
    if isinstance(value, Decimal):
        return value
    if not value:
        return Decimal("0")
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

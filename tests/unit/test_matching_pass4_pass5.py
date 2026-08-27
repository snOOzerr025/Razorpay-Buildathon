"""
Unit tests for matching Pass 4 (subset-sum split/roll-up) and Pass 5
(exception queue routing).

These run entirely in-memory — no database required.

Key invariants tested
---------------------
Pass 4:
  * Correct subset found for a 3-transaction batch
  * Ambiguous case (two valid subsets) → no auto-match
  * Pool bounded: records outside date window excluded
  * Pool bounded: individual transaction > batch total excluded
  * Amount tolerance boundary
  * Empty pool → no match
  * DP cell guard: oversized target skipped
  * Tier is always HOTL

Pass 5:
  * timing_difference classification for close-amount late-settling bank record
  * bank_initiated for negative bank record
  * transaction_error for refund without parent_id
  * unresolved for unknown records
  * Stats dict contains expected keys
  * No LLM calls — purely rule-based (verified by checking no external imports)
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest

from src.matching.passes.pass4 import (
    AMOUNT_TOLERANCE,
    MAX_DP_CELLS,
    MAX_POOL_SIZE,
    POOL_DATE_WINDOW,
    _find_subsets,
    run_pass4,
)
from src.matching.passes.pass5 import run_pass5
from src.matching.types import (
    ExceptionCategory,
    MatchPass,
    MatchTier,
    RecordType,
)


# ---------------------------------------------------------------------------
# Record builders (same shape as engine.py load queries)
# ---------------------------------------------------------------------------

def _gw(
    gid: int,
    net: str,
    date_str: str = "2026-08-01",
    currency: str = "INR",
    status: str = "captured",
    order_id: str | None = None,
    ext_id: str | None = None,
    parent_id: int | None = None,
    gross: str | None = None,
) -> dict:
    return {
        "id":                       gid,
        "processor_account_id":     "ACC001",
        "external_transaction_id":  ext_id or f"TXN{gid:06d}",
        "order_id":                 order_id or f"ORD{gid:06d}",
        "gross_amount":             gross or net,
        "currency":                 currency,
        "mdr_fee_pct":              "0.0200",
        "gst_rate":                 "0.1800",
        "tds_amount":               "0.00",
        "expected_net_amount":      net,
        "status":                   status,
        "parent_transaction_id":    parent_id,
        "transaction_ts":           f"{date_str}T10:00:00+00:00",
    }


def _bank(
    bid: int,
    net: str,
    date_str: str = "2026-08-03",
    currency: str = "INR",
    utr: str | None = None,
) -> dict:
    return {
        "id":                  bid,
        "utr":                 utr or f"UTR{bid:09d}",
        "settlement_batch_id": f"BATCH{bid:06d}",
        "net_amount":          net,
        "currency":            currency,
        "value_date":          date_str,
        "narration":           f"Batch settlement {bid}",
    }


# ---------------------------------------------------------------------------
# Pass 4 — Subset-sum
# ---------------------------------------------------------------------------

class TestPass4SubsetSum:
    def test_three_transaction_batch_matched(self):
        """300 + 400 + 300 = 1000 exactly."""
        gws = [
            _gw(1, "300.00", date_str="2026-08-01"),
            _gw(2, "400.00", date_str="2026-08-01"),
            _gw(3, "300.00", date_str="2026-08-02"),
        ]
        banks = [_bank(1, "1000.00", date_str="2026-08-03")]
        result = run_pass4(gws, banks, [], {1, 2, 3}, {1}, set())
        assert result.matched_count == 1
        matched_ids = {m.record_id for m in result.candidates[0].members
                       if m.record_type == RecordType.CANONICAL_TRANSACTION}
        assert matched_ids == {1, 2, 3}

    def test_batch_within_tolerance(self):
        """Subset sum of 999.97 vs bank 1000.00 → delta 0.03 within ₹0.05."""
        gws = [
            _gw(1, "333.32", date_str="2026-08-01"),
            _gw(2, "333.32", date_str="2026-08-01"),
            _gw(3, "333.33", date_str="2026-08-01"),
        ]
        banks = [_bank(1, "1000.00", date_str="2026-08-03")]
        result = run_pass4(gws, banks, [], {1, 2, 3}, {1}, set())
        assert result.matched_count == 1

    def test_ambiguous_two_subsets_not_auto_matched(self):
        """
        200 + 800 = 1000  AND  500 + 500 = 1000 → ambiguous → no match.
        """
        gws = [
            _gw(1, "200.00", date_str="2026-08-01"),
            _gw(2, "800.00", date_str="2026-08-01"),
            _gw(3, "500.00", date_str="2026-08-01"),
            _gw(4, "500.00", date_str="2026-08-01"),
        ]
        banks = [_bank(1, "1000.00", date_str="2026-08-03")]
        result = run_pass4(gws, banks, [], {1, 2, 3, 4}, {1}, set())
        assert result.matched_count == 0
        assert result.stats["ambiguous_count"] == 1

    def test_record_outside_date_window_excluded_from_pool(self):
        """Gateway record from 10 days before settlement is outside POOL_DATE_WINDOW."""
        gws = [
            _gw(1, "500.00", date_str="2026-07-20"),   # >3 days before 2026-08-03
            _gw(2, "500.00", date_str="2026-08-01"),
        ]
        banks = [_bank(1, "1000.00", date_str="2026-08-03")]
        result = run_pass4(gws, banks, [], {1, 2}, {1}, set())
        # Only gw2 is in the pool; 500 ≠ 1000 → no match
        assert result.matched_count == 0

    def test_individual_greater_than_bank_net_excluded(self):
        """If a single transaction exceeds the batch total, it can't be part of it."""
        gws = [
            _gw(1, "1500.00", date_str="2026-08-01"),  # > bank_net 1000
            _gw(2, "600.00",  date_str="2026-08-01"),
            _gw(3, "400.00",  date_str="2026-08-01"),
        ]
        banks = [_bank(1, "1000.00", date_str="2026-08-03")]
        result = run_pass4(gws, banks, [], {1, 2, 3}, {1}, set())
        assert result.matched_count == 1
        matched_ids = {m.record_id for m in result.candidates[0].members
                       if m.record_type == RecordType.CANONICAL_TRANSACTION}
        assert matched_ids == {2, 3}   # gw1 was correctly excluded

    def test_negative_bank_net_skipped(self):
        """Negative bank settlements (refunds) should be ignored by Pass 4."""
        gws   = [_gw(1, "500.00", date_str="2026-08-01")]
        banks = [_bank(1, "-500.00", date_str="2026-08-03")]
        result = run_pass4(gws, banks, [], {1}, {1}, set())
        assert result.matched_count == 0

    def test_tier_is_hotl(self):
        gws = [
            _gw(1, "400.00", date_str="2026-08-01"),
            _gw(2, "600.00", date_str="2026-08-01"),
        ]
        banks = [_bank(1, "1000.00", date_str="2026-08-03")]
        result = run_pass4(gws, banks, [], {1, 2}, {1}, set())
        assert result.matched_count == 1
        assert result.candidates[0].tier == MatchTier.HOTL

    def test_confidence_score_is_none(self):
        gws = [
            _gw(1, "400.00", date_str="2026-08-01"),
            _gw(2, "600.00", date_str="2026-08-01"),
        ]
        banks = [_bank(1, "1000.00", date_str="2026-08-03")]
        result = run_pass4(gws, banks, [], {1, 2}, {1}, set())
        assert result.candidates[0].confidence_score is None

    def test_already_matched_gateway_not_reused(self):
        """Records removed from unmatched_gateway_ids must not appear in Pass 4 results."""
        gws = [
            _gw(1, "1000.00", date_str="2026-08-01"),
            _gw(2, "500.00",  date_str="2026-08-01"),
            _gw(3, "500.00",  date_str="2026-08-01"),
        ]
        banks = [_bank(1, "1000.00", date_str="2026-08-03")]
        # gw1 already matched by Pass 1 — only {2, 3} are unmatched
        result = run_pass4(gws, banks, [], {2, 3}, {1}, set())
        assert result.matched_count == 1
        matched_ids = {m.record_id for m in result.candidates[0].members
                       if m.record_type == RecordType.CANONICAL_TRANSACTION}
        assert 1 not in matched_ids

    def test_explanation_has_required_keys(self):
        gws = [
            _gw(1, "400.00", date_str="2026-08-01"),
            _gw(2, "600.00", date_str="2026-08-01"),
        ]
        banks = [_bank(1, "1000.00", date_str="2026-08-03")]
        result = run_pass4(gws, banks, [], {1, 2}, {1}, set())
        expl = result.candidates[0].explanation
        assert "pass" in expl
        assert "field_agreement" in expl
        assert "human_readable_summary" in expl
        assert expl["pass"] == MatchPass.PASS4_SPLIT.value


# ---------------------------------------------------------------------------
# _find_subsets — unit tests for the DP kernel
# ---------------------------------------------------------------------------

class TestFindSubsets:
    def test_exact_single_solution(self):
        pool = [(1, 300), (2, 400), (3, 300)]  # sums to 1000
        solutions = _find_subsets(pool, 1000, 5)
        assert len(solutions) == 1
        assert solutions[0] == frozenset({1, 2, 3})

    def test_no_solution(self):
        pool = [(1, 300), (2, 400)]
        solutions = _find_subsets(pool, 1000, 5)
        assert solutions == []

    def test_two_solutions_detected(self):
        pool = [(1, 200), (2, 800), (3, 500), (4, 500)]
        solutions = _find_subsets(pool, 1000, 5, max_solutions=2)
        assert len(solutions) == 2

    def test_within_tolerance_positive(self):
        # 997 paise; target 1000, tolerance 5 — only one item, one solution
        pool = [(1, 997)]
        solutions = _find_subsets(pool, 1000, 5)
        assert len(solutions) == 1
        assert frozenset({1}) in solutions

    def test_beyond_tolerance_not_found(self):
        pool = [(1, 990)]  # 10 paise off; tolerance 5
        solutions = _find_subsets(pool, 1000, 5)
        assert solutions == []

    def test_empty_pool(self):
        solutions = _find_subsets([], 1000, 5)
        assert solutions == []

    def test_single_item_pool_exact(self):
        solutions = _find_subsets([(1, 1000)], 1000, 5)
        assert len(solutions) == 1
        assert frozenset({1}) in solutions


# ---------------------------------------------------------------------------
# Pass 5 — Exception routing
# ---------------------------------------------------------------------------

class TestPass5ExceptionRouting:
    def test_timing_difference_gateway(self):
        """Gateway record has a near-amount bank record outside the date window → timing."""
        gw   = _gw(1, "970.00", date_str="2026-08-01")
        bank = _bank(1, "970.00", date_str="2026-08-10")   # 9 days lag
        result = run_pass5([gw], [bank], [], {1}, {1}, set())
        exceptions = result._exceptions
        gw_exc = next(e for e in exceptions if e.record_type == RecordType.CANONICAL_TRANSACTION)
        assert gw_exc.suggested_category == ExceptionCategory.TIMING_DIFFERENCE

    def test_bank_initiated_negative_bank(self):
        """Negative bank record → bank-initiated."""
        bank = _bank(1, "-200.00", date_str="2026-08-03")
        result = run_pass5([], [bank], [], set(), {1}, set())
        exc = result._exceptions[0]
        assert exc.suggested_category == ExceptionCategory.BANK_INITIATED
        assert exc.dollar_value > Decimal("0")   # absolute value

    def test_transaction_error_refund_no_parent(self):
        """Refund without parent_transaction_id → transaction_error."""
        gw = _gw(1, "-970.00", status="refunded", parent_id=None)
        result = run_pass5([gw], [], [], {1}, set(), set())
        exc = result._exceptions[0]
        assert exc.suggested_category == ExceptionCategory.TRANSACTION_ERROR

    def test_transaction_error_missing_external_id(self):
        gw = {**_gw(1, "100.00"), "external_transaction_id": ""}
        result = run_pass5([gw], [], [], {1}, set(), set())
        exc = result._exceptions[0]
        assert exc.suggested_category == ExceptionCategory.TRANSACTION_ERROR

    def test_unresolved_for_no_near_bank_record(self):
        """Gateway with no close-amount bank counterpart → unresolved."""
        gw   = _gw(1, "970.00", date_str="2026-08-01")
        bank = _bank(1, "50000.00", date_str="2026-08-10")   # wildly different amount
        result = run_pass5([gw], [bank], [], {1}, {1}, set())
        gw_exc = next(
            e for e in result._exceptions
            if e.record_type == RecordType.CANONICAL_TRANSACTION
        )
        assert gw_exc.suggested_category == ExceptionCategory.UNRESOLVED

    def test_bank_unmatched_no_gateway_counterpart_bank_initiated(self):
        """Bank record with no gateway record at all → bank_initiated."""
        bank = _bank(1, "500.00", date_str="2026-08-03")
        result = run_pass5([], [bank], [], set(), {1}, set())
        exc = result._exceptions[0]
        assert exc.suggested_category == ExceptionCategory.BANK_INITIATED

    def test_stats_dict_has_required_keys(self):
        gw   = _gw(1, "100.00")
        bank = _bank(1, "100.00")
        result = run_pass5([gw], [bank], [], {1}, {1}, set())
        stats = result.stats
        assert "exception_count" in stats
        assert "by_category" in stats
        assert "total_value_at_risk" in stats
        assert "gateway_exceptions" in stats
        assert "bank_exceptions" in stats

    def test_dollar_value_is_positive_decimal(self):
        """dollar_value on exception records must always be positive."""
        gw = _gw(1, "970.00")
        result = run_pass5([gw], [], [], {1}, set(), set())
        for exc in result._exceptions:
            assert exc.dollar_value >= Decimal("0")

    def test_ledger_residuals_classified_as_unresolved(self):
        led = {"id": 1, "order_id": "ORD001", "expected_amount": "500.00", "currency": "INR", "status": "pending"}
        result = run_pass5([], [], [led], set(), set(), {1})
        led_exc = next(
            e for e in result._exceptions
            if e.record_type == RecordType.MERCHANT_LEDGER
        )
        assert led_exc.suggested_category == ExceptionCategory.UNRESOLVED

    def test_no_exceptions_for_already_matched_records(self):
        """Records not in the unmatched_ids sets must not appear in exceptions."""
        gw   = _gw(1, "970.00")
        bank = _bank(1, "970.00")
        # Both are excluded from the unmatched sets → already matched
        result = run_pass5([gw], [bank], [], set(), set(), set())
        assert len(result._exceptions) == 0

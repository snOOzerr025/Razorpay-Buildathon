"""
Unit tests for matching Passes 1, 2, and 3.

All tests run entirely in memory — no database required.  Records are
constructed as plain dicts matching the shape of rows returned by the
engine's DB query (see engine.py for the exact SELECT columns).

Test design principles
----------------------
* Every test targets a specific edge case, not just the happy path.
* Boundary values are tested explicitly (e.g. exactly at AMOUNT_TOLERANCE,
  exactly at DATE_WINDOW_DAYS, one day beyond each).
* Ambiguity cases are tested for Pass 2 (two qualifying gateway records →
  neither should be auto-matched).
* Over-refund is tested for Pass 3 (refund > parent → no candidate produced).
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal

import pytest

from src.matching.passes.pass1 import EXACT_DATE_TOLERANCE_DAYS, run_pass1
from src.matching.passes.pass2 import AMOUNT_TOLERANCE, DATE_WINDOW_DAYS, run_pass2
from src.matching.passes.pass3 import REFUND_AMOUNT_TOLERANCE, run_pass3
from src.matching.types import MatchPass, MatchTier, RecordType


# ---------------------------------------------------------------------------
# Fixtures — shared record builders
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
    mdr: str = "0.0200",
    gst: str = "0.1800",
    tds: str = "0.00",
) -> dict:
    """Build a minimal canonical_transaction dict."""
    return {
        "id":                       gid,
        "processor_account_id":     "ACC001",
        "external_transaction_id":  ext_id or f"TXN{gid:06d}",
        "order_id":                 order_id or f"ORD{gid:06d}",
        "gross_amount":             gross or net,   # simplified for tests
        "currency":                 currency,
        "mdr_fee_pct":              mdr,
        "gst_rate":                 gst,
        "tds_amount":               tds,
        "expected_net_amount":      net,
        "status":                   status,
        "parent_transaction_id":    parent_id,
        "transaction_ts":           f"{date_str}T10:00:00+00:00",
    }


def _bank(
    bid: int,
    net: str,
    date_str: str = "2026-08-02",
    currency: str = "INR",
    utr: str | None = None,
    narration: str | None = None,
    batch_id: str | None = None,
) -> dict:
    """Build a minimal bank_settlement dict."""
    _utr = utr or f"UTR{bid:09d}"
    return {
        "id":                  bid,
        "utr":                 _utr,
        "settlement_batch_id": batch_id or f"BATCH{bid:06d}",
        "net_amount":          net,
        "currency":            currency,
        "value_date":          date_str,
        "narration":           narration or f"Settlement for {_utr}",
    }


def _led(lid: int, order_id: str, amount: str = "970.00") -> dict:
    return {
        "id":              lid,
        "order_id":        order_id,
        "expected_amount": amount,
        "currency":        "INR",
        "status":          "pending",
    }


# ---------------------------------------------------------------------------
# Pass 1 — Exact match
# ---------------------------------------------------------------------------

class TestPass1Exact:
    def test_happy_path_exact_match(self):
        gws   = [_gw(1, "970.00", ext_id="TXN001")]
        banks = [_bank(1, "970.00", utr="TXN001")]
        result = run_pass1(gws, banks, [], {1}, {1}, set())
        assert result.matched_count == 1
        assert 1 not in result.unmatched_gateway_ids
        assert 1 not in result.unmatched_bank_ids

    def test_amount_mismatch_not_matched(self):
        gws   = [_gw(1, "970.00")]
        banks = [_bank(1, "971.00")]
        result = run_pass1(gws, banks, [], {1}, {1}, set())
        assert result.matched_count == 0

    def test_currency_mismatch_not_matched(self):
        gws   = [_gw(1, "970.00", currency="INR")]
        banks = [_bank(1, "970.00", currency="USD")]
        result = run_pass1(gws, banks, [], {1}, {1}, set())
        assert result.matched_count == 0

    def test_date_at_boundary_plus_one_matched(self):
        """±1 day is within tolerance."""
        gws   = [_gw(1, "970.00", date_str="2026-08-01", ext_id="TXN001")]
        banks = [_bank(1, "970.00", date_str="2026-08-02", utr="TXN001")]
        result = run_pass1(gws, banks, [], {1}, {1}, set())
        assert result.matched_count == 1

    def test_date_beyond_tolerance_not_matched(self):
        """±2 days exceeds the exact-match tolerance → not matched by Pass 1."""
        gws   = [_gw(1, "970.00", date_str="2026-08-01", ext_id="TXN001")]
        banks = [_bank(1, "970.00", date_str="2026-08-03", utr="TXN001")]
        result = run_pass1(gws, banks, [], {1}, {1}, set())
        assert result.matched_count == 0

    def test_no_reference_match_not_matched(self):
        """Pass 1 requires reference agreement — no UTR/narration match → skip."""
        gws   = [_gw(1, "970.00", ext_id="TXN_AAA")]
        banks = [_bank(1, "970.00", utr="UTR_BBB", narration="No useful ref here")]
        result = run_pass1(gws, banks, [], {1}, {1}, set())
        assert result.matched_count == 0

    def test_utr_in_narration_is_reference_match(self):
        """UTR appearing in narration counts as a reference match."""
        gws   = [_gw(1, "500.00", date_str="2026-08-01", ext_id="TXNABC")]
        banks = [_bank(1, "500.00", date_str="2026-08-01", utr="UTR123456789",
                       narration="Settlement TXNABC for order")]
        result = run_pass1(gws, banks, [], {1}, {1}, set())
        assert result.matched_count == 1

    def test_tier_is_hootl(self):
        gws   = [_gw(1, "970.00", ext_id="TXN001")]
        banks = [_bank(1, "970.00", utr="TXN001")]
        result = run_pass1(gws, banks, [], {1}, {1}, set())
        assert result.candidates[0].tier == MatchTier.HOOTL

    def test_confidence_score_is_none(self):
        """Deterministic passes must never fabricate a confidence score."""
        gws   = [_gw(1, "970.00", ext_id="TXN001")]
        banks = [_bank(1, "970.00", utr="TXN001")]
        result = run_pass1(gws, banks, [], {1}, {1}, set())
        assert result.candidates[0].confidence_score is None

    def test_three_way_match_with_ledger(self):
        """When order_id links a ledger record, it should be included in members."""
        gws   = [_gw(1, "970.00", ext_id="TXN001", order_id="ORD001")]
        banks = [_bank(1, "970.00", utr="TXN001")]
        leds  = [_led(1, "ORD001")]
        result = run_pass1(gws, banks, leds, {1}, {1}, {1})
        assert result.matched_count == 1
        member_types = {m.record_type for m in result.candidates[0].members}
        assert RecordType.MERCHANT_LEDGER in member_types

    def test_already_matched_records_not_reused(self):
        """Records removed from unmatched_ids must not appear in further matches."""
        gws   = [_gw(1, "970.00", ext_id="TXN001"), _gw(2, "970.00", ext_id="TXN001")]
        banks = [_bank(1, "970.00", utr="TXN001")]
        result = run_pass1(gws, banks, [], {1, 2}, {1}, set())
        # Only one match possible — second gateway record not reused
        assert result.matched_count == 1

    def test_explanation_structure(self):
        """Explanation must have required keys per docs/03 §6."""
        gws   = [_gw(1, "970.00", ext_id="TXN001")]
        banks = [_bank(1, "970.00", utr="TXN001")]
        result = run_pass1(gws, banks, [], {1}, {1}, set())
        expl = result.candidates[0].explanation
        assert "pass" in expl
        assert "field_agreement" in expl
        assert "human_readable_summary" in expl
        assert expl["pass"] == MatchPass.PASS1_EXACT.value


# ---------------------------------------------------------------------------
# Pass 2 — Tolerance-aware
# ---------------------------------------------------------------------------

class TestPass2Tolerance:
    def test_settlement_lag_within_window(self):
        """T+2 days, no amount delta — should match."""
        gws   = [_gw(1, "970.00", date_str="2026-08-01")]
        banks = [_bank(1, "970.00", date_str="2026-08-03")]
        result = run_pass2(gws, banks, [], {1}, {1}, set())
        assert result.matched_count == 1

    def test_settlement_lag_exactly_at_window_boundary(self):
        """T+3 is the last valid lag day."""
        gws   = [_gw(1, "970.00", date_str="2026-08-01")]
        banks = [_bank(1, "970.00", date_str=f"2026-08-{1 + DATE_WINDOW_DAYS:02d}")]
        result = run_pass2(gws, banks, [], {1}, {1}, set())
        assert result.matched_count == 1

    def test_settlement_lag_beyond_window_not_matched(self):
        """T+4 is beyond the window."""
        gws   = [_gw(1, "970.00", date_str="2026-08-01")]
        banks = [_bank(1, "970.00", date_str=f"2026-08-{1 + DATE_WINDOW_DAYS + 1:02d}")]
        result = run_pass2(gws, banks, [], {1}, {1}, set())
        assert result.matched_count == 0

    def test_amount_at_tolerance_boundary(self):
        """Exactly at AMOUNT_TOLERANCE should match."""
        gws   = [_gw(1, "970.00", date_str="2026-08-01")]
        bank_net = Decimal("970.00") + AMOUNT_TOLERANCE
        banks = [_bank(1, str(bank_net), date_str="2026-08-02")]
        result = run_pass2(gws, banks, [], {1}, {1}, set())
        assert result.matched_count == 1

    def test_amount_beyond_tolerance_not_matched(self):
        """Beyond AMOUNT_TOLERANCE must not match."""
        gws   = [_gw(1, "970.00", date_str="2026-08-01")]
        bank_net = Decimal("970.00") + AMOUNT_TOLERANCE + Decimal("0.01")
        banks = [_bank(1, str(bank_net), date_str="2026-08-02")]
        result = run_pass2(gws, banks, [], {1}, {1}, set())
        assert result.matched_count == 0

    def test_backward_settlement_not_matched(self):
        """Bank value_date before gateway date is not a valid settlement lag."""
        gws   = [_gw(1, "970.00", date_str="2026-08-05")]
        banks = [_bank(1, "970.00", date_str="2026-08-03")]
        result = run_pass2(gws, banks, [], {1}, {1}, set())
        assert result.matched_count == 0

    def test_ambiguous_two_qualifying_records_not_auto_matched(self):
        """Two gateway records satisfy the same bank settlement → neither matched."""
        gws = [
            _gw(1, "970.00", date_str="2026-08-01"),
            _gw(2, "970.00", date_str="2026-08-01"),
        ]
        banks = [_bank(1, "970.00", date_str="2026-08-02")]
        result = run_pass2(gws, banks, [], {1, 2}, {1}, set())
        assert result.matched_count == 0
        assert result.stats["ambiguous_count"] == 1

    def test_tier_is_hootl(self):
        gws   = [_gw(1, "970.00", date_str="2026-08-01")]
        banks = [_bank(1, "970.20", date_str="2026-08-02")]
        result = run_pass2(gws, banks, [], {1}, {1}, set())
        assert result.candidates[0].tier == MatchTier.HOOTL

    def test_confidence_score_is_none(self):
        gws   = [_gw(1, "970.00", date_str="2026-08-01")]
        banks = [_bank(1, "970.20", date_str="2026-08-02")]
        result = run_pass2(gws, banks, [], {1}, {1}, set())
        assert result.candidates[0].confidence_score is None


# ---------------------------------------------------------------------------
# Pass 3 — Refund / Reversal
# ---------------------------------------------------------------------------

class TestPass3Refund:
    def test_refund_linked_to_parent(self):
        parent = _gw(1, "970.00", status="captured", gross="1000.00")
        refund = _gw(2, "-970.00", status="refunded", gross="1000.00", parent_id=1)
        bank   = _bank(1, "-970.00", date_str="2026-08-10")
        result = run_pass3(
            [parent, refund], [bank], [],
            unmatched_gateway_ids={1, 2},
            unmatched_bank_ids={1},
            unmatched_ledger_ids=set(),
        )
        assert result.matched_count == 1
        member_ids = {(m.record_type, m.record_id) for m in result.candidates[0].members}
        assert (RecordType.CANONICAL_TRANSACTION, 1) in member_ids  # parent
        assert (RecordType.CANONICAL_TRANSACTION, 2) in member_ids  # refund

    def test_over_refund_not_auto_matched(self):
        """Refund gross > parent gross → must not produce a match candidate."""
        parent = _gw(1, "500.00", status="captured", gross="500.00")
        refund = _gw(2, "-600.00", status="refunded", gross="600.00", parent_id=1)
        result = run_pass3(
            [parent, refund], [], [],
            unmatched_gateway_ids={1, 2},
            unmatched_bank_ids=set(),
            unmatched_ledger_ids=set(),
        )
        assert result.matched_count == 0

    def test_refund_without_parent_id_no_candidate(self):
        """No parent_transaction_id → orphaned refund, no guess, no candidate."""
        refund = _gw(1, "-970.00", status="refunded", parent_id=None)
        result = run_pass3(
            [refund], [], [],
            unmatched_gateway_ids={1},
            unmatched_bank_ids=set(),
            unmatched_ledger_ids=set(),
        )
        assert result.matched_count == 0

    def test_refund_without_bank_match_still_produces_candidate(self):
        """A refund matched to its parent but with no bank credit yet is still a valid candidate
        — the bank credit may arrive in a later batch."""
        parent = _gw(1, "970.00", status="captured", gross="1000.00")
        refund = _gw(2, "-970.00", status="refunded", gross="1000.00", parent_id=1)
        result = run_pass3(
            [parent, refund], [], [],
            unmatched_gateway_ids={1, 2},
            unmatched_bank_ids=set(),
            unmatched_ledger_ids=set(),
        )
        assert result.matched_count == 1
        member_types = {m.record_type for m in result.candidates[0].members}
        assert RecordType.BANK_SETTLEMENT not in member_types

    def test_chargeback_also_matched(self):
        parent = _gw(1, "970.00", status="captured", gross="1000.00")
        chargeback = _gw(2, "-970.00", status="chargeback", gross="1000.00", parent_id=1)
        result = run_pass3(
            [parent, chargeback], [], [],
            unmatched_gateway_ids={1, 2},
            unmatched_bank_ids=set(),
            unmatched_ledger_ids=set(),
        )
        assert result.matched_count == 1

    def test_tier_is_hotl(self):
        """Refund/reversal matches are HOTL, not HOOTL."""
        parent = _gw(1, "970.00", status="captured", gross="1000.00")
        refund = _gw(2, "-970.00", status="refunded", gross="1000.00", parent_id=1)
        result = run_pass3(
            [parent, refund], [], [],
            unmatched_gateway_ids={1, 2},
            unmatched_bank_ids=set(),
            unmatched_ledger_ids=set(),
        )
        assert result.candidates[0].tier == MatchTier.HOTL

    def test_confidence_score_is_none(self):
        parent = _gw(1, "970.00", status="captured", gross="1000.00")
        refund = _gw(2, "-970.00", status="refunded", gross="1000.00", parent_id=1)
        result = run_pass3(
            [parent, refund], [], [],
            unmatched_gateway_ids={1, 2},
            unmatched_bank_ids=set(),
            unmatched_ledger_ids=set(),
        )
        assert result.candidates[0].confidence_score is None

    def test_pass_name_correct(self):
        parent = _gw(1, "970.00", status="captured", gross="1000.00")
        refund = _gw(2, "-970.00", status="refunded", gross="1000.00", parent_id=1)
        result = run_pass3(
            [parent, refund], [], [],
            unmatched_gateway_ids={1, 2},
            unmatched_bank_ids=set(),
            unmatched_ledger_ids=set(),
        )
        assert result.candidates[0].matched_pass == MatchPass.PASS3_REFUND


# ---------------------------------------------------------------------------
# Cross-pass: chaining correctness
# ---------------------------------------------------------------------------

class TestPassChaining:
    def test_pass2_does_not_reattempt_pass1_matches(self):
        """Records matched by Pass 1 (removed from unmatched sets) must not appear in Pass 2."""
        gws   = [_gw(1, "970.00", date_str="2026-08-01", ext_id="TXN001")]
        banks = [_bank(1, "970.00", date_str="2026-08-01", utr="TXN001")]

        r1 = run_pass1(gws, banks, [], {1}, {1}, set())
        assert r1.matched_count == 1

        # Pass 2 receives the updated unmatched sets
        r2 = run_pass2(
            gws, banks, [],
            r1.unmatched_gateway_ids,
            r1.unmatched_bank_ids,
            set(),
        )
        assert r2.matched_count == 0   # nothing left for Pass 2

    def test_zero_amount_transaction_handled(self):
        """Zero-amount transactions (edge case) should not crash."""
        gws   = [_gw(1, "0.00", date_str="2026-08-01", ext_id="TXN001")]
        banks = [_bank(1, "0.00", date_str="2026-08-01", utr="TXN001")]
        result = run_pass1(gws, banks, [], {1}, {1}, set())
        # 0-amount match is technically valid if all criteria agree
        assert result.matched_count == 1

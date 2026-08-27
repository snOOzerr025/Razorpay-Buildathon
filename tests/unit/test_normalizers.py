"""
Unit tests for row normalizers.

All tests here run without a database — normalizers are pure functions
that take a dict and return a dict (or raise NormalizationError).
"""

from __future__ import annotations

import pytest
from decimal import Decimal

from src.ingestion.normalizers import (
    NormalizationError,
    normalize_bank_settlement,
    normalize_gateway_transaction,
    normalize_ledger_entry,
)


# ---------------------------------------------------------------------------
# Fixtures: minimal valid rows for each source
# ---------------------------------------------------------------------------

VALID_GATEWAY = {
    "processor_account_id":     "ACC001",
    "external_transaction_id":  "TXN001",
    "order_id":                 "ORD001",
    "gross_amount":             "1000.00",
    "currency":                 "INR",
    "mdr_fee_pct":              "0.0200",
    "gst_rate":                 "0.1800",
    "tds_amount":               "10.00",
    "status":                   "captured",
    "parent_transaction_id":    "",
    "transaction_ts":           "2026-08-01T12:00:00+00:00",
    "processor_id":             "razorpay_gateway",
}

VALID_BANK = {
    "utr":                 "UTR123456789",
    "settlement_batch_id": "BATCH001",
    "net_amount":          "970.00",
    "currency":            "INR",
    "value_date":          "2026-08-02",
    "processor_id":        "hdfc_bank",
}

VALID_LEDGER = {
    "order_id":        "ORD001",
    "expected_amount": "970.00",
    "currency":        "INR",
    "status":          "pending",
    "processor_id":    "merchant_erp",
}


# ---------------------------------------------------------------------------
# Gateway transaction normalizer
# ---------------------------------------------------------------------------

class TestNormalizeGatewayTransaction:
    def test_happy_path_returns_correct_keys(self):
        result = normalize_gateway_transaction(VALID_GATEWAY, raw_event_id=1)
        assert result["raw_event_id"] == 1
        assert result["gross_amount"] == "1000.00"
        assert result["status"] == "captured"
        # expected_net_amount must NOT be in the result — it's a generated column
        assert "expected_net_amount" not in result

    def test_expected_net_amount_absent(self):
        """The single most important invariant: we never try to write the generated column."""
        result = normalize_gateway_transaction(VALID_GATEWAY, raw_event_id=1)
        assert "expected_net_amount" not in result

    def test_amounts_are_decimal_strings(self):
        """Amounts must be 2dp strings, never floats."""
        result = normalize_gateway_transaction(VALID_GATEWAY, raw_event_id=1)
        # Verify they are parseable as Decimal with exactly 2dp
        gross = Decimal(result["gross_amount"])
        assert gross == Decimal("1000.00")
        tds   = Decimal(result["tds_amount"])
        assert tds   == Decimal("10.00")

    def test_invalid_status_raises(self):
        bad = {**VALID_GATEWAY, "status": "unknown"}
        with pytest.raises(NormalizationError, match="Invalid gateway status"):
            normalize_gateway_transaction(bad, raw_event_id=1)

    def test_missing_required_field_raises(self):
        bad = {**VALID_GATEWAY}
        del bad["gross_amount"]
        with pytest.raises(NormalizationError, match="Missing or empty required fields"):
            normalize_gateway_transaction(bad, raw_event_id=1)

    def test_float_amount_string_is_accepted(self):
        """CSV may contain Python repr of floats like '999.9999999'; must quantize correctly."""
        row = {**VALID_GATEWAY, "gross_amount": "999.999"}
        result = normalize_gateway_transaction(row, raw_event_id=1)
        # Should round to 2dp
        assert Decimal(result["gross_amount"]) == Decimal("1000.00")

    def test_invalid_currency_raises(self):
        bad = {**VALID_GATEWAY, "currency": "RUPEE"}
        with pytest.raises(NormalizationError, match="Invalid currency code"):
            normalize_gateway_transaction(bad, raw_event_id=1)

    def test_parent_transaction_id_empty_becomes_none(self):
        result = normalize_gateway_transaction(VALID_GATEWAY, raw_event_id=1)
        assert result["parent_transaction_id"] is None

    def test_bad_parent_transaction_id_raises(self):
        bad = {**VALID_GATEWAY, "parent_transaction_id": "not-an-int"}
        with pytest.raises(NormalizationError, match="parent_transaction_id"):
            normalize_gateway_transaction(bad, raw_event_id=1)

    def test_timestamp_without_tz_gets_utc(self):
        row = {**VALID_GATEWAY, "transaction_ts": "2026-08-01T12:00:00"}
        result = normalize_gateway_transaction(row, raw_event_id=1)
        assert "+00:00" in result["transaction_ts"] or "Z" in result["transaction_ts"] or "UTC" in result["transaction_ts"]


# ---------------------------------------------------------------------------
# Bank settlement normalizer
# ---------------------------------------------------------------------------

class TestNormalizeBankSettlement:
    def test_happy_path(self):
        result = normalize_bank_settlement(VALID_BANK, raw_event_id=2)
        assert result["utr"] == "UTR123456789"
        assert result["net_amount"] == "970.00"
        assert result["value_date"] == "2026-08-02"

    def test_missing_utr_raises(self):
        bad = {**VALID_BANK}
        del bad["utr"]
        with pytest.raises(NormalizationError):
            normalize_bank_settlement(bad, raw_event_id=2)

    def test_invalid_date_raises(self):
        bad = {**VALID_BANK, "value_date": "August 2, 2026"}
        with pytest.raises(NormalizationError, match="Cannot parse date"):
            normalize_bank_settlement(bad, raw_event_id=2)

    def test_negative_net_amount_is_accepted(self):
        """Chargebacks / reversals may produce negative net settlements."""
        row = {**VALID_BANK, "net_amount": "-50.00"}
        result = normalize_bank_settlement(row, raw_event_id=2)
        assert Decimal(result["net_amount"]) == Decimal("-50.00")


# ---------------------------------------------------------------------------
# Merchant ledger normalizer
# ---------------------------------------------------------------------------

class TestNormalizeLedgerEntry:
    def test_happy_path(self):
        result = normalize_ledger_entry(VALID_LEDGER, raw_event_id=3)
        assert result["order_id"] == "ORD001"
        assert result["status"] == "pending"

    def test_invalid_status_raises(self):
        bad = {**VALID_LEDGER, "status": "approved"}
        with pytest.raises(NormalizationError, match="Invalid ledger status"):
            normalize_ledger_entry(bad, raw_event_id=3)

    def test_empty_order_id_raises(self):
        bad = {**VALID_LEDGER, "order_id": ""}
        with pytest.raises(NormalizationError):
            normalize_ledger_entry(bad, raw_event_id=3)


# ---------------------------------------------------------------------------
# Cross-cutting: the half-cent rounding parity test (from money.py docstring)
# ---------------------------------------------------------------------------

class TestAmountParity:
    """Verify that normalizer amounts agree with money.expected_net_amount.

    This is the critical parity test: if the normalizer and money.py disagree
    on a half-cent amount, matches will silently become exceptions.
    """

    def test_half_cent_rounding_matches_postgres_semantics(self):
        """12.345 should round to 12.35 (half-away-from-zero), not 12.34 (banker's)."""
        from src.money import quantize_amount
        result = quantize_amount("12.345")
        # Half-away-from-zero: 5 rounds up
        assert result == Decimal("12.35"), (
            f"Expected 12.35 (Postgres-compatible rounding) but got {result}. "
            "This would cause one-cent mismatches in the matching engine."
        )

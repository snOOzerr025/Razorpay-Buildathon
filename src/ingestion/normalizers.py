"""
Row normalizers: raw CSV/JSON row → canonical DB row.

Each normalizer takes the raw dict from a CSV row (all strings) and a
``raw_event_id`` from the just-inserted ``raw_events`` row, and returns
a dict ready to INSERT into the corresponding canonical table.

Rules enforced here
-------------------
1. All amounts are parsed through ``money.to_decimal()`` then quantized — no
   floats ever persist (AGENTS.md rule 1).
2. ``expected_net_amount`` is NOT set here — it is a ``GENERATED ALWAYS AS``
   column. Postgres computes it on INSERT. Attempting to write it raises a
   ProgrammingError; that error is intentional and is a hard guardrail.
3. Status values are validated against the CHECK constraints defined in the
   schema migration, so bad data raises a ValueError here rather than a
   cryptic DB error later.
4. External text (description, narration) is sanitized before any field that
   might touch an LLM prompt (AGENTS.md rule 4). Sanitization is a
   responsibility of the AI layer (src/matching/sanitize.py), not this module.
   Here we only parse and type-coerce.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any

from src.money import to_decimal, quantize_amount, quantize_rate

# ---------------------------------------------------------------------------
# Valid status sets — mirror the CHECK constraints in 001_initial_schema.py
# ---------------------------------------------------------------------------
_GATEWAY_STATUSES   = frozenset({"captured", "refunded", "chargeback", "failed"})
_LEDGER_STATUSES    = frozenset({"pending", "settled", "disputed", "cancelled"})

# Processor IDs we recognize — extend as new sources are on-boarded
_KNOWN_PROCESSORS = frozenset({
    "razorpay_gateway",
    "hdfc_bank",
    "icici_bank",
    "merchant_erp",
})


class NormalizationError(ValueError):
    """Raised when a row cannot be safely normalized.

    The ingestion pipeline catches this and routes the raw event to a
    quarantine table rather than crashing the whole batch.
    """


def normalize_gateway_transaction(
    raw: dict[str, str],
    raw_event_id: int,
) -> dict[str, Any]:
    """Normalize one gateway CSV row into a canonical_transactions INSERT dict.

    Parameters
    ----------
    raw:
        Dict of {column_name: string_value} from the CSV row.
    raw_event_id:
        The id of the already-inserted raw_events row.

    Returns
    -------
    A dict suitable for passing to::

        conn.execute(text("INSERT INTO canonical_transactions ..."), result)

    Note: ``expected_net_amount`` is NOT in the returned dict.
    """
    _require_fields(raw, [
        "external_transaction_id",
        "order_id",
        "gross_amount",
        "currency",
        "mdr_fee_pct",
        "gst_rate",
        "tds_amount",
        "status",
        "transaction_ts",
        "processor_account_id",
    ])

    status = raw.get("status", "").strip().lower()
    if status not in _GATEWAY_STATUSES:
        raise NormalizationError(
            f"Invalid gateway status {status!r}. "
            f"Expected one of {sorted(_GATEWAY_STATUSES)}"
        )

    gross       = _parse_amount(raw["gross_amount"],  "gross_amount")
    mdr_fee_pct = _parse_rate(raw["mdr_fee_pct"],    "mdr_fee_pct")
    gst_rate    = _parse_rate(raw["gst_rate"],         "gst_rate")
    tds_amount  = _parse_amount(raw["tds_amount"],    "tds_amount")

    parent_id = raw.get("parent_transaction_id", "").strip()
    if parent_id == "":
        parent_id = None
    else:
        try:
            parent_id = int(parent_id)
        except ValueError:
            raise NormalizationError(
                f"parent_transaction_id must be an integer DB id, got {parent_id!r}"
            )

    return {
        "raw_event_id":             raw_event_id,
        "processor_account_id":     raw["processor_account_id"].strip(),
        "external_transaction_id":  raw["external_transaction_id"].strip(),
        "order_id":                 raw.get("order_id", "").strip() or None,
        "gross_amount":             str(gross),
        "currency":                 _parse_currency(raw["currency"]),
        "mdr_fee_pct":              str(mdr_fee_pct),
        "gst_rate":                 str(gst_rate),
        "tds_amount":               str(tds_amount),
        # expected_net_amount intentionally absent — GENERATED ALWAYS AS STORED
        "status":                   status,
        "parent_transaction_id":    parent_id,
        "transaction_ts":           _parse_timestamp(raw["transaction_ts"]),
    }


def normalize_bank_settlement(
    raw: dict[str, str],
    raw_event_id: int,
) -> dict[str, Any]:
    """Normalize one bank settlement CSV row into a bank_settlements INSERT dict."""
    _require_fields(raw, ["utr", "settlement_batch_id", "net_amount", "currency", "value_date"])

    net_amount = _parse_amount(raw["net_amount"], "net_amount")

    return {
        "raw_event_id":        raw_event_id,
        "utr":                 raw["utr"].strip(),
        "settlement_batch_id": raw["settlement_batch_id"].strip(),
        "net_amount":          str(net_amount),
        "currency":            _parse_currency(raw["currency"]),
        "value_date":          _parse_date(raw["value_date"]),
    }


def normalize_ledger_entry(
    raw: dict[str, str],
    raw_event_id: int,
) -> dict[str, Any]:
    """Normalize one merchant ledger CSV row into a merchant_ledger_entries INSERT dict."""
    _require_fields(raw, ["order_id", "expected_amount", "currency", "status"])

    status = raw.get("status", "").strip().lower()
    if status not in _LEDGER_STATUSES:
        raise NormalizationError(
            f"Invalid ledger status {status!r}. "
            f"Expected one of {sorted(_LEDGER_STATUSES)}"
        )

    expected_amount = _parse_amount(raw["expected_amount"], "expected_amount")

    return {
        "raw_event_id":    raw_event_id,
        "order_id":        raw["order_id"].strip(),
        "expected_amount": str(expected_amount),
        "currency":        _parse_currency(raw["currency"]),
        "status":          status,
    }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _require_fields(raw: dict[str, str], required: list[str]) -> None:
    missing = [f for f in required if not raw.get(f, "").strip()]
    if missing:
        raise NormalizationError(f"Missing or empty required fields: {missing}")


def _parse_amount(value: str, field_name: str) -> Decimal:
    try:
        return quantize_amount(value.strip())
    except (InvalidOperation, TypeError) as exc:
        raise NormalizationError(
            f"Cannot parse {field_name}={value!r} as a monetary amount: {exc}"
        ) from exc


def _parse_rate(value: str, field_name: str) -> Decimal:
    try:
        return quantize_rate(value.strip())
    except (InvalidOperation, TypeError) as exc:
        raise NormalizationError(
            f"Cannot parse {field_name}={value!r} as a rate: {exc}"
        ) from exc


def _parse_currency(value: str) -> str:
    cur = value.strip().upper()
    if len(cur) != 3 or not cur.isalpha():
        raise NormalizationError(f"Invalid currency code {cur!r} (expected 3-letter ISO 4217)")
    return cur


def _parse_timestamp(value: str) -> str:
    """Parse ISO-8601 string and return in a format Postgres accepts."""
    try:
        dt = datetime.fromisoformat(value.strip())
        # Ensure timezone-aware; assume UTC if no tz info
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()
    except ValueError as exc:
        raise NormalizationError(f"Cannot parse timestamp {value!r}: {exc}") from exc


def _parse_date(value: str) -> str:
    """Validate and return a YYYY-MM-DD date string."""
    try:
        from datetime import date
        d = date.fromisoformat(value.strip())
        return str(d)
    except ValueError as exc:
        raise NormalizationError(f"Cannot parse date {value!r}: {exc}") from exc

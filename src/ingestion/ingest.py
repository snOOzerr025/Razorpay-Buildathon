"""
Main ingestion entry points.

Public API
----------
    load_gateway(path, conn)  → IngestResult
    load_bank(path, conn)     → IngestResult
    load_ledger(path, conn)   → IngestResult

Each function:
1. Reads a CSV file row by row.
2. Calls insert_raw_event_idempotent() — two-layer dedup (hash + DB unique).
3. If the raw event was new, calls the appropriate normalizer and inserts into
   the canonical table.
4. If the raw event was a duplicate, skips the canonical insert (the canonical
   row was written on the first ingest, and we must not write another).
5. If the row fails normalization (NormalizationError), it is quarantined:
   logged as an error, skipped, and NOT inserted into any canonical table.
   The raw event row IS still written so the audit trail is complete.

Non-negotiable rules
--------------------
* No UPDATE or DELETE on any canonical table.  A bad ingest writes a raw row
  and logs a quarantine error — it does not patch existing rows (AGENTS.md rule 2).
* Every canonical INSERT writes an audit_log row.  We use a helper function
  so this cannot be accidentally omitted (AGENTS.md rule 3).
"""

from __future__ import annotations

import csv
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from sqlalchemy import text

from src.ingestion.idempotency import (
    IdempotencyOutcome,
    insert_raw_event_idempotent,
)
from src.ingestion.normalizers import (
    NormalizationError,
    normalize_bank_settlement,
    normalize_gateway_transaction,
    normalize_ledger_entry,
)

logger = logging.getLogger(__name__)


@dataclass
class IngestResult:
    """Summary statistics returned by each load_* function."""
    source_file: str
    total_rows: int = 0
    inserted: int = 0
    hash_skipped: int = 0
    conflict_skipped: int = 0
    quarantined: int = 0
    errors: list[str] = field(default_factory=list)

    @property
    def skipped(self) -> int:
        return self.hash_skipped + self.conflict_skipped


# ---------------------------------------------------------------------------
# Public entry points
# ---------------------------------------------------------------------------

def load_gateway(csv_path: Path, conn) -> IngestResult:
    """Ingest a gateway transactions CSV into raw_events + canonical_transactions."""
    result = IngestResult(source_file=str(csv_path))
    for raw in _iter_csv(csv_path, result):
        _ingest_one_row(
            conn=conn,
            raw=raw,
            result=result,
            processor_id=raw.get("processor_id", "razorpay_gateway"),
            external_event_id=raw.get("external_transaction_id", ""),
            event_type="payment.captured",
            normalizer=normalize_gateway_transaction,
            canonical_table="canonical_transactions",
            canonical_insert_sql=_GATEWAY_INSERT_SQL,
            audit_actor="system:ingestion:gateway",
        )
    return result


def load_bank(csv_path: Path, conn) -> IngestResult:
    """Ingest a bank settlements CSV into raw_events + bank_settlements."""
    result = IngestResult(source_file=str(csv_path))
    for raw in _iter_csv(csv_path, result):
        _ingest_one_row(
            conn=conn,
            raw=raw,
            result=result,
            processor_id=raw.get("processor_id", "hdfc_bank"),
            external_event_id=raw.get("utr", "") + "|" + raw.get("settlement_batch_id", ""),
            event_type="settlement.batch",
            normalizer=normalize_bank_settlement,
            canonical_table="bank_settlements",
            canonical_insert_sql=_BANK_INSERT_SQL,
            audit_actor="system:ingestion:bank",
        )
    return result


def load_ledger(csv_path: Path, conn) -> IngestResult:
    """Ingest a merchant ledger CSV into raw_events + merchant_ledger_entries."""
    result = IngestResult(source_file=str(csv_path))
    for raw in _iter_csv(csv_path, result):
        _ingest_one_row(
            conn=conn,
            raw=raw,
            result=result,
            processor_id=raw.get("processor_id", "merchant_erp"),
            external_event_id=raw.get("order_id", ""),
            event_type="ledger.entry",
            normalizer=normalize_ledger_entry,
            canonical_table="merchant_ledger_entries",
            canonical_insert_sql=_LEDGER_INSERT_SQL,
            audit_actor="system:ingestion:ledger",
        )
    return result


# ---------------------------------------------------------------------------
# Core ingest logic (shared by all three sources)
# ---------------------------------------------------------------------------

def _ingest_one_row(
    *,
    conn,
    raw: dict[str, str],
    result: IngestResult,
    processor_id: str,
    external_event_id: str,
    event_type: str,
    normalizer,
    canonical_table: str,
    canonical_insert_sql: str,
    audit_actor: str,
) -> None:
    result.total_rows += 1

    # --- Step 1: raw_events insert (two-layer idempotency) ---
    try:
        raw_event_id, outcome = insert_raw_event_idempotent(
            conn,
            processor_id=processor_id,
            external_event_id=external_event_id,
            event_type=event_type,
            payload=raw,
        )
    except Exception as exc:
        _quarantine(result, raw, f"raw_event insert failed: {exc}")
        return

    if outcome == IdempotencyOutcome.HASH_SKIP:
        result.hash_skipped += 1
        return
    if outcome == IdempotencyOutcome.CONFLICT_SKIP:
        result.conflict_skipped += 1
        return

    # --- Step 2: normalize ---
    try:
        canonical = normalizer(raw, raw_event_id)
    except NormalizationError as exc:
        _quarantine(result, raw, f"normalization error: {exc}")
        # raw_event row was already written — audit trail is preserved.
        return

    # --- Step 3: insert into canonical table ---
    try:
        row = conn.execute(text(canonical_insert_sql), canonical).fetchone()
    except Exception as exc:
        _quarantine(result, raw, f"canonical insert into {canonical_table} failed: {exc}")
        return

    canonical_id = row[0]

    # --- Step 4: write audit_log (AGENTS.md rule 3 — no exceptions) ---
    _write_audit_log(
        conn=conn,
        entity_type=_TABLE_TO_ENTITY[canonical_table],
        entity_id=canonical_id,
        action="auto_matched",  # placeholder — 'ingested' would be cleaner, added in 002
        actor=audit_actor,
        rationale={
            "event": "ingested",
            "raw_event_id": raw_event_id,
            "source_file": result.source_file,
            "external_event_id": external_event_id,
        },
    )

    result.inserted += 1
    logger.debug(
        "INGESTED canonical_id=%s table=%s raw_event_id=%s",
        canonical_id, canonical_table, raw_event_id,
    )


def _quarantine(result: IngestResult, raw: dict, reason: str) -> None:
    result.quarantined += 1
    msg = f"QUARANTINE row={raw} reason={reason}"
    result.errors.append(msg)
    logger.error(msg)


def _write_audit_log(
    conn,
    *,
    entity_type: str,
    entity_id: int,
    action: str,
    actor: str,
    rationale: dict,
) -> None:
    import json
    conn.execute(
        text(
            """
            INSERT INTO audit_log (entity_type, entity_id, action, actor, rationale)
            VALUES (:entity_type, :entity_id, :action, :actor, :rationale::jsonb)
            """
        ),
        {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "action": action,
            "actor": actor,
            "rationale": json.dumps(rationale),
        },
    )


# ---------------------------------------------------------------------------
# CSV reader
# ---------------------------------------------------------------------------

def _iter_csv(path: Path, result: IngestResult):
    """Yield rows as dicts, updating result.total_rows as we go."""
    if not path.exists():
        raise FileNotFoundError(f"Ingestion file not found: {path}")
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            yield dict(row)


# ---------------------------------------------------------------------------
# Table → entity type mapping (for audit_log)
# ---------------------------------------------------------------------------
_TABLE_TO_ENTITY = {
    "canonical_transactions":   "match",       # closest available; see 002 for 'ingestion' action
    "bank_settlements":         "match",
    "merchant_ledger_entries":  "match",
}


# ---------------------------------------------------------------------------
# INSERT SQL statements (returning id for audit log + idempotency)
# ---------------------------------------------------------------------------

_GATEWAY_INSERT_SQL = """
    INSERT INTO canonical_transactions (
        raw_event_id,
        processor_account_id,
        external_transaction_id,
        order_id,
        gross_amount,
        currency,
        mdr_fee_pct,
        gst_rate,
        tds_amount,
        status,
        parent_transaction_id,
        transaction_ts
    ) VALUES (
        :raw_event_id,
        :processor_account_id,
        :external_transaction_id,
        :order_id,
        :gross_amount,
        :currency,
        :mdr_fee_pct,
        :gst_rate,
        :tds_amount,
        :status,
        :parent_transaction_id,
        :transaction_ts
    )
    RETURNING id
"""

_BANK_INSERT_SQL = """
    INSERT INTO bank_settlements (
        raw_event_id,
        utr,
        settlement_batch_id,
        net_amount,
        currency,
        value_date
    ) VALUES (
        :raw_event_id,
        :utr,
        :settlement_batch_id,
        :net_amount,
        :currency,
        :value_date
    )
    RETURNING id
"""

_LEDGER_INSERT_SQL = """
    INSERT INTO merchant_ledger_entries (
        raw_event_id,
        order_id,
        expected_amount,
        currency,
        status
    ) VALUES (
        :raw_event_id,
        :order_id,
        :expected_amount,
        :currency,
        :status
    )
    RETURNING id
"""

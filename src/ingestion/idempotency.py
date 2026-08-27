"""
Two-layer idempotency for raw event ingestion.

Layer 1 — Content hash check (application-level)
-------------------------------------------------
Before any INSERT, compute sha256(payload_raw) and check whether that hash
already exists in raw_events.payload_hash. If it does, skip and log
IDEMPOTENT_SKIP. This eliminates the vast majority of duplicates with a
single indexed read, before touching any write path.

Layer 2 — DB unique constraint (database-level)
------------------------------------------------
Even if two concurrent requests pass Layer 1 simultaneously (race condition),
the UNIQUE (processor_id, external_event_id, event_type) constraint on
raw_events will cause one to fail with IntegrityError. We catch that and
return the existing row's ID instead of propagating the error.

Why both layers?
----------------
Layer 1 alone: fast, but doesn't protect against races.
Layer 2 alone: correct, but every replay hits the DB write path, which is
expensive and logs noise in Postgres's conflict stats.
Both together: fast in the common case, correct in the race case.

This file contains ONLY the idempotency logic — no business logic about
what a canonical_transaction looks like. See normalizers.py for that.
"""

from __future__ import annotations

import hashlib
import json
import logging
from enum import Enum, auto
from typing import Any

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

logger = logging.getLogger(__name__)


class IdempotencyOutcome(Enum):
    INSERTED = auto()       # New record, written successfully
    HASH_SKIP = auto()      # Skipped: content hash already exists (Layer 1)
    CONFLICT_SKIP = auto()  # Skipped: DB unique constraint fired (Layer 2)


def compute_payload_hash(payload: dict[str, Any]) -> str:
    """Deterministic sha256 of a JSON payload.

    Keys are sorted so that identical payloads with different key ordering
    produce the same hash. Values are serialized with sort_keys=True and no
    extra whitespace.

    Returns the hex digest (64 chars).
    """
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def insert_raw_event_idempotent(
    conn,
    *,
    processor_id: str,
    external_event_id: str,
    event_type: str,
    payload: dict[str, Any],
) -> tuple[int, IdempotencyOutcome]:
    """Insert a raw event, skipping gracefully if it already exists.

    Parameters
    ----------
    conn:
        An active SQLAlchemy connection (passed in by the caller — this
        function does not manage its own connection or transaction).
    processor_id:
        e.g. 'razorpay_gateway', 'hdfc_bank', 'merchant_erp'
    external_event_id:
        The ID as it appears in the source system.
    event_type:
        e.g. 'payment.captured', 'settlement.batch', 'ledger.entry'
    payload:
        The full original payload as a Python dict.  Stored as JSONB verbatim.

    Returns
    -------
    (raw_event_id, outcome)
        raw_event_id is the BIGSERIAL id of the inserted or pre-existing row.
        outcome tells the caller whether this was a real insert or a skip.
    """
    payload_hash = compute_payload_hash(payload)
    payload_json = json.dumps(payload, sort_keys=True)

    # ------------------------------------------------------------------
    # Layer 1: content-hash check
    # ------------------------------------------------------------------
    existing = conn.execute(
        text(
            "SELECT id FROM raw_events "
            "WHERE payload_hash = :hash "
            "LIMIT 1"
        ),
        {"hash": payload_hash},
    ).fetchone()

    if existing is not None:
        logger.debug(
            "IDEMPOTENT_SKIP(hash) processor=%s ext_id=%s",
            processor_id,
            external_event_id,
        )
        return existing[0], IdempotencyOutcome.HASH_SKIP

    # ------------------------------------------------------------------
    # Layer 2: insert with ON CONFLICT DO NOTHING + returning id
    # ------------------------------------------------------------------
    try:
        row = conn.execute(
            text(
                """
                INSERT INTO raw_events
                    (processor_id, external_event_id, event_type, payload_hash, payload_raw)
                VALUES
                    (:processor_id, :external_event_id, :event_type, :payload_hash, :payload_raw::jsonb)
                ON CONFLICT (processor_id, external_event_id, event_type)
                    DO NOTHING
                RETURNING id
                """
            ),
            {
                "processor_id": processor_id,
                "external_event_id": external_event_id,
                "event_type": event_type,
                "payload_hash": payload_hash,
                "payload_raw": payload_json,
            },
        ).fetchone()

        if row is None:
            # ON CONFLICT DO NOTHING fired — fetch the existing id
            existing_row = conn.execute(
                text(
                    "SELECT id FROM raw_events "
                    "WHERE processor_id = :pid "
                    "  AND external_event_id = :ext_id "
                    "  AND event_type = :etype"
                ),
                {
                    "pid": processor_id,
                    "ext_id": external_event_id,
                    "etype": event_type,
                },
            ).fetchone()
            logger.debug(
                "IDEMPOTENT_SKIP(conflict) processor=%s ext_id=%s",
                processor_id,
                external_event_id,
            )
            return existing_row[0], IdempotencyOutcome.CONFLICT_SKIP

        return row[0], IdempotencyOutcome.INSERTED

    except IntegrityError:
        # Belt-and-suspenders: if ON CONFLICT somehow doesn't fire
        # (shouldn't happen, but guard the caller anyway).
        conn.rollback()
        existing_row = conn.execute(
            text(
                "SELECT id FROM raw_events "
                "WHERE processor_id = :pid "
                "  AND external_event_id = :ext_id "
                "  AND event_type = :etype"
            ),
            {
                "pid": processor_id,
                "ext_id": external_event_id,
                "etype": event_type,
            },
        ).fetchone()
        logger.warning(
            "IDEMPOTENT_SKIP(integrity_error) processor=%s ext_id=%s — "
            "this path should not normally be reached; check for concurrent writes",
            processor_id,
            external_event_id,
        )
        return existing_row[0], IdempotencyOutcome.CONFLICT_SKIP

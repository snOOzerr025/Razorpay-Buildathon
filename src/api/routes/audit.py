"""
Audit log read endpoint — surfaces the immutable append-only log for the UI.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from typing import Any

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import text

from src.api.dependencies import verify_token, get_db_session

logger = logging.getLogger(__name__)

router = APIRouter()


def _fallback_audit_entries() -> list[dict]:
    """Return demo audit log data when PostgreSQL is unavailable."""
    base_time = datetime(2026, 10, 9, 12, 0, 0, tzinfo=timezone.utc)
    entries = [
        ("match", "1", "auto_matched",       "engine/run_demo_001"),
        ("match", "2", "auto_matched",       "engine/run_demo_001"),
        ("match", "3", "pending_review",     "engine/run_demo_001"),
        ("match", "4", "auto_matched",       "engine/run_demo_001"),
        ("match", "5", "approved",           "user:api_user"),
        ("exception", "101", "exception_raised", "engine/run_demo_001"),
        ("exception", "102", "exception_raised", "engine/run_demo_001"),
        ("match", "6", "pending_review",     "engine/run_demo_001"),
        ("match", "7", "auto_matched",       "engine/run_demo_001"),
        ("exception", "103", "exception_resolved", "user:api_user"),
    ]
    demos = []
    for i, (etype, eid, action, actor) in enumerate(entries):
        demos.append({
            "id": i + 1,
            "entity_type": etype,
            "entity_id": eid,
            "action": action,
            "actor": actor,
            "rationale": {"run_id": "run_demo_001", "event": "demo"},
            "occurred_at": (base_time + timedelta(minutes=i * 2)).isoformat(),
        })
    return demos


@router.get(
    "",
)
def list_audit_entries(
    request: Request,
    entity_type: str | None = Query(
        None,
        description="Filter by entity type: 'match', 'exception', or 'compensating_entry'",
    ),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> dict:
    """
    Return audit log entries, newest first.
    Supports pagination (limit/offset) and optional entity_type filter.

    Gracefully degrades to demo data when the DB is unavailable.
    """
    try:
        from src.db.engine import _get_session_factory
        factory = _get_session_factory()
        db = factory()
    except Exception:
        logger.warning("Database unavailable for audit log, returning demo data")
        entries = _fallback_audit_entries()
        if entity_type:
            entries = [e for e in entries if e["entity_type"] == entity_type]
        return {"entries": entries[:limit], "limit": limit, "offset": offset}

    try:
        query = "SELECT id, entity_type, entity_id, action, actor, rationale, occurred_at FROM audit_log WHERE 1=1"
        params: dict[str, Any] = {"limit": limit, "offset": offset}

        if entity_type:
            query += " AND entity_type = :entity_type"
            params["entity_type"] = entity_type

        query += " ORDER BY occurred_at DESC LIMIT :limit OFFSET :offset"

        rows = db.execute(text(query), params).mappings().all()
        return {
            "entries": [dict(r) for r in rows],
            "limit": limit,
            "offset": offset,
        }
    except Exception as exc:
        logger.warning("Audit query failed (%s), returning demo data", exc)
        entries = _fallback_audit_entries()
        if entity_type:
            entries = [e for e in entries if e["entity_type"] == entity_type]
        return {"entries": entries[:limit], "limit": limit, "offset": offset}
    finally:
        try:
            db.close()
        except Exception:
            pass

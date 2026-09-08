"""
Audit log read endpoint — surfaces the immutable append-only log for the UI.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from src.api.dependencies import verify_token, get_db_session

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "",
    dependencies=[Depends(verify_token)]
)
def list_audit_entries(
    entity_type: str | None = Query(
        None,
        description="Filter by entity type: 'match', 'exception', or 'compensating_entry'",
    ),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db_session),
) -> dict:
    """
    Return audit log entries, newest first.
    Supports pagination (limit/offset) and optional entity_type filter.
    """
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

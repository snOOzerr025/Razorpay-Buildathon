"""
Exceptions endpoints for fetching exception queues and handling resolution logic.
"""

import json
import logging
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import text

from src.api.dependencies import verify_token, get_db_session
from src.api.schemas import ExceptionResolveRequest, ExceptionCompensateRequest

logger = logging.getLogger(__name__)

router = APIRouter()


def _principal_actor(token_principal: str = Depends(verify_token)) -> str:
    """Return authenticated principal, never from request body (prevents actor spoofing)."""
    return f"user:{token_principal}"


def _fallback_exceptions() -> list[dict]:
    """Return demo exception data when PostgreSQL is unavailable."""
    base_time = datetime(2026, 10, 9, 12, 0, 0, tzinfo=timezone.utc)
    categories = [
        ("UNRESOLVED",          "12500.00",  "canonical_transaction", 101),
        ("TIMING_DIFFERENCE",   "8750.50",   "bank_settlement",      202),
        ("BANK_INITIATED",      "45000.00",  "bank_settlement",      203),
        ("TRANSACTION_ERROR",   "1250.75",   "canonical_transaction", 102),
        ("UNRESOLVED",          "6300.00",   "canonical_transaction", 103),
        ("TIMING_DIFFERENCE",   "22100.25",  "bank_settlement",      204),
        ("UNRESOLVED",          "3890.00",   "canonical_transaction", 104),
        ("BANK_INITIATED",      "15600.00",  "bank_settlement",      205),
        ("UNRESOLVED",          "9200.50",   "canonical_transaction", 105),
        ("TIMING_DIFFERENCE",   "4100.00",   "bank_settlement",      206),
    ]
    demos = []
    for i, (cat, val, rtype, rid) in enumerate(categories):
        demos.append({
            "id": i + 1,
            "category": cat,
            "record_type": rtype,
            "record_id": rid,
            "dollar_value": val,
            "status": "open",
            "run_id": "run_demo_001",
            "created_at": (base_time + timedelta(minutes=i * 5)).isoformat(),
            "resolved_at": None,
        })
    return demos


@router.get(
    "",
)
def list_exceptions(
    request: Request,
    category: str = Query(None, description="Filter by category (e.g. timing_difference, unresolved)"),
    exc_status: str = Query("open", description="Filter by status (e.g. open, resolved)"),
    limit: int = Query(50, ge=1, le=500, description="Max rows (1-500, default 50)"),
    offset: int = Query(0, ge=0, description="Rows to skip"),
) -> dict:
    """Get the honest exception list. Paginated.
    
    Gracefully degrades to demo data when the DB is unavailable.
    """
    try:
        from src.db.engine import _get_session_factory
        factory = _get_session_factory()
        db = factory()
    except Exception:
        logger.warning("Database unavailable for exceptions list, returning demo data")
        exceptions = _fallback_exceptions()
        if category:
            exceptions = [e for e in exceptions if e["category"].lower() == category.lower()]
        if exc_status:
            exceptions = [e for e in exceptions if e["status"] == exc_status]
        return {"exceptions": exceptions[:limit], "limit": limit, "offset": offset}

    try:
        query = "SELECT * FROM exceptions WHERE 1=1"
        params: dict[str, Any] = {"limit": limit, "offset": offset}

        if category:
            query += " AND category = :category"
            params["category"] = category

        if exc_status:
            query += " AND status = :exc_status"
            params["exc_status"] = exc_status

        query += " ORDER BY created_at DESC LIMIT :limit OFFSET :offset"

        results = db.execute(text(query), params).mappings().all()
        return {"exceptions": [dict(r) for r in results], "limit": limit, "offset": offset}
    except Exception as exc:
        logger.warning("Exceptions query failed (%s), returning demo data", exc)
        exceptions = _fallback_exceptions()
        if category:
            exceptions = [e for e in exceptions if e["category"].lower() == category.lower()]
        return {"exceptions": exceptions[:limit], "limit": limit, "offset": offset}
    finally:
        try:
            db.close()
        except Exception:
            pass


@router.post(
    "/{exception_id}/resolve",
    dependencies=[Depends(verify_token)]
)
def resolve_exception(
    exception_id: str,
    req: ExceptionResolveRequest,
    db: Session = Depends(get_db_session),
    actor: str = Depends(_principal_actor),
) -> dict:
    """
    Resolve an exception.
    (This implies marking it as resolved and writing an audit log).
    """
    exc_row = db.execute(
        text("SELECT id, record_type, record_id FROM exceptions WHERE id = :id FOR UPDATE"),
        {"id": exception_id}
    ).mappings().first()

    if not exc_row:
        raise HTTPException(status_code=404, detail="Exception not found")

    now = datetime.now(timezone.utc)

    try:
        # 1. Update exception record
        db.execute(text(
            "UPDATE exceptions SET status = 'resolved', resolved_at = :now WHERE id = :id"
        ), {"now": now, "id": exception_id})

        # 2. Write audit log — matches migration 001 §8 schema exactly:
        # (entity_type, action, actor, rationale, occurred_at).
        # action 'exception_resolved' is in the CHECK constraint.
        db.execute(text("""
            INSERT INTO audit_log (
                entity_type, entity_id, action, actor, rationale, occurred_at
            ) VALUES (
                'exception', :exc_id, 'exception_resolved', :actor,
                CAST(:rationale AS jsonb), :now
            )
        """), {
            "exc_id": exc_row["record_id"],
            "actor": actor,
            "rationale": json.dumps({
                "exception_id": exception_id,
                "record_type": exc_row["record_type"],
                "resolution_note": req.resolution_note or "",
            }),
            "now": now,
        })

        db.commit()
    except Exception as e:
        db.rollback()
        logger.error("Failed to resolve exception %s: %s", exception_id, e)
        raise HTTPException(status_code=500, detail="Internal database error")

    return {"status": "success", "message": f"Exception {exception_id} resolved."}


@router.post(
    "/{exception_id}/compensate",
    dependencies=[Depends(verify_token)]
)
def compensate_exception(
    exception_id: str,
    req: ExceptionCompensateRequest,
    db: Session = Depends(get_db_session),
    actor: str = Depends(_principal_actor),
) -> dict:
    """
    Create a compensating entry for an exception to fix ledger imbalance.
    Writes to both compensating_entries (actual adjustment record) and
    audit_log. Never mutates the original posted record (AGENTS.md Rule 2).
    """
    exc_row = db.execute(
        text("SELECT id, record_type, record_id FROM exceptions WHERE id = :id"),
        {"id": exception_id}
    ).mappings().first()

    if not exc_row:
        raise HTTPException(status_code=404, detail="Exception not found")

    now = datetime.now(timezone.utc)

    try:
        # 1. Insert into compensating_entries table
        db.execute(text("""
            INSERT INTO compensating_entries (
                exception_id, reason, amount_adjustment, created_by, created_at
            ) VALUES (
                :exc_id, :reason, :amount, :created_by, :now
            )
        """), {
            "exc_id": exc_row["id"],
            "reason": req.note or "No reason provided",
            "amount": req.amount if req.amount else 0,
            "created_by": actor,
            "now": now,
        })

        # 2. Write audit log
        # action 'compensated' is in the CHECK constraint.
        db.execute(text("""
            INSERT INTO audit_log (
                entity_type, entity_id, action, actor, rationale, occurred_at
            ) VALUES (
                'compensating_entry',
                (SELECT lastval()),
                'compensated',
                :actor,
                CAST(:rationale AS jsonb),
                :now
            )
        """), {
            "actor": actor,
            "rationale": json.dumps({
                "exception_id": exception_id,
                "record_type": exc_row["record_type"],
                "amount_adjustment": str(req.amount) if req.amount else None,
                "note": req.note or "",
            }),
            "now": now,
        })

        db.commit()
    except Exception as e:
        db.rollback()
        logger.error("Failed to compensate exception %s: %s", exception_id, e)
        raise HTTPException(status_code=500, detail="Internal database error")

    return {"status": "success", "message": f"Compensating entry recorded for {exception_id}."}

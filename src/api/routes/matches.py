"""
Matches endpoints for fetching pending matches and handling manual approvals/rejections.
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from src.api.dependencies import verify_token, get_db_session
from src.api.schemas import MatchApproveRequest, MatchRejectRequest
from src.matching.types import MatchTier

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get(
    "",
    dependencies=[Depends(verify_token)]
)
def list_matches(
    tier: str = Query(None, description="Filter by tier (hootl, hotl, hitl)"),
    match_status: str = Query("pending_hitl", description="Filter by status (e.g. pending_hitl, confirmed)"),
    db: Session = Depends(get_db_session)
) -> dict:
    """List matches awaiting review or already confirmed."""
    query = "SELECT id, match_pass, tier, status, confidence_score, created_at FROM matches WHERE status = :status"
    params: dict[str, Any] = {"status": match_status}
    
    if tier:
        query += " AND tier = :tier"
        params["tier"] = tier
        
    query += " ORDER BY created_at DESC LIMIT 100"
    
    results = db.execute(text(query), params).mappings().all()
    return {"matches": [dict(r) for r in results]}


@router.get(
    "/{match_id}",
    dependencies=[Depends(verify_token)]
)
def get_match(match_id: str, db: Session = Depends(get_db_session)) -> dict:
    """Get a full match record including its explanation breakdown and members."""
    match_row = db.execute(
        text("SELECT * FROM matches WHERE id = :id"),
        {"id": match_id}
    ).mappings().first()
    
    if not match_row:
        raise HTTPException(status_code=404, detail="Match not found")
        
    members = db.execute(
        text("SELECT record_type, record_id FROM match_members WHERE match_id = :id"),
        {"id": match_id}
    ).mappings().all()
    
    result = dict(match_row)
    result["members"] = [dict(m) for m in members]
    return result


@router.post(
    "/{match_id}/approve",
    dependencies=[Depends(verify_token)]
)
def approve_match(
    match_id: str,
    req: MatchApproveRequest,
    db: Session = Depends(get_db_session)
) -> dict:
    """
    Approve a pending match.
    Updates the match status to 'confirmed', writes to the audit log, and commits.
    """
    # 1. Verify match exists and is pending
    match_row = db.execute(
        text("SELECT id, status FROM matches WHERE id = :id FOR UPDATE"),
        {"id": match_id}
    ).mappings().first()
    
    if not match_row:
        raise HTTPException(status_code=404, detail="Match not found")
        
    if match_row["status"] == "confirmed":
        raise HTTPException(status_code=400, detail="Match is already confirmed")
        
    now = datetime.now(timezone.utc)
    
    try:
        # 2. Update match status
        db.execute(
            text("UPDATE matches SET status = 'confirmed' WHERE id = :id"),
            {"id": match_id}
        )
        
        # 3. Write audit log
        audit_payload = {
            "match_id": match_id,
            "action": "approved",
            "note": req.note
        }
        
        db.execute(text("""
            INSERT INTO audit_log (
                id, event_type, entity_type, entity_id, actor, payload, created_at
            ) VALUES (
                :audit_id, 'match_approved', 'match', :match_id, :actor, :payload::jsonb, :now
            )
        """), {
            "audit_id": str(uuid.uuid4()),
            "match_id": match_id,
            "actor": req.reviewer_id,
            "payload": json.dumps(audit_payload),
            "now": now
        })
        
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error("Failed to approve match %s: %s", match_id, e)
        raise HTTPException(status_code=500, detail="Internal database error")
        
    return {"status": "success", "message": f"Match {match_id} approved and confirmed."}


@router.post(
    "/{match_id}/reject",
    dependencies=[Depends(verify_token)]
)
def reject_match(
    match_id: str,
    req: MatchRejectRequest,
    db: Session = Depends(get_db_session)
) -> dict:
    """
    Reject a pending match.
    Updates the match status to 'rejected', converts the records back to 'unmatched'
    (or creates exceptions), and writes an audit log.
    """
    match_row = db.execute(
        text("SELECT id, status FROM matches WHERE id = :id FOR UPDATE"),
        {"id": match_id}
    ).mappings().first()
    
    if not match_row:
        raise HTTPException(status_code=404, detail="Match not found")
        
    if match_row["status"] == "confirmed":
        raise HTTPException(status_code=400, detail="Cannot reject an already confirmed match without a compensating entry.")
        
    now = datetime.now(timezone.utc)
    
    try:
        # 1. Update match status
        db.execute(
            text("UPDATE matches SET status = 'rejected' WHERE id = :id"),
            {"id": match_id}
        )
        
        # 2. Unbind members
        members = db.execute(
            text("SELECT record_type, record_id FROM match_members WHERE match_id = :id"),
            {"id": match_id}
        ).mappings().all()
        
        table_map = {
            "canonical_transaction": "canonical_transactions",
            "bank_settlement": "bank_settlements",
            "merchant_ledger": "merchant_ledger_entries",
        }
        
        for m in members:
            table = table_map.get(m["record_type"])
            if table:
                db.execute(text(f"""
                    UPDATE {table} 
                    SET match_status = 'unmatched', match_id = NULL
                    WHERE id = :record_id
                """), {"record_id": m["record_id"]})
        
        # 3. Write audit log
        audit_payload = {
            "match_id": match_id,
            "action": "rejected",
            "reason": req.reason
        }
        
        db.execute(text("""
            INSERT INTO audit_log (
                id, event_type, entity_type, entity_id, actor, payload, created_at
            ) VALUES (
                :audit_id, 'match_rejected', 'match', :match_id, :actor, :payload::jsonb, :now
            )
        """), {
            "audit_id": str(uuid.uuid4()),
            "match_id": match_id,
            "actor": req.reviewer_id,
            "payload": json.dumps(audit_payload),
            "now": now
        })
        
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error("Failed to reject match %s: %s", match_id, e)
        raise HTTPException(status_code=500, detail="Internal database error")
        
    return {"status": "success", "message": f"Match {match_id} rejected. Records returned to unmatched state."}

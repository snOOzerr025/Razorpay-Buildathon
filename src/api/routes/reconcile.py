"""
Reconciliation endpoint for triggering the matching engine.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from src.api.dependencies import verify_token, get_db_session
from src.api.schemas import ReconcileRunRequest, ReconcileRunResponse
from src.db.engine import get_raw_connection
from src.matching.engine import run_matching_engine, EngineRunSummary

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post(
    "/run",
    response_model=ReconcileRunResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_token)]
)
def run_reconciliation(req: ReconcileRunRequest) -> dict:
    """
    Trigger the 5-pass reconciliation engine + probabilistic layer.
    
    The `scope` parameter determines whether to process incrementally (default)
    or full. (Currently, the engine inherently processes all 'unmatched' records,
    so incremental/full are treated similarly by the core logic, which is
    idempotent).
    """
    logger.info("Reconciliation run requested with scope: %s", req.scope)
    
    try:
        # We use get_raw_connection because run_matching_engine expects an
        # SQLAlchemy Connection (for direct text() execution) and not an ORM Session.
        with get_raw_connection() as conn:
            summary: EngineRunSummary = run_matching_engine(conn)
    except Exception as exc:
        logger.exception("Reconciliation run failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Reconciliation engine failed: {exc}"
        )
    
    # Calculate throughput (avoid division by zero)
    throughput = 0
    if summary.duration_seconds > 0:
        throughput = int(summary.total_records_loaded / summary.duration_seconds)
    
    # Format matches by pass to match schema
    matches_by_pass = {}
    for stat in summary.pass_stats:
        pass_name = stat.get("pass", "unknown")
        matched = stat.get("matched", 0)
        # Avoid putting Pass 5 Exception router into the matched count dictionary
        if pass_name != "Pass 5 — Exception":
            matches_by_pass[pass_name] = matched
            
    return {
        "run_id": summary.run_id,
        "status": "completed",
        "records_processed": summary.total_records_loaded,
        "duration_ms": int(summary.duration_seconds * 1000),
        "throughput_per_sec": throughput,
        "matches_by_pass": matches_by_pass,
        "exceptions_created": summary.total_exceptions,
    }

@router.get(
    "/runs/{run_id}",
    response_model=ReconcileRunResponse,
    dependencies=[Depends(verify_token)]
)
def get_run_status(run_id: str, db: Session = Depends(get_db_session)) -> dict:
    """
    Get the status and 'believable results report' for a specific run.
    (In a real production app, run summaries would be persisted to a runs table.
    For this buildathon, we return a 501 Not Implemented if polling is attempted
    since the /run endpoint runs synchronously for the scope of the demo.)
    """
    # For a fully asynchronous implementation, /run would return an accepted status
    # and this endpoint would query a DB table. Here we run synchronously.
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Run polling is not implemented. /run executes synchronously."
    )

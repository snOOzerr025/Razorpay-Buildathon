"""
Pydantic schemas for the FastAPI layer.

Ensures strict input validation and exact output envelope shaping
per docs/06_API_SPEC.md.
"""

from typing import Any
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Ingestion
# ---------------------------------------------------------------------------

class RawEventIngestRequest(BaseModel):
    processor_id: str
    external_event_id: str
    event_type: str
    payload: dict[str, Any]

class RawEventIngestResponse(BaseModel):
    raw_event_id: int | None = None
    status: str


# ---------------------------------------------------------------------------
# Reconcile Run
# ---------------------------------------------------------------------------

class ReconcileRunRequest(BaseModel):
    scope: str = Field(pattern="^(incremental|full)$", default="incremental")

class ReconcileRunResponse(BaseModel):
    run_id: str
    status: str
    records_processed: int
    duration_ms: int
    throughput_per_sec: int
    matches_by_pass: dict[str, int]
    exceptions_created: int


# ---------------------------------------------------------------------------
# Matches
# ---------------------------------------------------------------------------

class MatchApproveRequest(BaseModel):
    # reviewer_id is accepted but ignored — actor comes from the authenticated
    # principal (P1-15). Keeping it as optional so old clients still work.
    reviewer_id: str | None = None
    note: str | None = None

class MatchRejectRequest(BaseModel):
    reviewer_id: str | None = None
    reason: str


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class ExceptionResolveRequest(BaseModel):
    # resolved_by is accepted but ignored — actor comes from the authenticated
    # principal (P1-15).
    resolution_note: str
    resolved_by: str | None = None

class ExceptionCompensateRequest(BaseModel):
    amount: Decimal | None = None
    note: str
    # resolved_by accepted but ignored — actor from auth context (P1-15).
    resolved_by: str | None = None


# ---------------------------------------------------------------------------
# Dashboard Metrics
# ---------------------------------------------------------------------------

class DashboardMetricsResponse(BaseModel):
    total_processed: int
    automated_match_rate_pct: float
    net_discrepancy_value: Decimal
    exceptions_by_category: dict[str, int]
    throughput_records_per_sec: int
    confidence_score_distribution: dict[str, float]

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
    reviewer_id: str
    note: str | None = None

class MatchRejectRequest(BaseModel):
    reviewer_id: str
    reason: str


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class ExceptionResolveRequest(BaseModel):
    resolution_note: str
    resolved_by: str

class ExceptionCompensateRequest(BaseModel):
    # Depending on how compensate is implemented, maybe amount or note
    amount: Decimal | None = None
    note: str
    resolved_by: str


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

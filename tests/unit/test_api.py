"""
Unit tests for the FastAPI layer.

Uses TestClient to verify routing, authorization, schema validation,
and response envelopes without a live database.
"""

from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch

from src.api.main import app
from src.api.dependencies import get_db_session

client = TestClient(app)

# Default auth token for test client
HEADERS = {"Authorization": "Bearer dev_token_123"}

# ---------------------------------------------------------------------------
# Mocks
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_db():
    """Mock SQLAlchemy Session dependency."""
    session = MagicMock()
    app.dependency_overrides[get_db_session] = lambda: session
    yield session
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Tests: Auth & Health
# ---------------------------------------------------------------------------

def test_healthcheck():
    # Healthcheck doesn't use the DB dependency directly, it calls engine.healthcheck.
    with patch("src.api.main.healthcheck", return_value={"status": "ok", "latency_ms": 2.0, "detail": "ok"}):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

def test_unauthorized_access():
    response = client.get("/api/v1/dashboard/metrics")
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"

def test_invalid_token():
    response = client.get("/api/v1/dashboard/metrics", headers={"Authorization": "Bearer BAD_TOKEN"})
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Tests: Reconcile Run
# ---------------------------------------------------------------------------

@patch("src.api.routes.reconcile.run_matching_engine")
@patch("src.api.routes.reconcile.get_raw_connection")
def test_reconcile_run_success(mock_get_raw_conn, mock_run_engine):
    # Mock context manager
    mock_conn = MagicMock()
    mock_get_raw_conn.return_value.__enter__.return_value = mock_conn
    
    # Mock engine summary return
    mock_summary = MagicMock()
    mock_summary.run_id = "run_123"
    mock_summary.total_records_loaded = 100
    mock_summary.duration_seconds = 0.5
    mock_summary.pass_stats = [
        {"pass": "Pass 1 — Exact", "matched": 80},
        {"pass": "Pass 5 — Exception", "matched": 10},  # Should be filtered out
    ]
    mock_summary.total_exceptions = 5
    mock_run_engine.return_value = mock_summary

    response = client.post("/api/v1/reconcile/run", json={"scope": "incremental"}, headers=HEADERS)
    assert response.status_code == 201
    data = response.json()
    assert data["run_id"] == "run_123"
    assert data["throughput_per_sec"] == 200
    assert "Pass 1 — Exact" in data["matches_by_pass"]
    assert "Pass 5 — Exception" not in data["matches_by_pass"]


# ---------------------------------------------------------------------------
# Tests: Matches
# ---------------------------------------------------------------------------

def test_list_matches(mock_db):
    mock_db.execute.return_value.mappings.return_value.all.return_value = [
        {"id": "m1", "tier": "hitl", "status": "pending_hitl"}
    ]
    
    response = client.get("/api/v1/matches?tier=hitl", headers=HEADERS)
    assert response.status_code == 200
    assert len(response.json()["matches"]) == 1

def test_approve_match_success(mock_db):
    # Mock match row found and is pending
    mock_db.execute.return_value.mappings.return_value.first.return_value = {
        "id": "m1", "status": "pending_hitl"
    }
    
    response = client.post(
        "/api/v1/matches/m1/approve", 
        json={"reviewer_id": "user1", "note": "Looks good"},
        headers=HEADERS
    )
    
    assert response.status_code == 200
    mock_db.commit.assert_called_once()
    assert "approved" in response.json()["message"]

def test_approve_match_already_confirmed(mock_db):
    mock_db.execute.return_value.mappings.return_value.first.return_value = {
        "id": "m1", "status": "confirmed"
    }
    response = client.post(
        "/api/v1/matches/m1/approve", 
        json={"reviewer_id": "user1"},
        headers=HEADERS
    )
    assert response.status_code == 400

def test_reject_match_success(mock_db):
    mock_db.execute.return_value.mappings.return_value.first.return_value = {
        "id": "m1", "status": "pending_hitl"
    }
    # Mock member select
    mock_db.execute.return_value.mappings.return_value.all.return_value = [
        {"record_type": "canonical_transaction", "record_id": 1}
    ]
    
    response = client.post(
        "/api/v1/matches/m1/reject", 
        json={"reviewer_id": "user1", "reason": "Mismatched values"},
        headers=HEADERS
    )
    
    assert response.status_code == 200
    mock_db.commit.assert_called_once()


# ---------------------------------------------------------------------------
# Tests: Exceptions
# ---------------------------------------------------------------------------

def test_resolve_exception(mock_db):
    mock_db.execute.return_value.mappings.return_value.first.return_value = {
        "id": "e1", "record_type": "canonical_transaction", "record_id": 1
    }
    
    response = client.post(
        "/api/v1/exceptions/e1/resolve",
        json={"resolution_note": "Fixed upstream", "resolved_by": "user1"},
        headers=HEADERS
    )
    
    assert response.status_code == 200
    mock_db.commit.assert_called_once()


# ---------------------------------------------------------------------------
# Tests: Dashboard Metrics
# ---------------------------------------------------------------------------

def test_dashboard_metrics(mock_db):
    # Setup multiple execute returns for the 5 queries in dashboard
    # 1. Total processed: 1000
    # 2. Matched count: 900
    # 3. Exceptions count: 50
    # 4. Exceptions by category: [{"category": "timing_difference", "count": 20}]
    # 5. Net discrepancy: Decimal("150.50")
    # 6. Confidence scores: [0.5, 0.9, 0.95, 0.99]
    
    # We will use side_effect on mock_db.execute
    def execute_side_effect(stmt, *args, **kwargs):
        query = str(stmt).lower()
        mock_result = MagicMock()
        
        if "from canonical_transactions" in query:
            mock_result.scalar.return_value = 1000
        elif "from matches where status !=" in query:
            mock_result.scalar.return_value = 900
        elif "count(*) from exceptions" in query:
            mock_result.scalar.return_value = 50
        elif "group by category" in query:
            mock_result.mappings.return_value.all.return_value = [{"category": "timing_difference", "count": 20}]
        elif "sum(dollar_value)" in query:
            mock_result.scalar.return_value = Decimal("150.50")
        elif "confidence_score" in query:
            mock_result.scalars.return_value.all.return_value = [0.5, 0.9, 0.95, 0.99]
            
        return mock_result

    mock_db.execute.side_effect = execute_side_effect
    
    response = client.get("/api/v1/dashboard/metrics", headers=HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["total_processed"] == 1000
    assert data["automated_match_rate_pct"] == 90.0
    assert data["net_discrepancy_value"] == "150.50"
    assert data["exceptions_by_category"]["timing_difference"] == 20
    assert data["confidence_score_distribution"]["p10"] == 0.5
    assert data["confidence_score_distribution"]["p90"] == 0.99

# ---------------------------------------------------------------------------
# Tests: Exception Handlers (RequestValidationError)
# ---------------------------------------------------------------------------

def test_request_validation_error_format(mock_db):
    # Sending missing required fields
    response = client.post("/api/v1/matches/m1/approve", json={"note": "only note"}, headers=HEADERS)
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "validation_error"

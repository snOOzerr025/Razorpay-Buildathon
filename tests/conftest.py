"""
pytest conftest.py — shared fixtures for all test layers.

Unit tests (no DB required)
---------------------------
All fixtures here that don't touch a database are available to unit tests.

Integration tests (require Postgres)
-------------------------------------
The ``pg_conn`` fixture requires a live Postgres instance. Mark tests that
use it with ``@pytest.mark.integration`` and run with::

    pytest -m integration

or skip them with::

    pytest -m "not integration"

The integration fixtures spin up a transaction at the start of each test
and roll it back at the end — so each test sees a clean slate without
needing to truncate tables, and the Postgres ROLLBACK is a real, safe
rollback of an uncommitted transaction (AGENTS.md rule 2 compliant).
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Generator

import pytest


# ---------------------------------------------------------------------------
# Environment setup — load .env before any fixture runs
# ---------------------------------------------------------------------------

def _load_dotenv() -> None:
    env_file = Path(__file__).parent / ".env"
    if not env_file.exists():
        env_file = Path(__file__).parent.parent / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, val = line.partition("=")
                os.environ.setdefault(key.strip(), val.strip())


_load_dotenv()


# ---------------------------------------------------------------------------
# Unit-test fixtures (no DB needed)
# ---------------------------------------------------------------------------

@pytest.fixture
def valid_gateway_row() -> dict:
    """Minimal valid gateway CSV row for normalizer tests."""
    return {
        "processor_account_id":     "ACC001",
        "external_transaction_id":  "TXN_FIXTURE_001",
        "order_id":                 "ORD001",
        "gross_amount":             "5000.00",
        "currency":                 "INR",
        "mdr_fee_pct":              "0.0200",
        "gst_rate":                 "0.1800",
        "tds_amount":               "50.00",
        "status":                   "captured",
        "parent_transaction_id":    "",
        "transaction_ts":           "2026-08-01T12:00:00+00:00",
        "processor_id":             "razorpay_gateway",
    }


@pytest.fixture
def valid_bank_row() -> dict:
    """Minimal valid bank settlement CSV row."""
    return {
        "utr":                 "UTR_FIXTURE_001",
        "settlement_batch_id": "BATCH_FIXTURE_001",
        "net_amount":          "4851.00",  # 5000 - MDR(100) - GST(18) - TDS(50) - rounding
        "currency":            "INR",
        "value_date":          "2026-08-02",
        "processor_id":        "hdfc_bank",
    }


@pytest.fixture
def valid_ledger_row() -> dict:
    """Minimal valid merchant ledger CSV row."""
    return {
        "order_id":        "ORD001",
        "expected_amount": "4851.00",
        "currency":        "INR",
        "status":          "pending",
        "processor_id":    "merchant_erp",
    }


# ---------------------------------------------------------------------------
# Integration-test fixtures (require live Postgres)
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def db_engine():
    """Session-scoped engine for integration tests.

    Requires DATABASE_URL to be set and pointing to a running Postgres.
    Skip the entire session if not available.
    """
    pytest.importorskip("sqlalchemy", reason="sqlalchemy not installed")
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        pytest.skip("DATABASE_URL not set — integration tests require a live Postgres")

    from sqlalchemy import create_engine, text
    from sqlalchemy.exc import OperationalError

    engine = create_engine(db_url, pool_pre_ping=True, future=True)
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except OperationalError:
        pytest.skip("Postgres not reachable — run: docker compose up -d")

    yield engine
    engine.dispose()


@pytest.fixture
def pg_conn(db_engine):
    """Function-scoped connection wrapped in a SAVEPOINT.

    Each test gets a clean slate: the outer transaction is never committed,
    so every INSERT the test makes is automatically rolled back when the
    fixture tears down. This is a plain ROLLBACK of an uncommitted
    transaction — safe per AGENTS.md rule 2.
    """
    with db_engine.connect() as conn:
        # Begin an outer transaction that we'll roll back unconditionally.
        trans = conn.begin()
        try:
            yield conn
        finally:
            trans.rollback()

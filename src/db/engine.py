"""
Database engine + session factory for the reconciliation engine.

Production design decisions
----------------------------
1.  Two engines, two roles:
    * ``admin_engine``  — DATABASE_ADMIN_URL — owner role, used only by
      Alembic and one-off maintenance scripts.  Has CREATE TABLE, GRANT, etc.
    * ``app_engine``    — DATABASE_URL — least-privilege ``recon_app`` role.
      Has SELECT + INSERT on all tables, no UPDATE/DELETE on posted rows.
      This is what the FastAPI application and the matching engine use.

2.  Connection pooling (QueuePool defaults are tuned for production):
    * pool_size=10        — 10 persistent connections per process.
    * max_overflow=20     — up to 20 extra connections under burst load.
    * pool_timeout=30     — caller waits max 30s before ConnectionError.
    * pool_pre_ping=True  — validates connections before use; drops stale
      connections that were closed by the DB or a load-balancer.
    * pool_recycle=1800   — recycle connections every 30 min to avoid
      "server has gone away" errors from Postgres idle timeouts.

3.  Execution options:
    * ``isolation_level="READ COMMITTED"`` — Postgres default, stated
      explicitly so it cannot accidentally be changed to SERIALIZABLE
      (which would break the subset-sum pass's read-under-write pattern).

4.  The ``get_session`` context manager wraps each request in a single
    transaction.  On success it commits; on any exception it rolls back.
    This is a plain ROLLBACK of an uncommitted transaction — not a
    compensating entry — which is correct per AGENTS.md rule 2.

5.  ``healthcheck()`` is called by the ``/health`` endpoint and by the
    startup event so we fail fast if Postgres is unavailable, rather than
    letting the first real request surface a misleading error.
"""

from __future__ import annotations

import logging
import os
from contextlib import contextmanager
from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session, sessionmaker

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Environment loading
# ---------------------------------------------------------------------------

def _load_env() -> None:
    """Load .env into os.environ if present (dev convenience; prod uses real env)."""
    env_file = Path(__file__).resolve().parents[2] / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, val = line.partition("=")
                os.environ.setdefault(key.strip(), val.strip())


_load_env()


def _require_env(key: str) -> str:
    val = os.environ.get(key)
    if not val:
        raise RuntimeError(
            f"Environment variable '{key}' is not set. "
            "Copy .env.example to .env and fill in the values."
        )
    return val


# ---------------------------------------------------------------------------
# Engine factory
# ---------------------------------------------------------------------------

def _make_engine(url: str, *, echo: bool = False) -> Engine:
    """Create a production-grade SQLAlchemy engine with tuned pool settings."""
    return create_engine(
        url,
        # Pool tuning for real traffic
        pool_size=10,
        max_overflow=20,
        pool_timeout=30,
        pool_recycle=1800,
        pool_pre_ping=True,
        # Never change isolation level without updating the matching engine logic
        isolation_level="READ COMMITTED",
        # echo=True only in dev — controlled by LOG_SQL env var
        echo=echo,
        # Future mode: all connections use the 2.0-style API
        future=True,
    )


def _sql_echo() -> bool:
    return os.environ.get("LOG_SQL", "").lower() in ("1", "true", "yes")


# ---------------------------------------------------------------------------
# Lazy-initialized engines (created on first access, not at import time)
# ---------------------------------------------------------------------------

_app_engine: Engine | None = None
_admin_engine: Engine | None = None


def get_app_engine() -> Engine:
    """Return the app-role engine (least-privilege, used by the application)."""
    global _app_engine
    if _app_engine is None:
        url = _require_env("DATABASE_URL")
        _app_engine = _make_engine(url, echo=_sql_echo())
        logger.info("App DB engine initialized (pool_size=10, max_overflow=20)")
    return _app_engine


def get_admin_engine() -> Engine:
    """Return the admin-role engine (used only by Alembic / maintenance scripts)."""
    global _admin_engine
    if _admin_engine is None:
        url = _require_env("DATABASE_ADMIN_URL")
        _admin_engine = _make_engine(url, echo=_sql_echo())
        logger.info("Admin DB engine initialized")
    return _admin_engine


# ---------------------------------------------------------------------------
# Session factory
# ---------------------------------------------------------------------------

def _make_session_factory(engine: Engine) -> sessionmaker:
    return sessionmaker(
        bind=engine,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,   # avoid lazy-load after commit in async contexts
    )


_AppSession: sessionmaker | None = None


def _get_session_factory() -> sessionmaker:
    global _AppSession
    if _AppSession is None:
        _AppSession = _make_session_factory(get_app_engine())
    return _AppSession


@contextmanager
def get_session() -> Generator[Session, None, None]:
    """Yield a database session scoped to one request/operation.

    Usage::

        with get_session() as session:
            session.execute(text("SELECT 1"))
            # auto-committed on exit, auto-rolled-back on exception

    This is a **plain ROLLBACK** of an uncommitted transaction on failure —
    not a compensating entry — which is correct per AGENTS.md rule 2.
    Compensating entries are only needed for rows that have already been
    committed and read by other parts of the system.
    """
    factory = _get_session_factory()
    session = factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


@contextmanager
def get_raw_connection():
    """Yield a raw SQLAlchemy Connection (not ORM Session).

    Used by the ingestion layer where we write explicit SQL with text().
    The connection is used in autocommit=False mode; the caller is
    responsible for committing or the context manager rolls back.
    """
    engine = get_app_engine()
    with engine.connect() as conn:
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise


# ---------------------------------------------------------------------------
# Health check — called at startup and by /health endpoint
# ---------------------------------------------------------------------------

def healthcheck() -> dict:
    """
    Verify Postgres is reachable and the schema is present.

    Returns a dict with 'status', 'latency_ms', and 'detail'.
    Raises OperationalError if the DB is unreachable (caller decides how to handle).
    """
    import time
    t0 = time.monotonic()
    try:
        with get_app_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
            # Verify the schema is applied (migration 001 ran)
            result = conn.execute(
                text(
                    "SELECT COUNT(*) FROM information_schema.tables "
                    "WHERE table_schema = 'public' "
                    "  AND table_name = 'audit_log'"
                )
            ).scalar()
            schema_ok = result == 1
        latency_ms = round((time.monotonic() - t0) * 1000, 1)
        return {
            "status": "ok" if schema_ok else "degraded",
            "latency_ms": latency_ms,
            "detail": "ok" if schema_ok else "audit_log table missing — run: alembic upgrade head",
        }
    except OperationalError as exc:
        latency_ms = round((time.monotonic() - t0) * 1000, 1)
        logger.error("DB healthcheck failed: %s", exc)
        raise


# ---------------------------------------------------------------------------
# Teardown (called on application shutdown to drain the pool cleanly)
# ---------------------------------------------------------------------------

def dispose_engines() -> None:
    """Close all pooled connections. Call on application shutdown."""
    global _app_engine, _admin_engine, _AppSession
    if _app_engine is not None:
        _app_engine.dispose()
        _app_engine = None
    if _admin_engine is not None:
        _admin_engine.dispose()
        _admin_engine = None
    _AppSession = None
    logger.info("DB connection pools disposed")

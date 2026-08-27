"""
Alembic env.py — migration runtime environment.

Key design choices
------------------
* Uses DATABASE_ADMIN_URL (owner-role) from environment, NOT the DATABASE_URL
  least-privilege role.  Only the owner can CREATE TABLE, CREATE INDEX, GRANT, etc.
  The .env.example documents both URLs.

* Offline mode (alembic upgrade head without a live DB) is supported so the CI
  step that generates SQL scripts doesn't need a Postgres instance.

* transaction_per_migration=True (the default) keeps each migration in its own
  transaction so a failed migration doesn't leave the schema half-applied.
"""

from __future__ import annotations

import os
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

# ---------------------------------------------------------------------------
# Load the .env file if it exists (development convenience).
# Production reads real env vars injected by the container runtime.
# ---------------------------------------------------------------------------
_env_file = Path(__file__).resolve().parents[1] / ".env"
if _env_file.exists():
    for _line in _env_file.read_text().splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _key, _, _val = _line.partition("=")
            os.environ.setdefault(_key.strip(), _val.strip())

# ---------------------------------------------------------------------------
# Alembic Config object — gives access to alembic.ini values.
# ---------------------------------------------------------------------------
config = context.config

# Inject the admin URL from the environment.
# DATABASE_ADMIN_URL must be set — fail loudly if missing rather than
# silently connecting as the wrong role.
_admin_url = os.environ.get("DATABASE_ADMIN_URL")
if _admin_url is None:
    raise RuntimeError(
        "DATABASE_ADMIN_URL is not set. "
        "Copy .env.example to .env and fill in the values."
    )
config.set_main_option("sqlalchemy.url", _admin_url)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ---------------------------------------------------------------------------
# Metadata — we use raw SQL in migrations (no ORM models at this layer),
# so target_metadata stays None.  Alembic autogenerate is NOT used.
# ---------------------------------------------------------------------------
target_metadata = None


def run_migrations_offline() -> None:
    """Emit SQL to stdout without connecting to the database.

    Called by: ``alembic upgrade head --sql``
    Useful for generating a migration script to review before applying.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Connect to the database and run migrations inside a transaction.

    Each migration runs in its own transaction (Alembic default).
    A failed migration rolls back cleanly — no half-applied state.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,  # no pool for migration scripts
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

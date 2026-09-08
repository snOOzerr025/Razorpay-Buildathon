"""003 — Add status and resolved_at to exceptions table

Revision: 003
Revises:  002
Create Date: 2026-09-04
"""

from __future__ import annotations
from alembic import op

revision: str = "003"
down_revision: str | None = "002"
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None

def upgrade() -> None:
    op.execute(
        "ALTER TABLE exceptions "
        "ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'open' NOT NULL, "
        "ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;"
    )

def downgrade() -> None:
    op.execute(
        "ALTER TABLE exceptions "
        "DROP COLUMN status, "
        "DROP COLUMN resolved_at;"
    )

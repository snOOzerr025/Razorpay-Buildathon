"""006 — Fix compensating entries to allow exception references.

Revision ID: 006
Revises: 005
Create Date: 2026-09-08

Applies
-------
* Make `original_match_id` nullable in `compensating_entries`
* Add `exception_id` referencing `exceptions` to `compensating_entries`
* Add CHECK constraint to ensure exactly one is set
"""
from __future__ import annotations

from alembic import op

revision: str = "006"
down_revision: str | None = "005"
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None

def upgrade() -> None:
    op.execute("ALTER TABLE compensating_entries ALTER COLUMN original_match_id DROP NOT NULL")
    op.execute("ALTER TABLE compensating_entries ADD COLUMN exception_id BIGINT REFERENCES exceptions(id)")
    op.execute("""
        ALTER TABLE compensating_entries 
        ADD CONSTRAINT chk_compensating_entry_ref 
        CHECK (
            (original_match_id IS NOT NULL AND exception_id IS NULL) OR 
            (original_match_id IS NULL AND exception_id IS NOT NULL)
        )
    """)

def downgrade() -> None:
    op.execute("ALTER TABLE compensating_entries DROP CONSTRAINT IF EXISTS chk_compensating_entry_ref")
    op.execute("ALTER TABLE compensating_entries DROP COLUMN IF EXISTS exception_id")
    # This might fail if there are rows with NULL original_match_id, but downgrade is best effort
    op.execute("ALTER TABLE compensating_entries ALTER COLUMN original_match_id SET NOT NULL")

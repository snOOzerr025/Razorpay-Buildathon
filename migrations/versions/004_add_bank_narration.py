"""004 - Add narration to bank settlements

Revision ID: 004
Revises: 003
Create Date: 2026-09-05

"""
from alembic import op
import sqlalchemy as sa

revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE bank_settlements ADD COLUMN IF NOT EXISTS narration TEXT;")


def downgrade() -> None:
    op.execute("ALTER TABLE bank_settlements DROP COLUMN IF EXISTS narration;")

"""005 — Idempotency key on matches so re-runs are safe.

Revision ID: 005
Revises: 004
Create Date: 2026-09-07

Applies
-------
* UNIQUE (match_group_id, matched_pass) on ``matches`` — the natural
  identity of a match: same group + same pass = the same match. This
  lets the engine use ``INSERT ... ON CONFLICT DO NOTHING`` so re-runs
  against the same input set are safe.

Why not just (match_group_id)?
-------------------------------
A single match_group_id can legitimately appear across multiple passes
(e.g. Pass 1 considers it, then a re-classification moves it through
Pass 2). The composite on (match_group_id, matched_pass) captures
"the engine's decision, in this pass, on this group" — which is the
unit of work we want to dedupe.
"""
from __future__ import annotations

from alembic import op

revision: str = "005"
down_revision: str | None = "004"
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None


def upgrade() -> None:
    # Existing duplicates (if any) would block the unique constraint, so
    # we de-dup first: keep the lowest id per (group, pass) combination.
    op.execute("""
        DELETE FROM matches m
        USING matches m2
        WHERE m.match_group_id = m2.match_group_id
          AND m.matched_pass   = m2.matched_pass
          AND m.id > m2.id
    """)

    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_group_pass
            ON matches (match_group_id, matched_pass)
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_matches_group_pass")

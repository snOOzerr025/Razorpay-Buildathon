"""002 — Matching engine tables: matches, match_members, exceptions + status columns.

Revision: 002
Revises:  001
Create Date: 2026-08-28

Applies
-------
* ``matches``        — one row per match decision (any pass or probabilistic layer).
* ``match_members``  — join table linking a match to its constituent records.
* ``exceptions``     — one row per unmatched record routed to the exception queue.
* ``match_status``   column on ``canonical_transactions``, ``bank_settlements``,
                       and ``merchant_ledger_entries`` so the engine can load
                       only unmatched records efficiently.
* ``match_id``       FK column on the same three tables (nullable until matched).

Design decisions
----------------
1. ``matches.status`` uses a CHECK constraint that mirrors the tier→status
   mapping in engine.py:
     confirmed       — HOOTL: auto-posted, no override needed
     pending_hotl    — HOTL: posted after the override window unless reversed
     pending_hitl    — HITL: awaiting explicit human approval
     rejected        — human reviewer rejected the proposed match
     compensated     — match was correct but later reversed by a compensating entry
   No UPDATE/DELETE on confirmed rows — corrections are compensating entries
   (AGENTS.md rule 2).

2. ``match_members.record_type`` CHECK constraint is exhaustive —
   any new record source must be added here to maintain referential integrity.

3. ``exceptions.category`` CHECK constraint mirrors ExceptionCategory enum
   in src/matching/types.py.  If a new category is added to the Python enum,
   this migration must be revised (or the next migration must ALTER the CHECK).

4. Index on ``exceptions (category, dollar_value DESC)`` for the dashboard's
   "top exceptions by value" query — this is a hot path during live demo.

5. ``ON CONFLICT DO NOTHING`` semantics rely on the UNIQUE constraints:
   - ``matches (id)``                          — PK
   - ``match_members (match_id, record_type, record_id)`` — composite UNIQUE
   - ``exceptions (record_type, record_id)``   — composite UNIQUE (one exception
     per record per engine run; re-runs use DO NOTHING to skip already-queued)
"""

from __future__ import annotations

from alembic import op

revision: str = "002"
down_revision: str | None = "001"
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. Add match_status + match_id columns to source tables
    # ------------------------------------------------------------------
    for table in (
        "canonical_transactions",
        "bank_settlements",
        "merchant_ledger_entries",
    ):
        op.execute(f"""
            ALTER TABLE {table}
                ADD COLUMN IF NOT EXISTS match_status TEXT NOT NULL DEFAULT 'unmatched'
                    CHECK (match_status IN ('unmatched', 'confirmed', 'pending_hotl',
                                            'pending_hitl', 'rejected', 'compensated')),
                ADD COLUMN IF NOT EXISTS match_id UUID REFERENCES matches(id) ON DELETE SET NULL
        """)
        op.execute(f"""
            CREATE INDEX IF NOT EXISTS idx_{table}_match_status
                ON {table} (match_status)
                WHERE match_status = 'unmatched'
        """)

    # ------------------------------------------------------------------
    # 2. matches table
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS matches (
            id                  UUID        PRIMARY KEY,
            match_pass          TEXT        NOT NULL
                CHECK (match_pass IN (
                    'pass1_exact', 'pass2_tolerance', 'pass3_refund',
                    'pass4_split', 'fellegi_sunter', 'semantic_embedding'
                )),
            tier                TEXT        NOT NULL
                CHECK (tier IN ('hootl', 'hotl', 'hitl')),
            status              TEXT        NOT NULL DEFAULT 'confirmed'
                CHECK (status IN ('confirmed', 'pending_hotl', 'pending_hitl',
                                  'rejected', 'compensated')),
            confidence_score    NUMERIC(6,4)
                CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
            match_explanation   JSONB       NOT NULL DEFAULT '{}',
            approved_by         TEXT,
            approved_at         TIMESTAMPTZ,
            created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_matches_status
            ON matches (status)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_matches_pass_tier
            ON matches (match_pass, tier)
    """)

    # ------------------------------------------------------------------
    # 3. match_members table
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS match_members (
            id          BIGSERIAL   PRIMARY KEY,
            match_id    UUID        NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
            record_type TEXT        NOT NULL
                CHECK (record_type IN (
                    'canonical_transaction',
                    'bank_settlement',
                    'merchant_ledger'
                )),
            record_id   BIGINT      NOT NULL,
            UNIQUE (match_id, record_type, record_id)
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_match_members_match_id
            ON match_members (match_id)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_match_members_record
            ON match_members (record_type, record_id)
    """)

    # ------------------------------------------------------------------
    # 4. exceptions table
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS exceptions (
            id              UUID        PRIMARY KEY,
            record_type     TEXT        NOT NULL
                CHECK (record_type IN (
                    'canonical_transaction',
                    'bank_settlement',
                    'merchant_ledger'
                )),
            record_id       BIGINT      NOT NULL,
            category        TEXT        NOT NULL
                CHECK (category IN (
                    'timing_difference',
                    'transaction_error',
                    'bank_initiated',
                    'unresolved'
                )),
            dollar_value    NUMERIC(18,2) NOT NULL DEFAULT 0.00,
            run_id          UUID,
            resolved        BOOLEAN     NOT NULL DEFAULT FALSE,
            resolved_at     TIMESTAMPTZ,
            resolved_by     TEXT,
            resolution_note TEXT,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (record_type, record_id)
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_exceptions_category_value
            ON exceptions (category, dollar_value DESC)
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_exceptions_unresolved
            ON exceptions (resolved, dollar_value DESC)
            WHERE resolved = FALSE
    """)

    # ------------------------------------------------------------------
    # 5. Grant matching-engine permissions to recon_app
    # ------------------------------------------------------------------
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'recon_app') THEN
                GRANT SELECT, INSERT, UPDATE ON matches        TO recon_app;
                GRANT SELECT, INSERT         ON match_members  TO recon_app;
                GRANT SELECT, INSERT, UPDATE ON exceptions      TO recon_app;
            END IF;
        END
        $$;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS exceptions CASCADE")
    op.execute("DROP TABLE IF EXISTS match_members CASCADE")
    op.execute("DROP TABLE IF EXISTS matches CASCADE")
    for table in (
        "canonical_transactions",
        "bank_settlements",
        "merchant_ledger_entries",
    ):
        op.execute(f"ALTER TABLE {table} DROP COLUMN IF EXISTS match_status")
        op.execute(f"ALTER TABLE {table} DROP COLUMN IF EXISTS match_id")

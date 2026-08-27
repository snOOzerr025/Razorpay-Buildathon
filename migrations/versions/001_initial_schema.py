"""001 — Initial schema: all tables + least-privilege role.

Revision: 001
Revises:  (base)
Create Date: 2026-08-27

Applies
-------
* All nine tables in FK-dependency order (raw_events first, audit_log last).
* ``expected_net_amount`` as a ``GENERATED ALWAYS AS … STORED`` column —
  the database computes and stores it; the application never writes it.
  This enforces AGENTS.md rule 1 at the schema level.
* ``matches.posted`` defaults to ``false`` — nothing is committed until the
  required approval tier is recorded (rule 6).
* ``recon_app`` role with no UPDATE/DELETE on ``audit_log`` or on
  ``matches.posted`` rows — enforced at the DB grant level, not just the app
  (rule 3, and docs/07 §3 test matrix "Compensating entries" row).
* Unique constraints on every natural key — second idempotency layer.
* GIN index on ``raw_events.payload_raw`` for fast JSON searches.

Downgrade
---------
Tables dropped in reverse dependency order; ``recon_app`` role dropped last.
"""

from __future__ import annotations

from alembic import op

# Revision identifiers, used by Alembic.
revision: str = "001"
down_revision: str | None = None
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 0. Create least-privilege application role
    # ------------------------------------------------------------------
    # DO block prevents "role already exists" error on re-run (idempotent).
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'recon_app') THEN
                CREATE ROLE recon_app LOGIN PASSWORD 'recon_app_pw';
            END IF;
        END
        $$;
    """)

    # Grant connect + schema usage so the app can see the tables at all.
    op.execute("GRANT CONNECT ON DATABASE recon TO recon_app;")
    op.execute("GRANT USAGE ON SCHEMA public TO recon_app;")

    # ------------------------------------------------------------------
    # 1. raw_events — append-only, idempotent by (processor, id, type)
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE raw_events (
            id                  BIGSERIAL PRIMARY KEY,
            processor_id        TEXT NOT NULL,
            external_event_id   TEXT NOT NULL,
            event_type          TEXT NOT NULL,
            payload_hash        TEXT NOT NULL,
            payload_raw         JSONB NOT NULL,
            received_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (processor_id, external_event_id, event_type)
        );
    """)
    # B-tree index for fast duplicate-hash checks (first idempotency layer).
    op.execute("CREATE INDEX idx_raw_events_hash ON raw_events (payload_hash);")
    # GIN index so downstream queries can filter on JSONB fields without a seq scan.
    op.execute("CREATE INDEX idx_raw_events_payload ON raw_events USING GIN (payload_raw);")

    # ------------------------------------------------------------------
    # 2. canonical_transactions — gateway side (Side A)
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE canonical_transactions (
            id                          BIGSERIAL PRIMARY KEY,
            raw_event_id                BIGINT NOT NULL REFERENCES raw_events(id),
            processor_account_id        TEXT NOT NULL,
            external_transaction_id     TEXT NOT NULL,
            order_id                    TEXT,
            gross_amount                NUMERIC(18,2) NOT NULL,
            currency                    CHAR(3) NOT NULL DEFAULT 'INR',
            mdr_fee_pct                 NUMERIC(6,4),
            gst_rate                    NUMERIC(6,4) DEFAULT 0.1800,
            tds_amount                  NUMERIC(18,2) DEFAULT 0,
            expected_net_amount         NUMERIC(18,2) GENERATED ALWAYS AS (
                                            gross_amount
                                            - (gross_amount * COALESCE(mdr_fee_pct, 0))
                                            - (gross_amount * COALESCE(mdr_fee_pct, 0) * COALESCE(gst_rate, 0))
                                            - COALESCE(tds_amount, 0)
                                        ) STORED,
            status                      TEXT NOT NULL
                                            CHECK (status IN ('captured','refunded','chargeback','failed')),
            parent_transaction_id       BIGINT REFERENCES canonical_transactions(id),
            transaction_ts              TIMESTAMPTZ NOT NULL,
            created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (processor_account_id, external_transaction_id)
        );
    """)
    op.execute("CREATE INDEX idx_ct_order_id     ON canonical_transactions (order_id);")
    op.execute("CREATE INDEX idx_ct_transaction_ts ON canonical_transactions (transaction_ts);")
    op.execute("CREATE INDEX idx_ct_status         ON canonical_transactions (status);")
    op.execute("CREATE INDEX idx_ct_parent         ON canonical_transactions (parent_transaction_id) WHERE parent_transaction_id IS NOT NULL;")

    # ------------------------------------------------------------------
    # 3. bank_settlements — bank side (Side B)
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE bank_settlements (
            id                  BIGSERIAL PRIMARY KEY,
            raw_event_id        BIGINT NOT NULL REFERENCES raw_events(id),
            utr                 TEXT NOT NULL,
            settlement_batch_id TEXT NOT NULL,
            net_amount          NUMERIC(18,2) NOT NULL,
            currency            CHAR(3) NOT NULL DEFAULT 'INR',
            value_date          DATE NOT NULL,
            created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (utr, settlement_batch_id)
        );
    """)
    op.execute("CREATE INDEX idx_bs_value_date ON bank_settlements (value_date);")
    op.execute("CREATE INDEX idx_bs_utr        ON bank_settlements (utr);")

    # ------------------------------------------------------------------
    # 4. merchant_ledger_entries — merchant's own expected values (Side C)
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE merchant_ledger_entries (
            id               BIGSERIAL PRIMARY KEY,
            raw_event_id     BIGINT NOT NULL REFERENCES raw_events(id),
            order_id         TEXT NOT NULL,
            expected_amount  NUMERIC(18,2) NOT NULL,
            currency         CHAR(3) NOT NULL DEFAULT 'INR',
            status           TEXT NOT NULL
                                 CHECK (status IN ('pending','settled','disputed','cancelled')),
            created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)
    op.execute("CREATE INDEX idx_mle_order_id ON merchant_ledger_entries (order_id);")

    # ------------------------------------------------------------------
    # 5. matches — every match result (auditable core)
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE matches (
            id                  BIGSERIAL PRIMARY KEY,
            match_group_id      UUID NOT NULL DEFAULT gen_random_uuid(),
            matched_pass        TEXT NOT NULL
                                    CHECK (matched_pass IN (
                                        'pass1_exact',
                                        'pass2_tolerance',
                                        'pass3_refund',
                                        'pass4_split',
                                        'fellegi_sunter',
                                        'semantic_embedding'
                                    )),
            tier                TEXT NOT NULL CHECK (tier IN ('hootl','hotl','hitl')),
            confidence_score    NUMERIC(5,4),
            match_explanation   JSONB NOT NULL,
            posted              BOOLEAN NOT NULL DEFAULT false,
            created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)
    op.execute("CREATE INDEX idx_matches_tier       ON matches (tier);")
    op.execute("CREATE INDEX idx_matches_posted      ON matches (posted);")
    op.execute("CREATE INDEX idx_matches_pass        ON matches (matched_pass);")
    op.execute("CREATE INDEX idx_matches_group       ON matches (match_group_id);")

    # ------------------------------------------------------------------
    # 6. match_members — join table: which records belong to which match
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE match_members (
            match_id    BIGINT NOT NULL REFERENCES matches(id),
            record_type TEXT NOT NULL
                            CHECK (record_type IN (
                                'canonical_transaction',
                                'bank_settlement',
                                'merchant_ledger'
                            )),
            record_id   BIGINT NOT NULL,
            PRIMARY KEY (match_id, record_type, record_id)
        );
    """)
    op.execute("CREATE INDEX idx_mm_record ON match_members (record_type, record_id);")

    # ------------------------------------------------------------------
    # 7. exceptions — classified, not lumped
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE exceptions (
            id              BIGSERIAL PRIMARY KEY,
            record_type     TEXT NOT NULL
                                CHECK (record_type IN (
                                    'canonical_transaction',
                                    'bank_settlement',
                                    'merchant_ledger'
                                )),
            record_id       BIGINT NOT NULL,
            category        TEXT NOT NULL
                                CHECK (category IN (
                                    'timing_difference',
                                    'transaction_error',
                                    'bank_initiated',
                                    'unresolved'
                                )),
            dollar_value    NUMERIC(18,2) NOT NULL,
            status          TEXT NOT NULL DEFAULT 'open'
                                CHECK (status IN ('open','investigating','resolved')),
            resolution_note TEXT,
            resolved_by     TEXT,
            resolved_at     TIMESTAMPTZ,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)
    op.execute("CREATE INDEX idx_exc_status    ON exceptions (status);")
    op.execute("CREATE INDEX idx_exc_category  ON exceptions (category);")
    op.execute("CREATE INDEX idx_exc_record    ON exceptions (record_type, record_id);")

    # ------------------------------------------------------------------
    # 8. audit_log — every state change, no exceptions including Tier-1
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE audit_log (
            id           BIGSERIAL PRIMARY KEY,
            entity_type  TEXT NOT NULL
                             CHECK (entity_type IN ('match','exception','compensating_entry')),
            entity_id    BIGINT NOT NULL,
            action       TEXT NOT NULL
                             CHECK (action IN (
                                 'auto_matched',
                                 'pending_review',
                                 'approved',
                                 'rejected',
                                 'compensated',
                                 'exception_raised',
                                 'exception_resolved'
                             )),
            actor        TEXT NOT NULL,
            rationale    JSONB NOT NULL,
            occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)
    op.execute("CREATE INDEX idx_al_entity    ON audit_log (entity_type, entity_id);")
    op.execute("CREATE INDEX idx_al_actor     ON audit_log (actor);")
    op.execute("CREATE INDEX idx_al_occurred  ON audit_log (occurred_at);")

    # ------------------------------------------------------------------
    # 9. compensating_entries — corrections to posted rows, never UPDATE
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE compensating_entries (
            id                  BIGSERIAL PRIMARY KEY,
            original_match_id   BIGINT NOT NULL REFERENCES matches(id),
            reason              TEXT NOT NULL,
            amount_adjustment   NUMERIC(18,2) NOT NULL,
            created_by          TEXT NOT NULL,
            created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)
    op.execute("CREATE INDEX idx_ce_original_match ON compensating_entries (original_match_id);")

    # ------------------------------------------------------------------
    # 10. Grant least-privilege permissions to recon_app
    # ------------------------------------------------------------------
    # Tables the app may INSERT into but never UPDATE or DELETE.
    _append_only_tables = [
        "raw_events",
        "canonical_transactions",
        "bank_settlements",
        "merchant_ledger_entries",
        "matches",
        "match_members",
        "exceptions",
        "audit_log",
        "compensating_entries",
    ]
    for tbl in _append_only_tables:
        op.execute(f"GRANT SELECT, INSERT ON TABLE {tbl} TO recon_app;")
        op.execute(f"GRANT USAGE, SELECT ON SEQUENCE {tbl}_id_seq TO recon_app;")

    # exceptions.status / resolved_* fields are the one narrow update path
    # (open → investigating → resolved), but only those columns.
    # We model this as a stored-procedure call pattern (SECURITY DEFINER),
    # not a raw UPDATE grant. For now, restrict the app role to SELECT/INSERT
    # even here — the approval API will use the admin connection only for updates.
    # This can be relaxed with a dedicated SECURITY DEFINER function in 002.

    # matches.posted is the other narrow update path (false → true on approval).
    # Same approach: admin connection only until a SECURITY DEFINER fn is added.


def downgrade() -> None:
    # Drop in reverse FK dependency order.
    _tables = [
        "compensating_entries",
        "audit_log",
        "exceptions",
        "match_members",
        "matches",
        "merchant_ledger_entries",
        "bank_settlements",
        "canonical_transactions",
        "raw_events",
    ]
    for tbl in _tables:
        op.execute(f"DROP TABLE IF EXISTS {tbl} CASCADE;")

    # Revoke grants then drop the role.
    op.execute("REVOKE ALL ON SCHEMA public FROM recon_app;")
    op.execute("DROP ROLE IF EXISTS recon_app;")

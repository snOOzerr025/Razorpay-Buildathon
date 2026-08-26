# 03 — Data Model & Schema

Postgres-flavored DDL. Every table below is append-only unless explicitly noted — no
application-level `UPDATE`/`DELETE` on posted rows. Use a migration tool (Alembic/Prisma) from the
first commit, not ad hoc schema changes.

## 1. Raw ingestion layer (append-only, idempotent by content)

```sql
CREATE TABLE raw_events (
    id                  BIGSERIAL PRIMARY KEY,
    processor_id        TEXT NOT NULL,          -- e.g. 'razorpay_gateway', 'hdfc_bank', 'merchant_erp'
    external_event_id   TEXT NOT NULL,
    event_type          TEXT NOT NULL,           -- 'payment.captured', 'settlement.batch', 'ledger.entry', etc.
    payload_hash        TEXT NOT NULL,           -- sha256 of raw payload, for duplicate-content detection
    payload_raw         JSONB NOT NULL,          -- full original payload, preserved verbatim for audit
    received_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (processor_id, external_event_id, event_type)
);
CREATE INDEX idx_raw_events_hash ON raw_events (payload_hash);
```

## 2. Canonical / normalized layer

```sql
CREATE TABLE canonical_transactions (       -- Side A: gateway transactions
    id                     BIGSERIAL PRIMARY KEY,
    raw_event_id           BIGINT NOT NULL REFERENCES raw_events(id),
    processor_account_id   TEXT NOT NULL,
    external_transaction_id TEXT NOT NULL,
    order_id               TEXT,
    gross_amount            NUMERIC(18,2) NOT NULL,
    currency                CHAR(3) NOT NULL DEFAULT 'INR',
    mdr_fee_pct              NUMERIC(6,4),
    gst_rate                NUMERIC(6,4) DEFAULT 0.18,
    tds_amount               NUMERIC(18,2) DEFAULT 0,
    expected_net_amount       NUMERIC(18,2) GENERATED ALWAYS AS
        (gross_amount - (gross_amount * COALESCE(mdr_fee_pct,0))
         - (gross_amount * COALESCE(mdr_fee_pct,0) * COALESCE(gst_rate,0))
         - COALESCE(tds_amount,0)) STORED,
    status                   TEXT NOT NULL,      -- captured | refunded | chargeback | failed
    parent_transaction_id    BIGINT REFERENCES canonical_transactions(id), -- for refunds: points to original charge
    transaction_ts            TIMESTAMPTZ NOT NULL,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (processor_account_id, external_transaction_id)
);

CREATE TABLE bank_settlements (              -- Side B: bank settlement batches
    id                     BIGSERIAL PRIMARY KEY,
    raw_event_id            BIGINT NOT NULL REFERENCES raw_events(id),
    utr                      TEXT NOT NULL,      -- Unique Transaction Reference from bank
    settlement_batch_id       TEXT NOT NULL,
    net_amount                 NUMERIC(18,2) NOT NULL,
    currency                    CHAR(3) NOT NULL DEFAULT 'INR',
    value_date                   DATE NOT NULL,
    created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (utr, settlement_batch_id)
);

CREATE TABLE merchant_ledger_entries (        -- Side A: merchant's own expected-value ledger
    id                     BIGSERIAL PRIMARY KEY,
    raw_event_id            BIGINT NOT NULL REFERENCES raw_events(id),
    order_id                 TEXT NOT NULL,
    expected_amount            NUMERIC(18,2) NOT NULL,
    currency                    CHAR(3) NOT NULL DEFAULT 'INR',
    status                       TEXT NOT NULL,
    created_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 3. Matching output — the auditable core

```sql
CREATE TABLE matches (
    id                  BIGSERIAL PRIMARY KEY,
    match_group_id       UUID NOT NULL DEFAULT gen_random_uuid(), -- groups N-to-1 split matches together
    matched_pass          TEXT NOT NULL,     -- 'pass1_exact' | 'pass2_tolerance' | 'pass3_refund' |
                                              -- 'pass4_split' | 'fellegi_sunter' | 'semantic_embedding'
    tier                   TEXT NOT NULL,     -- 'hootl' | 'hotl' | 'hitl'
    confidence_score        NUMERIC(5,4),      -- null for deterministic exact matches (n/a, not uncertain)
    match_explanation        JSONB NOT NULL,    -- structured schema, see §5 below
    posted                    BOOLEAN NOT NULL DEFAULT false,  -- false until required approval recorded
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE match_members (        -- join table: which raw records belong to which match
    match_id              BIGINT NOT NULL REFERENCES matches(id),
    record_type            TEXT NOT NULL,   -- 'canonical_transaction' | 'bank_settlement' | 'merchant_ledger'
    record_id               BIGINT NOT NULL,
    PRIMARY KEY (match_id, record_type, record_id)
);
```

## 4. Exceptions — classified by reconciling-item type, not lumped together

```sql
CREATE TABLE exceptions (
    id                    BIGSERIAL PRIMARY KEY,
    record_type            TEXT NOT NULL,
    record_id               BIGINT NOT NULL,
    category                 TEXT NOT NULL,  -- 'timing_difference' | 'transaction_error' |
                                              -- 'bank_initiated' | 'unresolved'
    dollar_value              NUMERIC(18,2) NOT NULL,
    status                     TEXT NOT NULL DEFAULT 'open', -- open | investigating | resolved
    resolution_note              TEXT,
    resolved_by                   TEXT,
    resolved_at                    TIMESTAMPTZ,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 5. Audit log — every state change, no exceptions (including Tier 1 auto-matches)

```sql
CREATE TABLE audit_log (
    id                 BIGSERIAL PRIMARY KEY,
    entity_type          TEXT NOT NULL,      -- 'match' | 'exception' | 'compensating_entry'
    entity_id              BIGINT NOT NULL,
    action                    TEXT NOT NULL,   -- 'auto_matched' | 'approved' | 'rejected' | 'compensated'
    actor                       TEXT NOT NULL,  -- 'system:pass1_engine' | 'user:<reviewer_id>'
    rationale                     JSONB NOT NULL,
    occurred_at                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE compensating_entries (   -- corrections to already-posted rows, never a destructive edit
    id                  BIGSERIAL PRIMARY KEY,
    original_match_id     BIGINT NOT NULL REFERENCES matches(id),
    reason                   TEXT NOT NULL,
    amount_adjustment          NUMERIC(18,2) NOT NULL,
    created_by                   TEXT NOT NULL,
    created_at                     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 6. `match_explanation` structured schema (stored, not just rendered)

```json
{
  "pass": "pass4_split",
  "field_agreement": {
    "currency": {"agree": true, "weight": null},
    "amount": {"agree": true, "subset_sum_verified": true, "delta": 0.0},
    "date_window_days": 1
  },
  "fellegi_sunter": {
    "m_probabilities": {"amount": 0.97, "reference": 0.62},
    "u_probabilities": {"amount": 0.02, "reference": 0.001},
    "bayes_factor": {"amount": 48.5, "reference": 620.0},
    "log_weight_sum": 12.34,
    "threshold_upper": 10.0,
    "threshold_lower": -4.0,
    "classification": "auto_match"
  },
  "semantic": {
    "embedding_model": "text-embedding-3-small",
    "cosine_similarity": 0.94,
    "compared_fields": ["vendor_description"]
  },
  "human_readable_summary": "Batch of 47 transactions on 2026-08-19 sums to settlement UTR X within ₹0.02 rounding tolerance."
}
```
`fellegi_sunter` and `semantic` sub-objects are omitted (not null-filled) when a match was resolved
by a deterministic pass — don't fabricate statistical fields for matches that didn't need them.

# 02 — System Architecture & Engineering Specification

> **Consolidated Spec**: Merges System Architecture, Database Schema, Matching Engine Specification, AI Guardrails, REST API Specification, and Live AI Explanation Samples into a single authoritative technical reference.

---

## Section 1: System Architecture & Design Principles

### 1. Continuous Close vs. Batch Reconciliation
The system is architected around a **continuous close** model: incoming records trigger incremental reconciliation passes against active candidate pools, producing immediate throughput and real-time exception visibility rather than waiting for nightly batch scripts.

Reconciliation terminology:
- **Side A (Internal Records)**: Gateway transactions (`canonical_transactions`) and merchant ledger entries (`merchant_ledger_entries`).
- **Side B (External Records)**: Bank settlement statements (`bank_settlements`).
- **Reconciling Items**: Discrepancies classified strictly into:
  1. *Timing Differences*: Gateway captures pending T+1/T+2 bank settlement.
  2. *Transaction Errors/Omissions*: Amount discrepancies or missing counterparty records requiring compensating entries.
  3. *Bank-Initiated Items*: Unilateral bank charges (MDR adjustments, chargeback fees, interest credits).

### 2. The Three-Way Domain & Fee Formula
```
Gateway Transactions (Side A)          Bank Settlements (Side B)          Merchant Ledger (Side A)
─────────────────────────────          ─────────────────────────          ────────────────────────
payment_id                             utr (bank reference)               order_id
order_id                               settlement_batch_id                expected_amount
gross_amount                           net_amount (batched)               currency
mdr_fee_pct                            value_date                         status
gst_on_fee (18%)                       ↕ batched 1:N
status (captured/refunded/failed)
```

**Canonical Settlement Formula (Deterministic — LLM Forbidden)**:
$$\text{expected\_net} = \text{gross} - (\text{gross} \times \text{mdr\_pct}) - (\text{gross} \times \text{mdr\_pct} \times \text{gst\_rate}) - \text{tds}$$

### 3. End-to-End Pipeline Diagram
```
┌────────────────────────────────────────────────────────────────────────┐
│ INGESTION LAYER                                                        │
│  Gateway webhook/CSV, Bank file, Merchant ERP                          │
│  → Two-Layer Idempotency (SHA-256 Content Hash + DB Unique Key)        │
│  → Normalization → canonical_transactions / bank_settlements           │
├────────────────────────────────────────────────────────────────────────┤
│ DETERMINISTIC MATCHING ENGINE (5 Sequential Passes)                   │
│  Pass 1: Exact Match (1:1 strict parity)                              │
│  Pass 2: Tolerance-Aware (date window + MDR/GST normalization)         │
│  Pass 3: Refund/Reversal Linkage (binds refunds to parent charge)      │
│  Pass 4: Split/Roll-up (bounded subset-sum for batched settlements)    │
│  Pass 5: Exception Queue Categorization                               │
├────────────────────────────────────────────────────────────────────────┤
│ PROBABILISTIC & SEMANTIC AI LAYER (Residuals Only)                     │
│  Hard-Field Blocking (Currency, Amount Band, Date Window)              │
│  → Fellegi-Sunter Record Linkage (m/u Bayes factor weights)            │
│  → Embedding Cosine Similarity (Vendor narration semantic drift)       │
│  → Composite Confidence Score Calculation                              │
├────────────────────────────────────────────────────────────────────────┤
│ RISK TIERING & SOX-COMPLIANT MUTATION CONTROL                          │
│  Tier 1 (HOOTL): Auto-commit & write immutable audit log               │
│  Tier 2 (HOTL): Auto-prepare, dashboard visible, post with lag         │
│  Tier 3 (HITL): Draft match, holds state mutation until human sign-off │
├────────────────────────────────────────────────────────────────────────┤
│ SHIELDA STRUCTURED EXCEPTION RECOVERY                                  │
│  Local Retry → Flow Skip → Pre-commit Rollback / Post-commit Comp Entry│
└────────────────────────────────────────────────────────────────────────┘
```

---

## Section 2: Data Model & Schema (Postgres DDL)

All tables operate under **append-only invariants**. Destructive `UPDATE` or `DELETE` on posted rows is prohibited.

```sql
-- 1. Raw Ingestion Layer (Append-only, idempotent by content)
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
CREATE INDEX idx_raw_events_hash ON raw_events (payload_hash);

-- 2. Canonical Gateway Transactions
CREATE TABLE canonical_transactions (
    id                      BIGSERIAL PRIMARY KEY,
    raw_event_id            BIGINT NOT NULL REFERENCES raw_events(id),
    processor_account_id    TEXT NOT NULL,
    external_transaction_id TEXT NOT NULL,
    order_id                TEXT,
    gross_amount            NUMERIC(18,2) NOT NULL,
    currency                CHAR(3) NOT NULL DEFAULT 'INR',
    mdr_fee_pct             NUMERIC(6,4),
    gst_rate                NUMERIC(6,4) DEFAULT 0.18,
    tds_amount              NUMERIC(18,2) DEFAULT 0,
    expected_net_amount     NUMERIC(18,2) GENERATED ALWAYS AS
        (gross_amount - (gross_amount * COALESCE(mdr_fee_pct,0))
         - (gross_amount * COALESCE(mdr_fee_pct,0) * COALESCE(gst_rate,0))
         - COALESCE(tds_amount,0)) STORED,
    status                  TEXT NOT NULL, -- captured | refunded | chargeback | failed
    parent_transaction_id   BIGINT REFERENCES canonical_transactions(id),
    transaction_ts          TIMESTAMPTZ NOT NULL,
    match_status            TEXT NOT NULL DEFAULT 'unmatched',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (processor_account_id, external_transaction_id)
);
CREATE INDEX idx_canonical_tx_match ON canonical_transactions(match_status);
CREATE INDEX idx_canonical_tx_parent ON canonical_transactions(parent_transaction_id);

-- 3. Bank Settlements
CREATE TABLE bank_settlements (
    id                      BIGSERIAL PRIMARY KEY,
    raw_event_id            BIGINT NOT NULL REFERENCES raw_events(id),
    utr                     TEXT NOT NULL,
    settlement_batch_id     TEXT NOT NULL,
    net_amount              NUMERIC(18,2) NOT NULL,
    currency                CHAR(3) NOT NULL DEFAULT 'INR',
    value_date              DATE NOT NULL,
    match_status            TEXT NOT NULL DEFAULT 'unmatched',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (utr, settlement_batch_id)
);
CREATE INDEX idx_bank_settlements_match ON bank_settlements(match_status);

-- 4. Merchant Ledger Entries
CREATE TABLE merchant_ledger_entries (
    id                      BIGSERIAL PRIMARY KEY,
    raw_event_id            BIGINT NOT NULL REFERENCES raw_events(id),
    order_id                TEXT NOT NULL,
    expected_amount         NUMERIC(18,2) NOT NULL,
    currency                CHAR(3) NOT NULL DEFAULT 'INR',
    status                  TEXT NOT NULL DEFAULT 'pending',
    entry_ts                TIMESTAMPTZ NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (order_id)
);

-- 5. Matches Table
CREATE TABLE matches (
    id                      BIGSERIAL PRIMARY KEY,
    match_pass              TEXT NOT NULL, -- pass1_exact | pass2_tolerance | pass3_refund | pass4_split | fellegi_sunter | semantic
    tier                    TEXT NOT NULL, -- hootl | hotl | hitl
    status                  TEXT NOT NULL, -- confirmed | pending_hotl | pending_hitl | rejected
    confidence_score        NUMERIC(5,4) NOT NULL,
    explanation             JSONB NOT NULL,
    matched_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_by             TEXT,
    reviewed_at             TIMESTAMPTZ
);

-- 6. Match Members (Join Table)
CREATE TABLE match_members (
    id                      BIGSERIAL PRIMARY KEY,
    match_id                BIGINT NOT NULL REFERENCES matches(id),
    entity_type             TEXT NOT NULL, -- canonical_transaction | bank_settlement | merchant_ledger
    entity_id               BIGINT NOT NULL,
    dollar_value            NUMERIC(18,2) NOT NULL
);

-- 7. Exceptions Queue
CREATE TABLE exceptions (
    id                      BIGSERIAL PRIMARY KEY,
    entity_type             TEXT NOT NULL,
    entity_id               BIGINT NOT NULL,
    category                TEXT NOT NULL, -- timing_difference | transaction_error | bank_initiated | unresolved
    status                  TEXT NOT NULL DEFAULT 'open', -- open | under_review | resolved
    dollar_value            NUMERIC(18,2) NOT NULL,
    reason                  TEXT NOT NULL,
    suggested_action        TEXT,
    explanation             JSONB,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at             TIMESTAMPTZ,
    resolved_by             TEXT
);

-- 8. Forensic Audit Log (Strictly Append-Only)
CREATE TABLE audit_log (
    id                      BIGSERIAL PRIMARY KEY,
    entity_type             TEXT NOT NULL,
    action                  TEXT NOT NULL,
    actor                   TEXT NOT NULL,
    rationale               TEXT NOT NULL,
    metadata                JSONB,
    occurred_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Compensating Entries (Corrections without destructive deletion)
CREATE TABLE compensating_entries (
    id                      BIGSERIAL PRIMARY KEY,
    original_match_id       BIGINT NOT NULL REFERENCES matches(id),
    reversing_entry_type    TEXT NOT NULL,
    reversing_entity_id     BIGINT NOT NULL,
    amount                  NUMERIC(18,2) NOT NULL,
    reason                  TEXT NOT NULL,
    approved_by             TEXT NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Section 3: Matching Engine Specification (5-Pass Cascade)

Each pass runs exclusively against the residual items left unmatched by earlier passes.

```
Incoming Unmatched Records
          │
          ▼
   Pass 1: Exact Match (1:1) ─────────────────► [Matched: Tier 1 HOOTL]
          │ (unmatched)
          ▼
   Pass 2: Tolerance-Aware (Lag + MDR) ───────► [Matched: Tier 1/2]
          │ (unmatched)
          ▼
   Pass 3: Refund/Reversal Linkage ───────────► [Matched: Tier 2 HOTL]
          │ (unmatched)
          ▼
   Pass 4: Bounded Subset-Sum Split ──────────► [Matched: Tier 2 HOTL]
          │ (unmatched)
          ▼
   Pass 5: Exception Routing
          │
          ├───► Probabilistic / Semantic Matching (Fellegi-Sunter + Embeddings)
          │
          └───► Structured Exception Queue (Timing / Deductions / Errors / Unresolved)
```

### Pass Details
1. **Pass 1 — Exact Match**:
   - Identical processor account, currency, net amount to the cent, exact reference code match, transaction date within $\pm 1$ day.
   - Assigned to **Tier 1 (HOOTL)**: auto-posted and logged immediately.
2. **Pass 2 — Tolerance-Aware**:
   - Compares gateway `expected_net_amount` to bank `net_amount`.
   - Date window within $T+0$ to $T+3$ days. Uses hash-bucket candidate indexing for $O(1)$ lookup time, avoiding $O(N \times M)$ scans.
3. **Pass 3 — Refund & Chargeback Linkage**:
   - Matches records with `status IN ('refunded', 'chargeback')` back to their `parent_transaction_id`.
   - Ensures the refund amount does not exceed the original captured charge.
4. **Pass 4 — Batched Settlement Roll-Up (Subset-Sum)**:
   - Untangles 1-to-N batching where a single bank deposit equals the sum of multiple gateway transactions.
   - Solved via a **Bounded Dynamic Programming Subset-Sum**:
     - Candidates are grouped by date windows and processor account.
     - Hard safety cap of 50,000 states prevents exponential combinatorial explosion.
     - Ambiguous cases (two subsets totaling the exact same amount) are deliberately routed to the exception queue rather than guessed.
5. **Pass 5 — Exception Queue & Probabilistic Residuals**:
   - residual records are passed to the probabilistic Fellegi-Sunter engine. Items that remain unresolved are classified into exception categories.

---

## Section 4: Probabilistic & Semantic AI Layer

### 1. Fellegi-Sunter Mathematical Formulation
For any candidate pair $(A, B)$, let $\gamma = (\gamma_1, \dots, \gamma_J)$ be the agreement vector across $J$ comparison fields:
- **$m$-probability**: $m_j = P(\gamma_j = 1 \mid \text{pair is a true match})$
- **$u$-probability**: $u_j = P(\gamma_j = 1 \mid \text{pair is NOT a match})$
- **Field Weight**:
  $$w_j = \begin{cases} \log_2\left(\frac{m_j}{u_j}\right) & \text{if } \gamma_j = 1 \\ \log_2\left(\frac{1 - m_j}{1 - u_j}\right) & \text{if } \gamma_j = 0 \end{cases}$$
- **Composite Score**: $W = \sum_{j=1}^J w_j$

**Decision Rules**:
- $W \ge T_{\text{upper}}$: Classified as match (Tier 2 HOTL or Tier 3 HITL depending on confidence).
- $W \le T_{\text{lower}}$: Definitively rejected, retained in exception queue.
- $T_{\text{lower}} < W < T_{\text{upper}}$: Escalated to HITL manual review with field-level weight breakdown.

### 2. Hard-Field Blocking & Semantic Embeddings
To maintain low latency and eliminate unnecessary API costs, the system executes **Blocking** before invoking text similarity:
- Candidate pairs must match on: `Currency` + `Amount Band` ($\pm 2\%$) + `Date Window` ($\pm 4$ days).
- Cosine similarity between text embeddings of vendor descriptions and bank narrations is converted into a normalized weight and integrated into the composite score.

### 3. Live AI Exception Explanation Samples

#### Example 1: Narration Typo / Semantic Drift
**Sanitized Input Payload**:
```json
{
  "context": "Evaluate candidate match for exception routing.",
  "gateway_transaction": {
    "id": "tx_29910",
    "amount": "1450.00",
    "date": "2026-08-27T14:30:00Z",
    "vendor_reference": "AWS Cloud Services India"
  },
  "bank_settlement": {
    "id": "bk_99321",
    "amount": "1450.00",
    "date": "2026-08-28T09:15:00Z",
    "narration": "NEFT/AMAZON WEB SVS IND/AWS9302"
  }
}
```
**AI Explanation Output (Surfaced on HITL Review Panel)**:
```json
{
  "semantic_confidence": 0.94,
  "match_decision": "Draft for HITL Review",
  "explanation": "High confidence semantic match. The bank settlement narration 'AMAZON WEB SVS IND' is a known abbreviation for 'AWS Cloud Services India'. The exact net amount (INR 1450.00) matches precisely, and the settlement occurred on T+1, which aligns with expected timing logic. Recommended action: Approve match."
}
```

#### Example 2: Bank-Initiated Fee Deduction
**Sanitized Input Payload**:
```json
{
  "context": "Categorize unmatched bank settlement.",
  "bank_settlement": {
    "id": "bk_99405",
    "amount": "-250.00",
    "date": "2026-08-28T11:00:00Z",
    "narration": "MONTHLY ACC MAINT CHG"
  }
}
```
**AI Explanation Output**:
```json
{
  "semantic_confidence": 0.98,
  "match_decision": "Categorize as Bank-Initiated Exception",
  "explanation": "This record has no corresponding gateway transaction because it is a bank-initiated deduction. The narration 'MONTHLY ACC MAINT CHG' semantically maps to standard account maintenance fees. Recommended action: Post as an operational expense via a compensating journal entry, do not attempt to reconcile against gateway captures."
}
```

#### Example 3: Ambiguous Roll-Up (State-Cap Abort)
**Sanitized Input Payload**:
```json
{
  "context": "Provide explanation for Pass 4 bounded abort.",
  "bank_settlement": {
    "id": "bk_99500",
    "amount": "45000.00",
    "date": "2026-08-28T16:00:00Z",
    "narration": "RAZORPAY SETTLEMENT BATCH 882"
  },
  "unmatched_gateway_count": 894,
  "gateway_average_amount": "50.00"
}
```
**AI Explanation Output**:
```json
{
  "semantic_confidence": 1.0,
  "match_decision": "Exception - Ambiguous Roll-up",
  "explanation": "The matching engine successfully verified that this bank batch (INR 45,000.00) is a subset sum of the 894 pending gateway transactions, but halted deterministic linking because there are multiple valid groupings (exceeding the 50,000 state safety cap). The ambiguity arises from hundreds of identical INR 50.00 transactions. Recommended action: Wait for the subsequent bank batch to arrive to isolate the remaining pool, or approve block-level reconciliation rather than record-level linkage."
}
```

---

## Section 5: AI Guardrails, SHIELDA Recovery & Security

### 1. Sanitization Pipeline
Before external narration strings reach any prompt template:
1. Strict regex extraction of dates, currency figures, and alphanumeric references.
2. Truncation to 140 characters maximum.
3. If $>50\%$ of the string contains prohibited symbols or instruction-like tokens, the record is quarantined and flagged as a security alert.

### 2. SHIELDA Structured Exception Recovery
1. **Local Handling**: Corrective re-prompting on malformed schema outputs.
2. **Flow Control**: Record-level skip-and-continue to prevent batch aborts on isolated errors.
3. **State Recovery**:
   - Open uncommitted transactions: Issue `ROLLBACK`.
   - Committed records: Create `compensating_entries` row; never mutate historical rows.
4. **Escalation**: Forward unrecoverable failures to the HITL exception queue with full forensic stack trace.

---

## Section 6: REST API Specification

All endpoints require `Authorization: Bearer <token>` and return consistent JSON envelopes.

### Ingestion Endpoints
- **`POST /api/v1/ingest/raw-event`**: Ingests raw events. Deduplicates via SHA-256 payload hash and returns `{ "raw_event_id": 8842, "status": "queued_for_normalization" }`.

### Reconciliation Engine Endpoints
- **`POST /api/v1/reconcile/run`**: Triggers execution across unmatched pools.
  - Body: `{ "scope": "incremental" | "full" }`
  - Response: `{ "run_id": "run_01", "status": "completed", "records_processed": 110377, "duration_ms": 3200, "throughput_per_sec": 1130 }`
- **`GET /api/v1/reconcile/runs/{run_id}`**: Retrieves real-time run progress and pass breakdowns.

### Matches & Approval Endpoints
- **`GET /api/v1/matches?tier=hitl&status=pending_hitl`**: Lists matches pending human review.
- **`GET /api/v1/matches/{id}`**: Returns match details and the structured explanation.
- **`POST /api/v1/matches/{id}/approve`**: Approves a Tier 3 match, transitions state, and logs the reviewer's ID.
- **`POST /api/v1/matches/{id}/reject`**: Rejects a candidate match, moving items to `exceptions`.

### Exception Queue Endpoints
- **`GET /api/v1/exceptions?category=bank_initiated&status=open`**: Lists active exceptions.
- **`POST /api/v1/exceptions/{id}/resolve`**: Resolves an exception with an explanatory note.
- **`POST /api/v1/exceptions/{id}/compensate`**: Generates a compensating journal entry.

### Dashboard Reporting Endpoint
- **`GET /api/v1/dashboard/metrics`**:
  ```json
  {
    "total_processed": 110377,
    "matched_count": 79794,
    "automated_match_rate": 72.29,
    "exceptions_count": 30583,
    "throughput_per_sec": 1130,
    "net_discrepancy_value": 0.0,
    "exceptions_by_category": {
      "unresolved": 16573,
      "timing_difference": 10383,
      "bank_initiated": 3431,
      "transaction_error": 196
    }
  }
  ```

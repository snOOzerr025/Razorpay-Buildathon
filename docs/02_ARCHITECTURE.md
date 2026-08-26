# 02 — System Architecture

## 0. Framing: continuous close, not periodic reconciliation
Design this as a **continuous close** system — every new record triggers incremental matching
against the existing pool, not a batch job run once a day. This is both the more defensible
architecture and the one that actually produces a live throughput number for the demo, rather than
a single offline script run.

Standard reconciliation terminology used throughout this doc and the code: **Side A** = internal
records (gateway transactions + merchant ledger), **Side B** = external records (bank settlement
statements). Reconciling items are discrepancies between the two, and fall into three types the
exception queue must classify explicitly, not lump together:
- **Timing differences** — recorded on one side, not yet processed on the other (e.g., a payment
  captured by the gateway but not yet in the T+1/T+2 bank settlement batch). Self-resolving; track,
  don't panic.
- **Transaction errors/omissions** — genuine mismatches: wrong amount, missing entry, duplicate
  posting. Require investigation and a compensating entry.
- **Bank-initiated items** — fees, interest credits, or deductions the bank applies unilaterally,
  with no corresponding merchant-side record until reconciled against an expected fee schedule.

## 1. The domain, precisely (this is the upgrade from generic bank-GL recon)
Three sources, not two:

```
Gateway Transaction (Side A)          Bank Settlement (Side B)         Merchant Ledger (Side A)
─────────────────────────────         ─────────────────────────        ────────────────────────
payment_id                            utr (bank reference)              order_id
order_id                              settlement_batch_id               expected_amount
gross_amount                          net_amount (batched)              currency
mdr_fee_pct                           value_date                        status
gst_on_fee (18%)                      ↕ often 1 batch = N transactions
tds (if applicable)
status (captured/refunded/failed)
```

**Expected settlement amount** (the deterministic calculation the LLM must never perform):
```
expected_net = gross_amount − (gross_amount × mdr_fee_pct) − (gross_amount × mdr_fee_pct × gst_rate) − tds_if_applicable
```
A settlement batch's net amount should equal the sum of `expected_net` across every gateway
transaction in that batch. This single formula is what makes Pass 4 (split/roll-up matching) work —
without it, you're guessing at subset sums instead of verifying them.

## 2. Architecture diagram

```
┌──────────────────────────────────────────────────────────────────┐
│ INGESTION LAYER                                                    │
│  Gateway webhook/CSV → raw_events (append-only, idempotent)        │
│  Bank settlement file → raw_events                                 │
│  Merchant ledger export → raw_events                                │
│  → Normalization → canonical_transactions / bank_settlements /      │
│    merchant_ledger_entries                                          │
├──────────────────────────────────────────────────────────────────┤
│ DETERMINISTIC MATCHING ENGINE (5 sequential passes)                 │
│  Pass 1 Exact → Pass 2 Tolerance → Pass 3 Refund/Reversal →          │
│  Pass 4 Split/Roll-up → Pass 5 route remainder to exception queue   │
├──────────────────────────────────────────────────────────────────┤
│ PROBABILISTIC + SEMANTIC LAYER (only for Pass 5 residuals)          │
│  Blocking (hard fields: currency, amount band, date window)         │
│  → Fellegi-Sunter scoring → embedding cosine similarity for text     │
│  → composite confidence score                                        │
├──────────────────────────────────────────────────────────────────┤
│ RISK TIERING + SHIELDA EXCEPTION HANDLING                            │
│  HOOTL (auto-post + log) / HOTL (auto-prepare, dashboard-monitored)  │
│  / HITL (draft, explicit human approval required before posting)    │
│  Structured error classification + 3-stage recovery + escalation    │
├──────────────────────────────────────────────────────────────────┤
│ API LAYER  (docs/06_API_SPEC.md)                                    │
├──────────────────────────────────────────────────────────────────┤
│ DASHBOARD — match rate, throughput, exception list, confidence dist │
└──────────────────────────────────────────────────────────────────┘
```

## 3. Two-layer idempotency (prevents duplicate processing at both stages)
- **Raw layer**: uniqueness enforced on `(processor_id, external_event_id, event_type)` plus a
  content hash of the payload — a retried webhook can never be recorded twice, even before
  normalization has happened.
- **Canonical layer**: uniqueness enforced on `(processor_account_id, external_transaction_id)` once
  a raw event has been transformed into a normalized, ledger-ready record.

Full DDL in `03_DATA_MODEL.md`.

## 4. Division of labor (the non-negotiable boundary)
| Layer | Does | Never does |
|---|---|---|
| Deterministic code | All arithmetic, all matching decisions for Passes 1–4, all ledger writes | Never "asks" an LLM what a number is |
| Fellegi-Sunter (statistical) | Composite match probability from field agreement patterns | Never overrides a Pass 1–4 deterministic result |
| LLM / embeddings | Semantic similarity of text fields, drafting human-readable explanations, reading unstructured remittance text | Never computes totals, fees, tax, or posts to the ledger directly |

## 5. Compensating entries, precisely (resolves the "rollback" ambiguity)
Two different mechanisms, both loosely called "rollback" — keep them distinct in code and in the
pitch, because a panelist will ask:
- **Transactional rollback** (`BEGIN ... ROLLBACK`): for an *uncommitted* multi-step write that
  fails partway (e.g., agent times out mid-write). Standard, safe, reversible — nothing has been
  read by anything else yet.
- **Compensating entry**: for correcting an *already-committed, posted* record. Never `UPDATE` or
  `DELETE` a posted row. Insert a new row that references the original and nets it out. This is
  what makes the audit trail reconstructable — an auditor can see both the mistake and the fix.

## 6. Explainability as a stored artifact, not just a UI label
Every match record stores a structured `match_explanation` JSON object (schema in
`03_DATA_MODEL.md`) — which pass or model produced the match, the field-level agreement vector, the
Fellegi-Sunter weight if applicable, the embedding similarity score if applicable. The UI renders
this; it doesn't invent it at render time.

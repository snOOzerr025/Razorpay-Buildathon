# 01 — Product Requirements & Gap Analysis

> **Consolidated Spec**: Merges and synthesizes the Product Requirements Document (`PRD`) and the Architectural `Gap Analysis`. This document details the problem statement, scope boundaries, target metrics, and the rationale behind all non-obvious engineering decisions.

---

## Part 1: Product Requirements (PRD)

### 1. Problem Statement
Payment reconciliation — matching what a gateway processed, what a bank actually settled, and what a merchant's own ledger expects — is still performed largely by hand across the payments industry. Manual verification capacity, not generation speed, is the primary operational bottleneck in modern finance operations. 

This project builds an AI-assisted, continuous-close reconciliation engine for a three-way payment flow. It pairs a strict, deterministic 5-pass matching core with a probabilistic and semantic AI layer applied strictly when deterministic logic cannot resolve a match.

- **Track**: AI Finance Controller (Razorpay AI Buildathon)
- **Primary Direction**: Multi-source three-way payment reconciliation (Gateway ↔ Bank Settlement ↔ Merchant Ledger).
- **Secondary / Stretch Direction**: Settlement-lag data structured to power forward cash forecasting.

---

### 2. The Judging Bar
Razorpay’s judging criteria explicitly prioritizes:
> **"Throughput plus measured accuracy plus an honest exception list."**

A system that hides failure modes behind a cherry-picked 50-row demo is scored worse than a production-grade engine that transparently surfaces, categorizes, and audits exceptions. Every requirement in this system traces directly back to this standard.

---

### 3. User Personas
1. **Finance Controller / Reconciliation Reviewer**:
   - Manages the exception queue.
   - Approves or rejects Tier 2 (HOTL) and Tier 3 (HITL) matches.
   - Requires transparent confidence breakdowns and human-readable audit explanations before signing off on ledger state mutations.
2. **Panel Judge / Technical Auditor**:
   - Evaluates system throughput at scale (10,000+ to 100,000+ records).
   - Audits architectural integrity, mathematical determinism, and append-only database immutability.
   - Verifies the exception queue as a first-class operational artifact.

---

### 4. Scope Boundaries

#### In-Scope
1. **Three-Source Ingestion**: Ingests Gateway transaction records, Bank settlement records (batched, UTR-referenced), and Merchant internal ledger entries.
2. **Deterministic 5-Pass Matching Engine**: Exact → Tolerance-aware → Refund/Reversal linkage → Bounded Subset-Sum Split/Roll-up → Exception Routing.
3. **Probabilistic & Semantic Layer**: Fellegi-Sunter record linkage and embedding cosine similarity for Pass 5 residuals, gated behind hard-field blocking.
4. **Risk-Tiered Human-in-the-Loop Workflow**: HOOTL (Human-Out-of-the-Loop), HOTL (Human-on-the-Loop), and HITL (Human-in-the-Loop) approval rules.
5. **Forensic Exception Queue**: Structured classification into Timing Differences, Transaction Errors, Bank-Initiated Items, and Unresolved Items.
6. **Executive Dashboard**: Real-time KPI reporting on total processed, match rate, throughput (records/sec), net discrepancy value, and confidence score distribution.
7. **Synthetic Data Generator**: Parametric generator with realistic anomaly injection (timing shifts, string corruption, prompt injections, batch fragmentation).

#### Explicitly Out-of-Scope (Scoping Discipline)
- **Live Bank / Gateway API Connections**: Synthetic data only (simulated CSVs/webhooks) to ensure complete reproducibility.
- **Multi-Currency / FX Conversion**: INR-only for v1.
- **Statutory / Tax Filing Generation**: Regulatory report drafting is omitted to focus strictly on transaction reconciliation.
- **Enterprise SSO / Identity Providers**: Scoped API token and JWT authentication are implemented in place of full SAML/OAuth.

---

### 5. Success Metrics & Non-Functional Requirements
- **Throughput Target**: Sustained >1,000 records/sec at 10,000+ to 110,000+ records.
- **Automated Match Rate**: >70% autonomous resolution without human intervention.
- **Precision vs Ground Truth**: >90% precision against injected synthetic ground truth.
- **Audit Logging**: 100% of state mutations and match decisions write an immutable row to `audit_log`.
- **Zero Arithmetic Hallucination**: 0 LLM arithmetic calls; deterministic code handles all money, fee, and tax math.

---

### 6. Functional Traceability Matrix

| Requirement | Engine Mechanism | Risk Tier | Mutation Rule |
|---|---|---|---|
| Exact 1:1 Settlement | Pass 1: Exact Match | Tier 1 (HOOTL) | Immediate Auto-Post & Audit Log |
| Timing & MDR Variance | Pass 2: Tolerance-Aware | Tier 1 / Tier 2 | Auto-Post if High Confidence |
| Refund / Chargeback Linkage | Pass 3: Parent Binding | Tier 2 (HOTL) | Auto-Post with Dashboard Surface |
| Batched Settlement (Many-to-1) | Pass 4: Bounded Subset-Sum | Tier 2 (HOTL) | Auto-Post with Review Window |
| Narration Typos & Semantic Drift | Fellegi-Sunter + Embeddings | Tier 3 (HITL) | Draft Match; Requires Explicit Sign-off |
| Unresolved Discrepancies | Pass 5: Exception Classifier | Tier 3 (HITL) | Routes to Exception Queue; No Mutation |

---

## Part 2: Architectural Gap Analysis & Design Rationale

This section records the design decisions that distinguish this system from naive reconciliation projects.

### 1. 3-Way Payment Reconciliation vs. Generic 2-Way Bank-to-GL
- **The Gap**: Generic tutorials match Bank Statement to General Ledger (2-way).
- **Domain Reality**: Razorpay is a payment gateway. The actual flow is **Gateway Transaction ↔ Bank Settlement (UTR-level, batched, net of MDR + GST) ↔ Merchant Ledger**.
- **Resolution**: Bank settlements almost never equal the gross transaction amount. They reflect `gross - MDR fee - GST (18%) - TDS`. Modeling this three-way relationship with the canonical `expected_net_amount` formula was mandatory before writing any database schema.

---

### 2. Compensating Entries vs. Destructive "Rollback"
- **The Gap**: Naive blueprints loosely mention "rolling back database state" on reconciliation errors.
- **Domain Reality**: In financial engineering, there are two distinct types of rollback:
  1. *Pre-commit Transactional Rollback*: Standard `ROLLBACK` on an uncommitted DB transaction. Safe and required on execution failure.
  2. *Post-commit Correction*: Mutating or deleting an already-posted financial transaction violates SOX and audit immutability regulations.
- **Resolution**: Enforced rule: **No posted row is ever updated or deleted.** Corrections must be written as separate `compensating_entries` referencing the original transaction, keeping the audit trail intact.

---

### 3. Realistic Scale Testing vs. 50-Record Toy Demos
- **The Gap**: Most hackathon projects demo 50 clean rows in an Excel spreadsheet.
- **Domain Reality**: A reconciliation engine must prove throughput and stability under combinatorial stress.
- **Resolution**: Built a dedicated scale harness (`scripts/run_scale_test.py`) capable of processing 110,000+ records with microsecond timing, proving >1,100 records/sec throughput under real system load.

---

### 4. Structured Confidence Breakdown vs. Arbitrary Point Scores
- **The Gap**: Displaying an opaque percentage (e.g., "Match Confidence: 85%") provides no actionable audit context.
- **Resolution**: Confidence scores are stored as structured JSON objects containing field-level Bayes factors, agreement weights, embedding cosine similarities, and rationale.

---

### 5. AI Cost & Latency Guardrails
- **The Gap**: Running LLM or embedding API calls on every candidate pair across large datasets creates $O(N \times M)$ cost and unacceptable latency.
- **Resolution**: Enforced **Hard-Field Blocking**. Semantic embeddings are only calculated for candidate pairs that already match on hard constraints (currency, amount band, date window).

---

### 6. Five Deterministic Passes vs. Naive Two-Pass Matching
- **The Gap**: Standard matchers only implement exact match and simple tolerance windows.
- **Domain Reality**: Misses the two largest discrepancy drivers in payment gateways:
  - *Refunds/Reversals*: Refunds appear as orphaned negative amounts unless bound to parent charges (Pass 3).
  - *Batched Settlements*: One bank credit represents hundreds of gateway captures. Without subset-sum roll-up matching (Pass 4), every normal batched settlement appears as a false exception.

---

### 7. Two-Layer Idempotency vs. Single-Key Dedup
- **The Gap**: A single database unique constraint fails when raw webhook retries and canonical ledger records have different lifecycles.
- **Resolution**: Implemented two separate idempotency layers:
  1. *Raw Layer*: SHA-256 content hash + `(processor_id, external_event_id, event_type)` deduplication.
  2. *Canonical Layer*: `(processor_account_id, external_transaction_id)` uniqueness.

---

### 8. Forward Cash-Forecasting Extension
- **The Rationale**: The historical gateway-to-bank settlement lag collected by the reconciliation engine directly serves as high-quality training input for classical time-series models (e.g., ARIMA), predicting expected cash settlement dates.

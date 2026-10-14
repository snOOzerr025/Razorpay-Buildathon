# 04 — Presentation, Pitch & Interview Preparation

> **Consolidated Spec**: Merges the 5-Minute Timed Pitch Script, Panel Interview Defense Guide, Knowledge Graph Architecture Insights, Real Failure Case Log, and Engineering Doubts Journal into a complete presentation preparation handbook.

---

## Section 1: The 5-Minute Pitch Script

*Presenter Note: Speak with measured confidence. Open the repository on screen and trigger the live scale test script as the presentation moves into the demo phase.*

### 0:00–0:45 — The Problem, Concretely
> "Three-way payment reconciliation is fundamentally broken. Today, when a payment is processed, we have a gateway transaction, a batched bank settlement arriving days later, and a merchant ledger expecting specific numbers.
>
> The truth is, these three rarely agree by default. Banks deduct MDR and GST before settling, a single bank wire can represent 400 distinct gateway captures, and timing delays mean records cross over month-ends. Verification capacity — humans sitting and detangling Excel sheets — is the single largest operational bottleneck for a modern finance team."

### 0:45–1:30 — What Makes This Different
> "This engine doesn't just throw raw CSVs at an LLM and hope for the best. A SOX-compliant financial system cannot rely on an LLM for financial arithmetic. Instead, we built a deterministic, 5-pass matching core that handles the math — including bounded subset-sum matching to untangle batched settlements.
>
> We deploy AI strictly where it belongs: resolving semantic drift, untangling corrupted reference narrations, and drafting human-readable explanations. Most importantly, we enforce a tiered risk model — HOOTL, HOTL, and HITL — guaranteeing that the engine never mutates ledger state without the legally required level of human sign-off."

### 1:30–3:00 — Live Demo & Verified Scale Numbers
> "Let's run this live. I am launching our scale test against 110,000 synthetic records with injected anomalies..."
> *(Wait a beat as the CLI output streams)*
> "Our engine sustains a throughput of nearly **1,130 records per second**. Out of 110,000 records complete with injected timing shifts, string corruptions, and batched roll-ups, it resolved **72.29% autonomously**, achieving **92.4% precision**.
>
> Here is our exception queue. We don't hide failures behind a clean 50-row demo. Notice these 30,583 exceptions? We have classified 10,383 as expected timing differences and 3,431 as bank-initiated fee deductions. If you click into an unresolved exception, the AI provides the exact confidence breakdown and drafts the explanation for why human sign-off is required."

### 3:00–4:00 — Architecture in 60 Seconds
> "Here is how the pipeline operates:
> 1. **Ingestion**: Raw webhooks hit an append-only log protected by two-layer idempotency (SHA-256 payload hash + DB unique keys).
> 2. **Deterministic Core**: Pass 1 handles exact parity. Pass 2 handles tolerance windows with an $O(1)$ hash-bucket optimization. Pass 3 resolves refunds. Pass 4 untangles many-to-one batched roll-ups via bounded subset-sum.
> 3. **Probabilistic Layer**: Residuals fall to Pass 5. Pass 5 uses Fellegi-Sunter record linkage and semantic embeddings to score items, staging low-confidence pairs for human review.
> 4. **Audit Immutability**: Every match and approval writes a forensic row to `audit_log`."

### 4:00–5:00 — What We Build Next
> "We built for production scale, but we know where the ceiling is. Right now, our recall trades off against stability at scale: when batched roll-ups exceed 50,000 states, we deliberately cap the dynamic program and route to exceptions to guarantee memory safety. Developing dynamic pruning heuristics for Pass 4 is our next step to boost recall.
>
> Secondly, we plan to implement settlement-lag forecasting: feeding historical gateway-to-bank lag distributions into an ARIMA time-series model to forecast exact cash settlement dates for pending transactions."

---

## Section 2: Anticipated Panel Questions & Architectural Defenses

### 1. Why didn't you just let the LLM do the matching?
**Defense**: In a financial system subject to SOX compliance and external audits, controls must be deterministic, mathematically reproducible, and verifiable. LLMs hallucinate calculations and introduce nondeterministic output. In our architecture, the LLM is restricted to reading unstructured text, calculating embedding cosine similarity, and drafting explanations. The LLM never computes a balance, fee, or total.

### 2. What happens if your matching engine is wrong?
**Defense**: Nothing posts to the database without the required risk tier:
- Tier 1 auto-posts only on strict exact criteria.
- Tier 3 requires explicit human sign-off via `/api/v1/matches/{id}/approve`.
If a posted match is found to be erroneous after the fact, the system **never deletes or updates the record**. It writes a **compensating journal entry** referencing the original transaction ID, ensuring the full audit trail remains reconstructable for regulators.

### 3. How does this scale past a small demo dataset?
**Defense**: We tested and verified the engine on 110,377 records. We implemented two critical algorithmic optimizations:
1. Pass 2 uses a hash-bucket index on net amounts, transforming an $O(N \times M)$ scan into $O(1)$ lookups and reducing execution time from 25 seconds to milliseconds.
2. Pass 4 uses a bounded dynamic programming subset-sum with a 50,000-state cap, preventing combinatorial explosion on large batch sizes.

### 4. What did you deliberately choose NOT to build?
**Defense**:
- Live banking APIs: Kept out of scope in favor of an anomaly-injected synthetic generator with known ground truth to ensure reproducibility.
- Multi-currency conversion: Restricted to INR to focus depth on complex 3-way batched roll-ups.
- Full regulatory tax reporting: Bounded the scope to core transaction reconciliation.

---

## Section 3: Structural Knowledge Graph Insights

1. **Deterministic-First, Probabilistic-Second Invariant**:
   - Deterministic Core (Passes 1–4) executes strict rule-based logic and subset-sum arithmetic.
   - Probabilistic Layer (Pass 5) is isolated to residual analysis. Deterministic code disposes; the LLM merely proposes.
2. **`MatchTier` as the Architectural Bridge**:
   - `MatchTier` links the matching engine, API routes, database mutation handlers, and frontend views:
     - `HOOTL (Tier 1)`: High confidence. Auto-commits and writes audit log.
     - `HOTL (Tier 2)`: Medium confidence. Auto-commits with monitored dashboard surface.
     - `HITL (Tier 3)`: Low confidence / AI drafts. Held in exception queue; database mutation blocked until explicit approval.

---

## Section 4: Real Failure Case Log

### Case 0 (Design Phase) — 2-Way Generic Model vs. 3-Way Payment Reality
- **What Broke**: Initial blueprints modeled reconciliation as generic Bank-to-GL (2-way).
- **Root Cause**: Overlooked payment gateway mechanics where bank settlements represent batched captures net of MDR fees and GST.
- **Fix**: Rebuilt the architecture and schema around 3-way reconciliation (`Gateway ↔ Bank ↔ Merchant`) with the canonical `expected_net_amount` formula.
- **Interview Takeaway**: Demonstrates domain diligence prior to writing code.

### Case 0b (Design Phase) — Ambiguous "Rollback" Concept
- **What Broke**: Recovery was described as "rolling back database state" without distinguishing between uncommitted transactions and posted records.
- **Root Cause**: Confusing database transaction rollback with mutating historical ledger entries.
- **Fix**: Codified the rule in `AGENTS.md`: uncommitted transactions use `ROLLBACK`; posted records require `compensating_entries`.
- **Interview Takeaway**: Shows awareness of audit integrity and SOX compliance.

### Case 1 (Code Phase) — GSAP Scroll-Jacking & Tailwind v4 Transparency
- **What Broke**: During 3D dashboard development, lower sections scrolled behind pinned architecture diagrams, creating unreadable visual overlaps.
- **Root Cause**: TailwindCSS v4 compiled CSS variables differently, causing backgrounds like `bg-[var(--bg-paper)]` to render as fully transparent.
- **Fix**: Replaced raw variable injections with direct hex codes (`#050505`, `#0a0a0a`) and refactored layout stacking contexts.
- **Interview Takeaway**: Demonstrates full-stack technical debugging capability.

### Case 2 (Code Phase) — The "Static Poster" UX Failure
- **What Broke**: Early dashboard prototype felt static and non-interactive; users could only click simulated demo buttons.
- **Root Cause**: Over-optimizing for a hands-off judge demo rather than a functional SaaS portal.
- **Fix**: Overhauled the user flow: implemented authentication session state and file upload drag-and-drop zones for gateway and bank settlement CSVs.
- **Interview Takeaway**: Highlights strong product judgment and responsive iteration.

---

## Section 5: Engineering Doubts & Concepts Q&A Journal

### Doubt 1: Is it safe to describe error recovery as "rolling back the database"?
- **Resolution**: No. There are two distinct operations:
  - *Uncommitted DB transaction*: Safe to roll back.
  - *Committed, posted financial record*: Must never be updated or deleted. Requires a compensating journal entry referencing the original transaction.

### Doubt 2: Does a 2-pass matcher (exact + tolerance) cover payment gateways?
- **Resolution**: No. Payment gateways require Pass 3 (Refund Linkage to bind orphan negative rows to parent transactions) and Pass 4 (Subset-Sum Roll-up to resolve 1-to-N batched bank credits). Without Pass 4, every batched settlement appears as a false exception.

---

## Section 6: Submission Deliverables Checklist
- [x] Public GitHub Repository with complete commit history.
- [x] Clean root layout: `README.md`, `AGENTS.md`, `docker-compose.yml`, `pyproject.toml`.
- [x] Comprehensive documentation pack under `docs/`.
- [x] 110,000-record reproducible scale benchmark (`scripts/run_scale_test.py`).
- [x] 147 passing unit tests across all passes and components.
- [x] Frontend portal with KPI dashboard, live batch execution, and HITL exception approval.

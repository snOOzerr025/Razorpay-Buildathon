# 01 — Product Requirements Document

## Problem statement
Payment reconciliation — matching what a gateway processed, what a bank actually settled, and what
a merchant's own ledger expects — is still done largely by hand across the industry, and it's the
declared bottleneck for this track: verification capacity, not generation speed, is what's actually
scarce in 2026 finance operations. This project builds an AI-assisted reconciliation engine that
closes that gap for a three-way payment flow, with a deterministic core and an AI layer used only
where deterministic logic genuinely can't resolve a match.

**Track**: AI Finance Controller (Razorpay AI Buildathon)
**Direction chosen**: Multi-source reconciliation, with settlement-lag data structured to support
an optional forward cash-forecasting extension (a second track direction) if time permits.

## The bar we're building to (Razorpay's own words, paraphrased)
Judging rewards **throughput at real scale, measured accuracy (not a cherry-picked demo), and an
honest, visible exception list** — a system that hides its failures behind a clean 50-row demo is
scored worse than one that shows its work, including what it couldn't resolve. Every requirement
below traces back to this.

## Users / personas
- **Reconciliation reviewer** (stand-in for a finance controller): reviews the exception queue,
  approves/rejects Tier 2–3 matches, needs to trust the confidence explanation, not just a score.
- **Panel judge**: needs to verify the system at scale, understand the architecture in under 5
  minutes, and see the exception list as a first-class artifact, not an afterthought.

## In scope
1. Ingest three transaction sources: gateway transaction records, bank settlement records (batched,
   UTR-referenced), merchant ledger entries.
2. Five-pass deterministic matching engine (exact → tolerance → refund/reversal → split/roll-up →
   exception routing).
3. Probabilistic (Fellegi-Sunter) + semantic (embedding) matching for what the deterministic passes
   can't resolve, gated behind hard-field blocking.
4. Risk-tiered human-in-the-loop workflow (HOOTL / HOTL / HITL) with an explicit approval UI for
   Tier 2/3 matches.
5. Structured, auditable exception queue classified by reconciling-item type (timing difference,
   transaction error/omission, bank-initiated item, unresolved).
6. Dashboard reporting: total processed, automated match rate, net discrepancy value, exception
   count by category, throughput (records/sec), and confidence-score distribution.
7. Synthetic data generator with realistic anomaly injection for testing at scale.

## Explicitly out of scope (say this out loud in the pitch — scoping honestly is a strength, not a weakness)
- Real bank/gateway API integrations (synthetic data only, clearly labeled as such)
- Multi-currency/FX conversion logic (assume INR-only for v1; note the extension point)
- Full regulatory reporting/statutory filing generation
- Production-grade auth/SSO (a minimal API key or JWT scheme is enough to demonstrate the pattern)

## Success metrics (report these numbers explicitly in the demo — don't make the judges dig for them)
- **Throughput**: records/sec sustained at 10,000+ synthetic records, with p50/p95 latency reported.
- **Automated match rate**: % resolved by Tier 1 (HOOTL) without any human touch.
- **Measured accuracy**: match correctness against synthetic ground truth (you control the
  generator, so you know the "true" answer — report precision/recall against it, not just a
  match-rate percentage).
- **Exception honesty**: every unresolved/low-confidence item visible in the exception list with a
  reason, not silently dropped or force-matched.

## Functional requirements → passes/tiers (traceability table)
| Requirement | Implemented by | Tier |
|---|---|---|
| Exact-match settlement | Pass 1 | HOOTL (Tier 1) |
| Timing-lag settlement | Pass 2 | HOOTL if within tight confidence, else HOTL |
| Refund/chargeback linkage | Pass 3 | HOTL (Tier 2) |
| Batched settlement (many-to-one) | Pass 4 | HOTL (Tier 2) |
| Typo'd/truncated vendor references | Fellegi-Sunter + embeddings | HITL (Tier 3) if below threshold |
| Anything unresolved | Exception queue | HITL (Tier 3) |

## Non-functional requirements
- Throughput target: 10,000+ records processed per test run, not just the demo's headline batch.
- Every write to `matches`/`exceptions` produces a corresponding `audit_log` row (see `03_DATA_MODEL.md`).
- No LLM call in the critical path for Tier 1 matches — Tier 1 must remain fast and cheap by design.

## Stretch goal (only after the above is solid — see `08_BUILD_SEQUENCE.md`)
Forward settlement-lag forecasting: use the historical gateway→bank settlement lag your own
reconciliation engine produces as input to a classical baseline (moving average / simple
exponential smoothing / ARIMA) predicting expected settlement dates for still-unsettled
transactions. This directly answers Razorpay's "Forward cash forecaster" track direction using data
your own system already generates — a strong story if you have the time, and cleanly separable if
you don't.

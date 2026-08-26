# Gap Analysis — What's Upgraded From the Original Blueprint, and Why

Your original blueprint (Phases 1–6) has genuinely good instincts: the deterministic-core-first
architecture, the HOOTL/HOTL/HITL risk tiering, and the SHIELDA exception-handling framing are all
correct calls that most buildathon entrants won't make. This doc is the honest diff — what's
missing or needs upgrading, and *why it matters for this specific track*, not generically.

Grounded against Razorpay's own stated bar for the AI Finance Controller track: **"throughput plus
measured accuracy plus an honest exception list"** — not a demo that works on a clean 50-row
sample. Every upgrade below either serves that bar directly or closes an auditability gap that a
Razorpay panelist (who reconciles this exact problem for a living) will immediately probe.

## 1. Domain model was generic bank-to-GL. Upgraded to 3-way payment reconciliation.
**Original**: "link transactions using strict numerical logic" across two undefined sources.
**Gap**: Razorpay is a payment gateway. The real problem isn't bank-vs-GL, it's **gateway
transaction records ↔ bank settlement (UTR-level, batched, net of MDR fee + GST) ↔ merchant
internal ledger**. A settlement almost never equals the gross transaction amount — it's gross
minus MDR (merchant discount rate) fee, minus GST on that fee (18% in India), sometimes minus TDS,
often batched (many gateway transactions settle in one bank credit), and lagged by T+1/T+2/T+3.
**Why it matters**: this is the single biggest signal of whether you understand the actual domain
vs. a generic "reconciliation" tutorial project. See `02_ARCHITECTURE.md` §2 and
`03_DATA_MODEL.md` for the schema this requires.

## 2. "Rollback" was framed as destructive. Upgraded to compensating entries — with the nuance made explicit.
**Original**: "trigger State Recovery to roll back any partial database states."
**Gap**: Your Gemini research report repeats the same phrase ("rolling back relational database
states") for SHIELDA's State Recovery stage — so this needs to be resolved precisely, not just
asserted. There are genuinely two different things both called "rollback," and conflating them is
the actual bug:
- **Pre-commit transactional rollback** (`ROLLBACK` on an open DB transaction that hasn't
  committed yet) — this is safe, standard, and exactly what SHIELDA's State Recovery stage should
  do when an agent fails mid-multi-step-write.
- **Post-commit correction of already-posted financial records** — this must NEVER be a
  destructive `UPDATE`/`DELETE`. It must be a **compensating/reversing entry** that references the
  original, because deleting posted history is a SOX/audit violation regardless of why it happened.

Rule of thumb encoded into `AGENTS.md`: SHIELDA's State Recovery may roll back an **uncommitted**
transaction freely; it may never mutate a **committed, posted** ledger row. See
`02_ARCHITECTURE.md` §5.

## 3. No non-functional targets beyond the 50-record demo batch.
**Original**: "Run your 50+ record batch through the engine."
**Gap**: 50 records proves correctness, not the judging bar ("throughput"). You need an explicit,
measured target (e.g., 10,000+ synthetic records processed with reported p50/p95 latency and
records/sec) and the accuracy/exception numbers reported *at that scale*, not the toy scale. See
`07_TEST_AND_REDTEAM_PLAN.md`.

## 4. Confidence scoring wasn't a structured, storable artifact.
**Original**: "map its semantic similarity score directly to a visible confidence tier in the UI."
**Gap**: UI display isn't enough — the confidence breakdown (which fields matched, at what
weight, Fellegi-Sunter m/u values, embedding similarity score) needs to be a **structured object
stored with the match record**, not just rendered text. That's what makes the "honest exception
list" auditable rather than a marketing claim. See `03_DATA_MODEL.md` (match_explanation schema)
and `04_MATCHING_ENGINE_SPEC.md`.

## 5. No cost/latency controls on the AI layer.
**Gap**: Calling embeddings/LLM on every unmatched pair at scale is slow and expensive. Missing:
blocking (only send pairs to the AI layer that already agree on hard fields like amount + currency
+ date window), caching, and batching. See `05_AI_GUARDRAILS_SPEC.md` §3.

## 6. Security scope was narrow (prompt injection only).
**Gap**: Financial data needs auth on every endpoint, RBAC for who can approve Tier 2/3 matches,
and PII/financial-data handling beyond prompt sanitization. See `05_AI_GUARDRAILS_SPEC.md` §4 and
`06_API_SPEC.md`.

## 7. Nothing missing was actually a submission requirement.
**Gap**: Razorpay's own process is explicit: **public GitHub repo → 5-minute pitch → architecture
→ panel interview.** None of that was in the original technical blueprint. A brilliant engine with
no pitch script or README structure loses to a good engine presented well. See
`09_SUBMISSION_KIT.md`.

## 8. No agent handoff file for Claude Code / Antigravity.
**Gap**: You asked for "each and every doc required to hand to Claude Code or Antigravity" — the
original blueprint had zero machine-readable build instructions. `AGENTS.md` (root) is the
cross-tool instruction file both Claude Code (via a one-line import in `CLAUDE.md`) and Antigravity
(reads `AGENTS.md` natively) will actually load automatically at session start.

## 9. Only 2 matching passes were specified. Upgraded to 5, closing the two gaps that matter most for a payment gateway.
**Gap (surfaced by your Gemini report, and it's right)**: Exact-match and tolerance-match alone
miss the two discrepancy types that dominate real payment gateway reconciliation:
- **Pass 3 — Refund/Reversal linkage**: a refund or chargeback is a *separate* transaction record
  that must be bound back to its original charge, or it reads as an orphaned, unexplained negative
  balance — a false "exception" that isn't really one.
- **Pass 4 — Split/Roll-up (subset-sum) matching**: this is the single most important addition for
  a *payment gateway specifically*. Bank settlement is batched — one bank credit often equals the
  sum of dozens or hundreds of individual gateway transactions, minus aggregate fees. Without a
  combinatorial subset-sum pass, every batched settlement looks like an unmatched exception, which
  would make the demo look broken on completely normal data. See `04_MATCHING_ENGINE_SPEC.md` §2.

## 10. Idempotency was one layer. Upgraded to two, matching how ingestion actually fails.
**Gap**: A single idempotency key isn't enough — raw webhook ingestion and canonical/normalized
transactions fail in different ways and need different keys:
- **Raw layer**: uniqueness on `(processor_id, external_event_id, event_type)` + a payload hash, so
  a retried webhook can never be double-recorded even before normalization.
- **Canonical layer**: uniqueness on `(processor_account_id, external_transaction_id)` once the raw
  event has been transformed into a normalized ledger-ready record.

See `03_DATA_MODEL.md` §1.

## 11. Forecasting was entirely absent. Added as an optional stretch module — deliberately, not by default.
**Gap**: Razorpay's own track examples explicitly list "Forward cash forecaster" alongside
"Multi-source reconciliation" — and your reconciliation engine already produces the exact input a
forecaster needs for free: the historical distribution of settlement lag (gateway timestamp → bank
credit timestamp) per method/processor. Classical baselines (moving average, simple exponential
smoothing, ARIMA) on that lag data would let you demo *forward-looking* settlement-date prediction,
not just backward-looking matching — a genuine differentiator if you have time left. Deliberately
scoped as **optional/stretch** (see `08_BUILD_SEQUENCE.md`) because a shallow forecasting bolt-on
that under-delivers hurts you more than not building it — the core reconciliation engine done well
is the actual bar.

## What was already right (kept, not upgraded)
- Deterministic-core-first architecture (LLM never computes totals/tax/balances)
- Recall-over-precision default for the deterministic matcher
- Fellegi-Sunter + embeddings for the probabilistic/semantic layer, gated behind hard-field blocking
- HOOTL / HOTL / HITL risk tiering
- SHIELDA-style structured exception classification (reasoning-phase vs. execution-phase errors)
- Synthetic data with realistic anomaly injection (timing shifts, truncation, duplicate IDs, prompt
  injection strings) for red-teaming

## Verified reference implementations worth actually studying (spot-checked, not just repeated)
- **GrandmasterTash/OpenRec** (Rust) — confirmed real: a genuinely fast, YAML/Lua-configured
  reconciliation matching engine. Good reference for the multi-pass matcher's *rule externalization*
  pattern (matching logic in config, not hardcoded), even though you likely won't build in Rust for
  a 2-week buildathon.
- **juspay/hyperswitch** — confirmed real, and a *stronger* reference than anything in the original
  report: an open-source, PCI-compliant payments orchestration platform built in Rust by an Indian
  fintech company, with reconciliation as a stated feature. Worth skimming for how a real
  India-market payments company structures transaction/settlement data models — directly relevant
  to a Razorpay panel in a way a generic reconciliation repo isn't.
- Treat the remaining repos named in your Gemini report (multi-processor-reconciliation, fuzzylink,
  bank-reconcile, jandreanalytics/TransactionReconciliationDemo) as **directional patterns to
  learn from, not verified links to depend on** — they weren't independently confirmed here. Don't
  have the coding agent try to clone/import from them without checking they resolve first.

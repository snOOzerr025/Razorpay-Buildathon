# 08 — Build Sequence & Sprint Plan

**Assumption stated explicitly**: Razorpay's buildathon applications close **5 September 2026**,
and today is **22 August 2026** — a ~14-day window. This plan assumes a solo or small-team build in
that window, evenings/weekends realistic for a student. Adjust freely if your actual available time
differs; the *order* of phases matters more than the exact day count.

## Days 1–2: Foundation (do not skip to the matching engine before this is done)
- Schema + migrations for all tables in `03_DATA_MODEL.md`
- Raw ingestion endpoint with two-layer idempotency working and tested
- Synthetic data generator (§1 of `07_TEST_AND_REDTEAM_PLAN.md`) producing all three sources with
  known ground truth
- **Delegate to the coding agent**: schema + migration boilerplate, generator scaffolding. **Do
  yourself**: the `expected_net_amount` formula and idempotency key design — get these exactly
  right by hand since everything downstream depends on them.

## Days 3–5: Deterministic matcher, Passes 1–3
- Pass 1 (exact), Pass 2 (tolerance-aware), Pass 3 (refund/reversal)
- Unit tests with explicit edge cases for each pass
- **Delegate**: pass implementations against the spec in `04_MATCHING_ENGINE_SPEC.md` — this spec
  is detailed enough for an agent to implement directly; review its edge-case handling closely.

## Days 6–7: Pass 4 (split/roll-up) — budget real time here, it's the hardest pass
- Bounded subset-sum implementation with a capped candidate pool (don't let this become
  exponential-time on real batch sizes)
- Test explicitly against ambiguous cases (two valid subset groupings) to confirm they route to
  review rather than silently resolving

## Days 8–9: Probabilistic + semantic layer
- Fellegi-Sunter scoring with m/u calibrated from your own synthetic ground truth (not guessed
  constants) — `04_MATCHING_ENGINE_SPEC.md` §2
- Blocking + embedding cosine similarity for text fields — §3
- Confidence → tier mapping wired to the approval workflow

## Days 10–11: Exception queue, tiering UI, audit trail
- HOOTL/HOTL/HITL approval workflow end to end, including the approve/reject API
- Dashboard: throughput, match rate, exception list by category, confidence distribution
- Audit log verified end to end for at least one full record lifecycle (ingest → match → approve →
  visible in audit log)

## Day 12: Scale test + red-team pass
- Run the full pipeline at 10,000+ synthetic records; capture the exact reporting numbers from
  `07_TEST_AND_REDTEAM_PLAN.md` §4
- Run the full red-team checklist (§5)
- Fix whatever breaks — budget this as real time, not a formality

## Day 13: Submission kit
- README, architecture diagram, 5-minute pitch script (`09_SUBMISSION_KIT.md`)
- Record/rehearse the demo — know exactly which numbers you're going to say out loud

## Day 14: Buffer
- Do not schedule new features here. Buffer for whatever slipped, and a final read-through of
  `AGENTS.md`'s non-negotiable rules against the actual repo — confirm nothing violates them before
  submitting.

## Stretch (only if you finish everything above with days to spare)
- Settlement-lag forecasting module (`01_PRD.md` stretch goal) — moving average / SES / ARIMA on
  your own reconciliation engine's lag data. Do not start this if Days 1–13 aren't solid; a shallow
  forecasting add-on that doesn't work hurts more than not attempting it.

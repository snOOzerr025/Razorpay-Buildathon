# MEMORY.md — Session Continuity Log

**Read this file FIRST, before touching code, at the start of every session.**
**Update this file LAST, before ending, at the end of every session — even a 20-minute one.**
A time gap between sessions is the exact failure mode this file exists to prevent: without it, the
next session either re-derives decisions already made (wastes time) or contradicts them (creates
bugs). Keep this file short enough to actually get read in full every time — condense the session
log periodically rather than letting it grow forever (see the note at the bottom).

## Project snapshot
Three-way AI-assisted payment reconciliation engine (gateway ↔ bank settlement ↔ merchant ledger)
for the Razorpay AI Buildathon, AI Finance Controller track. Full spec in `docs/00`–`09`. Deadline:
buildathon applications close 5 September 2026.

## Current phase
`Days 3–5: Deterministic Matching Engine` — Days 1–2 foundation is COMPLETE and tested.

## Build status checklist
Mirrors `docs/08_BUILD_SEQUENCE.md`. Check off only what's actually done and tested, not started.
- [x] Days 1–2: Schema/migrations, raw ingestion + two-layer idempotency, synthetic data generator
- [ ] Days 3–5: Matching Passes 1–3 (exact, tolerance, refund/reversal)
- [ ] Days 6–7: Pass 4 (split/roll-up, bounded subset-sum)
- [ ] Days 8–9: Fellegi-Sunter + semantic embedding layer
- [ ] Days 10–11: Exception queue, HOOTL/HOTL/HITL approval workflow, audit trail, dashboard
- [ ] Day 12: Scale test (10,000+ records) + red-team pass
- [ ] Day 13: README, architecture diagram, pitch script
- [ ] Day 14: Buffer / final non-negotiable-rules audit

## Locked decisions — do not re-litigate these without a specific new reason
(If a future session wants to change one of these, that's fine — but write down *why* here, don't
just silently drift from it.)
- 5-pass deterministic matcher; Pass 4 (split/roll-up) is non-optional for this domain
- LLM never computes totals/tax/fees/balances — deterministic code only
- Posted records are never destructively edited; corrections are compensating entries. Plain DB
  `ROLLBACK` is fine, but only for transactions that haven't committed yet
- Every match (including Tier 1 auto-matches) writes an `audit_log` row
- Fellegi-Sunter m/u probabilities are calibrated from synthetic ground truth, not hand-picked
- Forecasting module is stretch-only, built last, never at the expense of the core engine

## Where I stopped last session
Completed all Days 1–2 deliverables. All 39 unit tests pass. Next phase: Days 3–5 deterministic
matching engine — Pass 1 (exact), Pass 2 (tolerance), Pass 3 (refund/reversal).

## Known issues / open questions
_(none yet)_

## Next session should start with
Read `docs/04_MATCHING_ENGINE_SPEC.md` in full, then implement `src/matching/` starting with
Pass 1 (exact match) and Pass 2 (tolerance-aware). Run synthetic generator first to have test
data: `python -m synthetic_data.generator --count 1000 --seed 20260822`.
Commit rule: every new file pushed within 10 minutes of creation.

## Session log
Keep entries to 2–4 lines. When this section exceeds ~15 entries, condense the oldest ones into a
single summary line and keep only the last 5–6 in full detail — don't let this file grow unbounded.

### Session 1 — 2026-08-26
- Full `docs/` spec pack (00–09) written and reviewed. Created cinematic-frontend and design-taste
  skills. No application code written.

### Session 2 — 2026-08-27
- Built all Days 1–2 deliverables: Alembic migrations (9 tables, recon_app role), synthetic data
  generator (6 anomaly types, ground truth, manifest), two-layer idempotency ingestion layer,
  production DB engine with dual-role pooling, pytest conftest with rollback fixtures.
- 39 unit tests: all pass. Fixed 2 bugs (batch size crash, reproducibility via unseeded random).
- Commit rule active: every file pushed within 10 min, unique conventional commit messages.
- Next: Days 3–5 — deterministic matching engine Passes 1–3.

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
`Days 1–2: Foundation` — per `docs/08_BUILD_SEQUENCE.md`. No code written yet.

## Build status checklist
Mirrors `docs/08_BUILD_SEQUENCE.md`. Check off only what's actually done and tested, not started.
- [ ] Days 1–2: Schema/migrations, raw ingestion + two-layer idempotency, synthetic data generator
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
Full `docs/` spec pack (00–09) written and reviewed. Skills created: `cinematic-frontend` (art
direction + camera + 5-6 scene framework) and `design-taste` (anti-slop checklist). No application
code written yet. Next: start Days 1–2 build sequence — schema/migrations.

## Known issues / open questions
_(none yet)_

## Next session should start with
Read `docs/08_BUILD_SEQUENCE.md` Days 1–2 and begin implementing: schema migrations for
`canonical_transactions`, `bank_settlements`, `merchant_ledger_entries`, `match_results`,
`audit_log` tables with append-only constraints and two-layer idempotency.

## Session log
Keep entries to 2–4 lines. When this section exceeds ~15 entries, condense the oldest ones into a
single summary line and keep only the last 5–6 in full detail — don't let this file grow unbounded.

### Session 1 — 2026-08-26
- Full `docs/` spec pack (00–09) written and reviewed against a second independent research pass
  (Gemini deep research doc) — added Pass 3/Pass 4 matching, two-layer idempotency, precise
  Fellegi-Sunter math, clarified rollback-vs-compensating-entry distinction.
- Created `.agents/skills/cinematic-frontend/` (SKILL.md + 4 reference files) and
  `.agents/skills/design-taste/` for future frontend work.
- No application code written yet. Next session starts at Days 1–2 in `docs/08_BUILD_SEQUENCE.md`.

# AGENTS.md — Build Instructions for AI Coding Agents

This file is the canonical, cross-tool instruction set for building this project. Antigravity
reads this file natively at the workspace root. Claude Code imports it via the one-line
`@AGENTS.md` reference in `CLAUDE.md` — do not duplicate instructions between the two files.

## What you're building

An AI-assisted, three-way financial reconciliation engine for the Razorpay AI Buildathon (AI
Finance Controller track): matching **gateway transaction records ↔ bank settlement records ↔
merchant ledger entries**, with a strict deterministic core, a probabilistic/semantic AI layer for
what the deterministic core can't resolve, and risk-tiered human-in-the-loop approval for anything
that mutates financial state. Full spec: `docs/01_PRD.md` through `docs/09_SUBMISSION_KIT.md`.
Read `docs/00_GAP_ANALYSIS.md` first for the reasoning behind every non-obvious design choice.

## Non-negotiable rules (violating these fails the build, not just the style guide)

1. **The LLM never computes financial totals, tax, fees, or balances.** All arithmetic lives in
   deterministic code (Python/TypeScript, not a prompt). The LLM's role is limited to: reading
   unstructured text (OCR'd descriptions, remittance narration), semantic similarity scoring via
   embeddings, and drafting human-readable explanations. If you find yourself asking an LLM to
   "calculate" anything, stop and move that logic into the deterministic layer.
2. **No destructive mutation of posted financial records — but distinguish the two kinds of
   "rollback."** An open, uncommitted DB transaction can and should `ROLLBACK` freely on failure —
   that's normal, safe error handling. A **committed, posted** ledger or match row must never be
   `UPDATE`/`DELETE`d; corrections are compensating/reversing entries that reference the original.
   If you're unsure which case you're in, ask: has this row been committed and read by anything
   else yet? If yes, it's a compensating entry, not a rollback. See `docs/02_ARCHITECTURE.md` §5.
3. **Every match — automated or human-approved — writes an audit log entry** with: what matched,
   which rule/model produced it, the confidence breakdown, and (for HITL) who approved it and when.
   No exceptions, including for Tier-1 auto-matches.
4. **Sanitize before it touches an LLM prompt.** Strip external text (transaction narrations, bank
   remittance strings) to expected fields before it's included in any prompt. Never pass raw,
   untrusted text directly into a system or tool-calling context. See `docs/05_AI_GUARDRAILS_SPEC.md`.
5. **Default to surfacing uncertainty, not resolving it.** The deterministic matcher optimizes for
   recall, not precision — an item incorrectly sent to the exception queue is a minor cost; an item
   incorrectly auto-matched is a real error. When in doubt, escalate the tier.
6. **Ledger state does not mutate until the required approval for that tier has been recorded.**
   Tier 1 (HOOTL) auto-posts and logs. Tier 2 (HOTL) posts only after passing a confidence
   threshold with the record visible in a monitored dashboard. Tier 3 (HITL) requires an explicit
   human "Approve" action recorded before any database write. See `docs/04_MATCHING_ENGINE_SPEC.md` §5.

## Build order (do not reorder — later modules assume earlier ones are correct)

1. Data model + append-only schema + audit log (`docs/03_DATA_MODEL.md`)
2. Synthetic data generator with anomaly injection (`docs/07_TEST_AND_REDTEAM_PLAN.md` §1) — build
   this before the matching engine so you have realistic test data from day one, not clean fixtures.
3. Deterministic matching engine, all 5 passes in order — each pass only runs on what the previous
   pass left unmatched:
   - Pass 1 — Exact (identical account/currency/amount/reference, near-zero date tolerance)
   - Pass 2 — Tolerance-aware (date window + gross/net fee normalization)
   - Pass 3 — Refund/Reversal linkage (binds refunds/chargebacks back to the original charge)
   - Pass 4 — Split/Roll-up (subset-sum: many gateway txns summing to one batched bank credit) —
     **this pass is not optional for a payment gateway domain**; without it, every normal batched
     settlement reads as a false exception
   - Pass 5 — Everything still unmatched routes to the exception queue
4. Probabilistic layer (Fellegi-Sunter) + semantic layer (embeddings), gated behind hard-field
   blocking, for what all 5 deterministic passes couldn't resolve
5. Exception queue + risk tiering (HOOTL/HOTL/HITL) + approval workflow
6. SHIELDA-style structured error handling
7. API layer (`docs/06_API_SPEC.md`)
8. Dashboard: match rate, throughput, exception list, confidence breakdowns — this is what judges see
9. Red-team pass against the synthetic anomaly set, at scale (thousands of records, not 50)

## Working pattern

Plan → Execute → Verify, every task. Before marking any task complete:
- Run the relevant test suite.
- Confirm the change doesn't violate any rule in the "Non-negotiable rules" section above.
- If a task touches the matching engine or ledger schema, re-run the synthetic red-team batch and
  report the updated match-rate/exception-rate numbers — don't let these numbers go stale.

## Definition of done for any module

- [ ] Deterministic logic is unit-tested with explicit edge cases (not just the happy path)
- [ ] Every write to the ledger/match tables has a corresponding audit log entry
- [ ] Confidence/explanation output matches the structured schema in `docs/03_DATA_MODEL.md`
- [ ] No raw external text reaches an LLM prompt unsanitized
- [ ] README/architecture doc updated if the module changes the system diagram

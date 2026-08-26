# INTERVIEW.md — Panel Prep + Real Failure Case Log

Two purposes, kept separate: **anticipated questions** (mostly static, seeded now) and a **running
log of real failure cases** (starts empty, fills in as you actually build — this is the part that
makes your interview answers specific instead of generic).

## Anticipated panel questions
Full structured version with suggested answers lives in `docs/09_SUBMISSION_KIT.md` — don't
duplicate it here. Quick-reference list only:
1. Why didn't the LLM just do the matching?
2. What happens if your matcher is wrong?
3. How does this scale past your demo dataset?
4. What did you deliberately not build, and why?
5. Walk me through your riskiest engineering decision. *(This one specifically wants an answer
   pulled from the failure log below, not from the spec — a real decision under real constraints
   beats a rehearsed one.)*
6. What would you build next with more time?

## Real failure case log
Format for every entry: **What broke → Root cause → Fix → Interview angle** (which question above
it answers, or what trait it demonstrates — debugging process, scoping judgment, domain
understanding). Log these *as they happen*, not retroactively from memory the night before the
interview — you will lose the specific, honest detail that makes an answer land.

Seed entries below are from the **design/research phase**, before any code existed — genuine gaps
caught by re-reviewing the plan against deeper research, not runtime bugs. Mark clearly which is
which; a panelist asking "what broke while building" wants code-phase entries specifically, so keep
adding those once you're writing code.

---

### Case 0 (design phase, not code) — Two-way reconciliation model was wrong for this domain
**What broke**: Initial architecture plan modeled reconciliation as generic bank-to-GL (two-way).
**Root cause**: Didn't map the actual domain early enough — Razorpay is a payment gateway, so the
real structure is three-way (gateway transaction ↔ bank settlement ↔ merchant ledger), with
settlement amounts net of MDR fee + GST, not gross.
**Fix**: Rebuilt the data model and matching engine spec around the three-way structure and the
`expected_net_amount` formula before writing any schema.
**Interview angle**: Answers "what did you deliberately not build" and "riskiest decision" — shows
domain research happened *before* implementation, not as a patch after something broke.

### Case 0b (design phase, not code) — "Rollback" was ambiguous and would have caused a real bug
**What broke**: Original plan described error recovery as "rolling back database state" without
distinguishing an uncommitted transaction from an already-posted ledger row.
**Root cause**: Two genuinely different operations share the word "rollback" — conflating them
would have meant destructively editing posted financial records, which is a real SOX-adjacent
audit violation, not just a style issue.
**Fix**: Split the concept explicitly — plain DB rollback pre-commit, compensating entries
post-commit — and encoded the distinction as a non-negotiable rule in `AGENTS.md` before any table
existed.
**Interview angle**: Strong answer to "what happens if your matcher is wrong" — shows you reasoned
about audit trail integrity before it was a live problem, not after.

### Case 1 — `[fill in once you start coding]`
**What broke**:
**Root cause**:
**Fix**:
**Interview angle**:

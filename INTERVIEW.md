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

## Structural Insights (Knowledge Graph Derived)
These questions were structurally derived from our `/graphify` architecture pass and answer the complex integration points of the codebase:

### 1. What is the overall architecture of the reconciliation engine?
The pipeline operates on a **Deterministic-First, Probabilistic-Second** approach:
*   **Deterministic Core (Passes 1-4):** Strict rule-based matching. Pass 1 handles exact matches. Pass 2 handles tolerance windows and fee normalization. Pass 3 links refunds. Pass 4 solves the hardest problem: Subset-Sum (1-to-N matching) for batched bank settlements.
*   **Probabilistic Layer (Pass 5):** The fallback heuristic. It uses a Fellegi-Sunter record linkage model and semantic LLM embeddings to handle unstructured narration data (like messy UTRs) that fail strict rules.

### 2. Why does `MatchTier` act as a central bridge across the entire architecture?
The knowledge graph highlights `MatchTier` as the ultimate bridge node connecting the engine, the probabilistic layer, the API routes, and the tests. This is because **state mutation and financial risk** are entirely governed by the `MatchTier`:
*   **Tier 1 (HOOTL - Human Out Of The Loop):** High confidence (Pass 1/2). Auto-approved and committed.
*   **Tier 2 (HOTL - Human On The Loop):** Medium confidence (Pass 3/4 splits). Posted but heavily surfaced for retroactive review.
*   **Tier 3 (HITL - Human In The Loop):** Low confidence AI guesses (Pass 5). Held in an Exception Queue. The database *does not mutate* until an explicit `/approve_match` API call is made.

### 3. Are the inferred relationships between `MatchTier` and deterministic passes correct?
Yes. The LLM never computes financial totals because it is prone to hallucination. By wiring `MatchTier` directly into the deterministic passes (Pass 1-4) and isolating the LLM entirely in Pass 5, we enforce the invariant: **Deterministic code disposes; the LLM merely proposes.** 

---

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

### Case 1 (code phase) — GSAP Scroll-Jacking + Tailwind v4 Transparency Bug
**What broke**: When implementing the 3D cinematic scrolling for the landing page, lower sections (like the Trust & Auditability cards) began scrolling *behind* and overlapping the pinned Architecture text, making it an unreadable mess.
**Root cause**: TailwindCSS v4 changed how arbitrary CSS variables are compiled. Classes like `bg-[var(--bg-paper)]` failed silently, rendering the section backgrounds completely transparent. Because GSAP scroll-jacking uses fixed/absolute positioning, the transparent sections layered on top of each other.
**Fix**: Diagnosed the Tailwind v4 compilation issue, replaced the raw variable injections with direct hex codes (`#050505`, `#0a0a0a`) for the cinematic dark theme, and completely rewrote the internal dashboard pages (`run/page.tsx`, `exceptions/page.tsx`) to match the new robust dark UI.
**Interview angle**: Demonstrates deep, up-to-date knowledge of the frontend stack (Tailwind v4 vs v3 mechanics) and how to debug complex z-index/transparency issues in scroll-jacked GSAP environments.

### Case 2 (code phase) — The "Static Poster" UX Failure
**What broke**: The initial version of the internal dashboard felt fake to the user. They described it as a "static poster" because there was no real login form and no way to upload data—just pre-configured buttons to click.
**Root cause**: Over-optimized for a "rapid click-through demo" intended for judges, sacrificing the actual SaaS application feel. Real users expect to input data, not just watch an animation play.
**Fix**: Immediately overhauled the user flow. Rebuilt the `/login` page into a standard email/password portal (mocked via `localStorage` session state), and redesigned the `/run` (Live Run) page to require actual drag-and-drop file uploads for both Gateway Capture and Bank Settlement CSVs before the deterministic engine would execute.
**Interview angle**: Shows strong product sense and scoping judgment—recognizing when a technical prototype is too abstracted and rapidly pivoting to build an interface that demands real user interaction to feel authentic.

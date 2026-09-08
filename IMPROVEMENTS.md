# Complete Project Review: Razorpay AI Finance Controller

## Executive Summary

This is an ambitious, thoughtfully designed, but partially broken AI-assisted reconciliation engine. The deterministic 5-pass matching engine, money math, and synthetic data generator are genuinely impressive. However, the project has critical bugs that will break the demo (wrong parent-transaction lookup, broken audit-log columns, invalid Gemini model name, hardcoded auth tokens), and the frontend is disconnected from real API state in ways that violate the project's own AGENTS.md rules.

**Overall verdict:** A strong engineering foundation with solid architecture docs and impressive test coverage, but several blocking issues that need fixing before it can credibly demo as a "production-grade" finance controller.

---

## Part 1: Backend Code Review (Senior Dev)

### What's Actually Well-Built

| Area | Assessment |
|---|---|
| **src/money.py** | Excellent. Explicit half-up rounding to match Postgres, SettlementMath dataclass for explanations, single source of truth for the expected-net formula. This is the strongest module in the codebase. |
| **5-pass architecture (Pass 1-5)** | Structurally correct. Phase discipline (Load / Match / Persist) is sound. Pass 1 indexes cleanly, Pass 4's bounded DP is appropriate, Pass 5 classifies residuals correctly. |
| **Idempotency** | Two-layer dedup (SHA-256 content hash + DB unique constraint) is belt-and-suspenders done right. |
| **Audit log intent** | Every match path in engine.py calls `_write_audit_log` — good adherence to AGENTS.md rule 3. |
| **Money safety** | No float arithmetic in critical paths; `to_decimal` is a hard guard. |
| **Fellegi-Sunter math** | `log2(m/u)` for agree, `log2((1-m)/(1-u))` for disagree, Laplace smoothing — textbook correct. |
| **Sanitization** | sanitize.py is one of the strongest modules: regex list, length bound, >50% redaction reject. |

### Critical Bugs (Will Break Demo)

1. **pass3.py:137** — Wrong field for parent lookup. Uses `gw_by_ext_id.get(parent_id)`, but `parent_transaction_id` is a DB integer ID, not an external string. Every refund will silently fail to bind to its parent and fall through to exceptions. The engine has a pre-built `gw_by_id` index — should use that.

2. **api/routes/exceptions.py:85-98** — INSERT into non-existent columns. Uses `id, event_type, entity_id, payload, created_at` — but migration 001 defines `audit_log` as `(entity_type, action, actor, rationale, occurred_at)`. Every approve/reject/resolve call will throw at runtime. Same bug in matches.py:111.

3. **api/routes/chat.py:62** — Invalid model ID `gemini-3.6-flash`. The real model is `gemini-1.5-flash` or `gemini-2.0-flash`. The chatbot will 404 against the Gemini API.

4. **api/dependencies.py:41** — Hardcoded default token `dev_token_123`. If `API_KEY` env is unset, the API silently accepts this dev token. Anyone with the source code can authenticate.

5. **src/matching/engine.py:345** — Missing `ON CONFLICT DO NOTHING` on the `INSERT INTO matches`. The docstring promises idempotency but the SQL doesn't have it. Re-running the engine crashes on the second pass.

### Significant Bugs

6. **pass2.py** — No skip on `bank_net <= 0`. Negative bank settlements (refund credits posted as negative) will match positive gateway records. Real false-positive risk.

7. **pass5.py:91-97** — `pass_name` gymnastics. `result.pass_name = PASS4_SPLIT` then `= PASS1_EXACT` with comment "will be overridden by engine." Misleading, no `MatchPass.PASS5_EXCEPTION` enum value exists.

8. **ai_investigator.py:188-194** — Dead LLM path. The `_investigate_with_llm` function is a stub (`pass` in try block) that always returns the heuristic. The 3-role "AI loop" is heuristic-only.

9. **engine.py:184** — Dead semantic matcher. `SemanticMatcher` is constructed but `match_residuals()` is never called. The semantic layer is unreachable from production.

10. **normalizers.py:79-91** — `mdr_fee_pct` percentage-vs-fraction ambiguity. The schema treats `mdr_fee_pct` as a fraction (multiplied directly), but the comment in the file says "percentage." Will silently miscompute if anyone passes a percentage value.

11. **embeddings.py:244** — `confidence = Decimal(str(round(best_sim, 4)))`. Round-through-float reintroduces the binary-precision issue the rest of the codebase carefully avoids.

12. **fellegi_sunter.py:241-243** — HOTL confidence is always 0.5 by construction (`score / (2 * threshold_upper)` = 10/20 = 0.5). The display says "50% confidence" for an auto-match.

13. **routes/exceptions.py:113** — `compensate_exception` does not actually compensate. It only writes to `audit_log`. No insert into `compensating_entries` table. The endpoint name lies about what it does.

14. Route files use `req.resolved_by` from the request body as the audit-log actor. This is actor spoofing — the authenticated principal from `verify_token` ("api_user") is ignored.

### Security Issues

15. Dynamic table names via f-string in `engine.py:413` (`f"UPDATE {table}..."`). The values come from a hardcoded enum dict, so not currently exploitable, but a maintenance hazard.

16. `list_matches` and `list_exceptions` lack pagination. No LIMIT cap — will scan the whole table.

17. `payouts_api.py` has no rate limiting. A malicious user can burn through the Gemini quota.

18. Chatbot has no auth check — the `verify_token` dependency is not in the route decorator. Anyone on the internet can hit `/api/v1/chat`.

### Money-Formula Duplication

The `expected_net_amount` formula `gross - (gross * mdr) - (gross * mdr * gst) - tds` is implemented in four places:

- `src/money.py` (canonical)
- `src/matching/probabilistic/ai_investigator.py:86-92`
- `src/api/routes/reconcile.py:104-111`
- `src/ingestion/normalizers.py:79-91`

A change to one without the others will create silent money-parity bugs. Centralize to `src.money.expected_net_amount`.

### Migration Hygiene

- Migration 002 adds `resolved BOOLEAN` and `status TEXT` to exceptions.
- Migration 003 also adds `status TEXT` (harmless via `IF NOT EXISTS`) and adds `resolved_at TIMESTAMP`. The `resolved BOOLEAN` from 002 is now dead code.
- No down-path migrations to clean up.

### AGENTS.md Compliance

| Rule | Status |
|---|---|
| 1. LLM never computes financial totals | ✅ Pass — all math in money.py, ai_investigator.compute_hard_facts. |
| 2. No destructive mutation of posted records | ✅ Pass — engine only writes match_status, not financial columns. |
| 3. Every match writes audit log | ⚠️ Partial — engine writes them, but route files INSERT into non-existent columns (bugs #2). |
| 4. Sanitize before LLM | ⚠️ Partial — sanitize.py is thorough, but the LLM path itself is dead code. |
| 5. Surface uncertainty | ✅ Pass — ambiguity detected in Pass 4 and routed to exceptions. |
| 6. Ledger state doesn't mutate before approval | ✅ Pass — tier_to_status mapping ensures matches start in pending_* state. |

---

## Part 2: Frontend Review (Senior Dev)

### What's Well-Built

| Component | Assessment |
|---|---|
| **Landing page (page.tsx)** | Strong craft — 3D Android mascot, grain overlay, magnetic buttons, smooth scroll. Tasteful Slate + Sandy + Copper token system. |
| **Dashboard (dashboard/page.tsx)** | Solid KPI cards, two Recharts visualizations, loading/error/empty states all handled. |
| **Chatbot** | Floating action button, modal panel, auto-scroll, abort on close (mostly). Decent UX. |
| **App shell ((app)/layout.tsx)** | Sidebar nav, theme toggle, sign-out, user pill. Sensible layout. |

### Critical Frontend Bugs

1. **login/page.tsx:50** — "Continue as Admin" button creates an admin session with no password. Any visitor becomes an admin. This must not ship.

2. Authentication is client-side only — `localStorage.setItem('parity_session', ...)` in login/page.tsx:25 is the entire auth model. The protected layout reads it back and trusts it. No server check, no signature, no expiry. Trivially bypassed with `localStorage.setItem('parity_session', '{"user":"admin","role":"Administrator","ts":0}')`.

3. Hardcoded Bearer `dev_token_123` in dashboard/page.tsx:32 and run/page.tsx:36. Visible in the client bundle. Anyone with devtools can call the API directly with admin privileges.

4. **exceptions/page.tsx:13** — Approve/Reject are local-only. The card just disappears via `setExceptions(prev => prev.filter(...))`. No API call. No audit log entry. This directly violates AGENTS.md rule 3 — "Every match — automated or human-approved — writes an audit log entry."

5. **run/page.tsx:46** — Uses `window.location.href = '/dashboard'` instead of `router.push`. Full page reload, breaks SPA experience.

6. Store (lib/store.ts) is disconnected. `updateExceptionStatus` is defined but never called. The Zustand store and the API are two parallel universes.

### Accessibility Gaps

7. **login/page.tsx** — `<label>` does not wrap the input, so the password field's accessible name is only its placeholder. Screen readers will not announce the field correctly.

8. Chatbot has no `role="dialog"`, no `aria-modal`, no focus trap, no Escape handler. Standard a11y for modals. Mobile users have no way to dismiss the panel except the close button.

9. Charts have no `aria-label` and no off-screen data-table fallback. Recharts SVGs are announced as a wall of paths.

10. No `aria-current="page"` on the active sidebar nav item.

11. Color-contrast failures on Approve button (white on #3D8C7A ≈ 3.4:1, fails WCAG AA 4.5:1) and chatbot user message (white on #C25E1A ≈ 3.5:1).

12. Sidebar is 220px fixed-width with no mobile nav — the app is unusable on phones.

13. The topbar uses `<h1>` for the route label — combined with the page's own `<h1>`, you get two `<h1>`s per page.

### Performance

14. **GrainOverlay.tsx** runs a `requestAnimationFrame` loop at 60fps on every page, even when nothing is animating. The canvas re-renders ~64×64 pixels of noise at 60Hz = ~250k pixel writes/sec. Battery drain on laptops.

15. Recharts is ~150KB gzipped and not lazy-loaded. Should be dynamic-imported.

16. No AbortController on any of the three fetch calls (Dashboard, Run, Chatbot). Navigating away during an in-flight request triggers a React warning.

17. Mock-data.ts has `payload: any` — defeats the entire type system.

### Dead Code

- **SmoothScroll.tsx** — never imported.
- **assistant-kb.ts** — never read by anything.
- **mockRuns: any[]** and **progressiveRunData** — imported but never used.
- **_load_csv_from_upload** in routes/reconcile.py — defined, never called.

---

## Part 3: End-to-End User Testing (Real-User Walkthrough)

I mentally walked through the demo flow as a non-technical finance controller. Here is the experience:

### Scenario 1: Finance Controller, First-Time User

1. Lands on parity-site/ — beautiful 3D landing page with Android mascot. Impressive.
2. Clicks "Continue as Admin" — instant admin access, no friction. (Suspicious from a security standpoint, but smooth from a demo standpoint.)
3. Dashboard loads — KPIs look great: match rate, throughput, exception count. But the values are stale (the actual API only returns from the previous run, no auto-refresh).
4. Clicks "Run New Batch" — file upload page. Three drag-zones. Actually click-only, not drag-and-drop — the copy says "Drop here" but `onDrop` is not implemented.
5. Selects CSVs, clicks Execute — big "Processing..." state, then navigates to dashboard. There's no progress bar, no streaming output, no idea what the engine is doing for ~30 seconds.
6. Goes to Exceptions — sees 3 mock cards. Clicks Approve on one. The card disappears. That's it. No confirmation, no audit-log feedback, no API call. As a finance controller, this is terrifying — "Did I just approve something? Where did it go? Was an audit entry created?"
7. Goes to Audit page — sees the static mock audit trail, not the approve they just did. The action never reached the backend.

### Scenario 2: Panel Judge

1. Lands on the dashboard, sees the numbers (72.29% match rate, 110k records).
2. Asks "What does the 16,573 'unresolved' category actually mean?" — opens the Exceptions page. Clicks into a card. The payload says "mock-data" — there's no real data behind the cards. A judge asking "show me the actual transaction that failed" gets a hardcoded string.
3. Asks "Can I see the source records for this exception?" — there's no drill-down. The card shows the category and amount, but clicking it does nothing.
4. Asks "How do I know the audit log is immutable?" — Audit page is a static table from the Zustand store. There's no proof of append-only behavior, no link to the underlying `audit_log` Postgres table.

### Scenario 3: Integration With Real Workflows

1. As a controller, I want to export a batch for my CA — there's no export button anywhere. I can see the exception list, but I can't download it as CSV/PDF.
2. I want to see which gateway transactions never settled — the dashboard shows a count but no way to drill into it.
3. I want to set thresholds (e.g., "auto-approve matches above 95% confidence") — not configurable anywhere.
4. I want email/Slack notifications when new exceptions appear — no integration.

---

## Part 4: Product Fit Assessment

### Does This Solve a Real Problem? — YES, strongly

Payment reconciliation is genuinely a real, painful, $1B+ industry problem. Finance ops teams at every Razorpay merchant spend hours every week on this. The 3-way match (gateway ↔ bank ↔ ledger) is the right problem shape. The deterministic + AI hybrid is the right architecture.

### Satisfaction Scores (As Both User Types)

| Dimension | Technical User (Dev) | Non-Technical User (Finance Controller) |
|---|---|---|
| Architecture soundness | 8/10 — 5-pass engine, money safety, audit intent are all correct | n/a |
| Code quality | 6/10 — strong money module, but audit-log bugs, dead LLM path, type-safety gaps | n/a |
| Visual design | 8/10 — craft, theme system, animations are well-done | 8/10 — genuinely beautiful |
| Usability | 5/10 — disconnected from real API, no drill-down, no export | 4/10 — Approve/Reject is a black box, no feedback on what happened |
| Trust (for a finance product) | 4/10 — localStorage auth, no immutable audit proof, mock data mixed with real | 3/10 — "Did my action take effect? Where did it go?" |
| Completeness | 6/10 — engine is complete, routes are half-built, dashboard is half-wired | 5/10 — looks complete, but core actions (approve, compensate) don't persist |
| Production-readiness | 3/10 — bugs, no auth, no rate limiting, no CSRF | 2/10 — "I would not put real money through this today" |
| Demo-readiness | 7/10 — visually impressive, scales shown, but Approve/Reject don't work | 6/10 — beautiful but the core interaction is a black box |

**Overall: 5.5/10 for the demo as it stands today. 8/10 potential once the critical bugs are fixed.**

---

## Part 5: What I Would Want As a User

### As a Finance Controller

1. Drill-down on every exception — show me the source CSV rows, the matching attempt history, the confidence breakdown per field.
2. Bulk approve/reject — I have 16,573 unresolved. Give me filters (by amount, by date, by counterparty) and a multi-select.
3. Export to CSV/Excel — I need to share with my CA, my auditor, my CFO.
4. Side-by-side compare view — when looking at a "timing difference" exception, show me the gateway row and the bank row in one screen.
5. Email/Slack alerts on new exceptions or on a match rate dropping below threshold.
6. Saved views / filter presets — "All unapproved > ₹10,000", "Last 24h", "By counterparty."
7. A real audit-log view that queries the DB — show me the actual audit_log rows for a specific match, in chronological order.
8. A way to "unmatch" or "re-run" a specific match without re-running the whole engine.
9. Compensating-entry creation that actually creates one — currently it's a no-op with a label that lies about what it does.
10. Confidence-interval display, not just a point estimate — "We're 85% confident this is a match, but the next 5 most likely matches scored 78/72/68/65. Be careful."

### As a Technical User (Dev/Eng Lead)

1. Real Swagger / OpenAPI docs at `/api/v1/docs` — currently no FastAPI docs route exposed.
2. WebSocket or SSE for run progress — the `/reconcile/run` endpoint should stream progress (Pass 1: 30% done, Pass 2: 50% done, etc.), not return a single response.
3. Run replay — given a run_id, re-run the engine on the same input data and diff the output.
4. A `/metrics` Prometheus endpoint — current throughput, queue depth, last-run timestamp.
5. Structured logging in JSON — for log aggregation (Datadog, ELK).
6. Database migration that actually creates a `compensating_entries` table writer (the schema has the table, no code populates it).
7. The audit-log column fix — it's a one-migration fix and a one-line route change. This is the single highest-leverage fix.
8. Real authentication — OAuth, JWT, or even a hardcoded user list, but server-side, not localStorage.
9. End-to-end test that goes: upload CSVs → run engine → approve an exception → verify audit log has the approval → verify compensating entry created. Currently this loop is broken in three places.
10. A "what changed since last run" diff view — for the audit page, but also for the data model itself (which exceptions are new, which are resolved, which are escalated).

### As a Non-Technical User (CFO, Auditor)

1. Plain-English summary at the top of the dashboard — "Last night we processed 1,247 transactions, matched 83% automatically, and routed 211 items to the exception queue for human review. 3 require your attention today."
2. A confidence meter, not a percentage — visual "We feel pretty good about this" vs "We're not sure."
3. The actual money number, in big text — "₹12.4 crore processed. ₹23,400 unaccounted for. Click here to see why."
4. A "what's blocking us" panel — "Your top 3 reasons for unmatch today: (1) UTR missing on 47 bank settlements, (2) 31 transactions have fees outside the expected range, (3) 12 transactions have date mismatches > 3 days."
5. Trust signals — "Every action you take is logged. Here is your action history. Here is the immutability proof."

---

## Part 6: Prioritized Fix Plan

### P0 — Must Fix Before Demo (Blocking)

| # | Fix | Where | Effort | Impact |
|---|---|---|---|---|
| 1 | Fix pass3.py:137 parent lookup to use `gw_by_id` | src/matching/passes/pass3.py | 5 min | Refunds actually bind. |
| 2 | Fix audit_log INSERT columns in routes | routes/matches.py:111, routes/exceptions.py:85 | 30 min | Approve/reject stop crashing. |
| 3 | Fix Gemini model name `gemini-3.6-flash` → `gemini-1.5-flash` | routes/chat.py:62 | 1 min | Chatbot works. |
| 4 | Add `ON CONFLICT DO NOTHING` to `INSERT INTO matches` | engine.py:345 | 5 min | Engine re-runs idempotently. |
| 5 | Wire Exceptions Approve/Reject to the API | parity-site/src/app/(app)/exceptions/page.tsx | 1 hr | The core demo interaction works. |
| 6 | Remove "Continue as Admin" no-password button | login/page.tsx:50 | 5 min | Stops shipping a backdoor. |
| 7 | Skip `bank_net <= 0` in Pass 2 | pass2.py:110 | 2 min | No false-positive refunds. |

### P1 — Should Fix Before Demo (Quality)

| # | Fix | Where | Effort |
|---|---|---|---|
| 8 | Add `MatchPass.PASS5_EXCEPTION` enum value | types.py + pass5.py | 15 min |
| 9 | Add a real `compensate_exception` that inserts into `compensating_entries` | routes/exceptions.py | 2 hr |
| 10 | Add `aria-current="page"` to active nav, `role="dialog"` to Chatbot, focus trap | layout + Chatbot | 2 hr |
| 11 | Replace `window.location.href` with `router.push` in run page | run/page.tsx:46 | 5 min |
| 12 | Add AbortController to all three fetch calls | Dashboard, Run, Chatbot | 30 min |
| 13 | Add real `useId()` to Recharts gradient IDs | dashboard/page.tsx | 10 min |
| 14 | Add pagination + filters to `/api/v1/matches` and `/exceptions` | routes | 1 hr |
| 15 | Add actor from auth context (not request body) to audit log | routes | 30 min |
| 16 | Centralize money formula — replace duplicates with `src.money.expected_net_amount` | 3 files | 1 hr |
| 17 | Throttle GrainOverlay to 5fps + pause when `document.hidden` | GrainOverlay.tsx | 20 min |
| 18 | Remove hardcoded Bearer `dev_token_123` from frontend | 2 files | 30 min |
| 19 | Replace static `mockExceptions` and `mockAuditTrail` with real API calls | exceptions/page.tsx, audit/page.tsx, store.ts | 3 hr |

### P2 — Post-Demo Improvements (Polish)

| # | Fix | Effort |
|---|---|---|
| 20 | Add drill-down view for exceptions (show source CSV rows) | 4 hr |
| 21 | Add bulk approve/reject with filter | 6 hr |
# 05 — AI Guardrails, Exception Handling & Security

## 1. Sanitization pipeline (before anything reaches an LLM prompt)
Every piece of external text (bank remittance narration, gateway description fields, uploaded
invoice text) passes through a strict parser before it can appear in any LLM prompt or tool-calling
context:
1. Extract only expected field types (dates, amounts, alphanumeric references) via schema-validated
   parsing — reject/quarantine anything that doesn't conform, don't silently pass it through.
2. Strip the text to a bounded length and character set before embedding it in a prompt template.
3. Never concatenate raw untrusted text directly adjacent to system instructions — use clear
   delimiters and treat the extracted text as data, never as instructions.

This is the direct defense against prompt-injection strings hidden in transaction descriptions
(your own red-team plan should inject these deliberately — see `07_TEST_AND_REDTEAM_PLAN.md`).

## 2. SHIELDA-style structured exception handling
Classify agent failures by the phase they originate in — this determines the recovery pattern:
- **Reasoning/Planning-phase failures**: the agent's internal logic broke before it acted — an
  ambiguous instruction, hallucinated resolution strategy, stale context. Recovery: local handling
  via a specific, corrective re-prompt (not a generic retry).
- **Execution-phase failures**: something broke while the agent was interacting with an external
  system — tool timeout, malformed API payload, DB constraint violation. Recovery: exponential
  backoff retry for transient failures; immediate escalation for anything touching a write.
- **Cross-phase cascades**: a silent reasoning failure that only surfaces later as an execution
  error (e.g., a hallucinated field name causes a downstream DB rejection). Trace failures back to
  their root phase in your logs — don't just patch the visible execution error, or the same
  reasoning bug resurfaces in a different shape next time.

**Recovery sequence** (three stages, then escalate):
1. **Local handling** — the narrowest possible fix (corrective re-prompt, single retry).
2. **Flow control** — decide whether to skip the problematic record and continue, or halt the batch.
   Default to skip-and-continue for a single bad record; halt only for systemic failures (e.g., the
   DB connection itself is down).
3. **State recovery** — for an *uncommitted* transaction, a plain DB `ROLLBACK`. For an
   *already-committed* record, a compensating entry (see `02_ARCHITECTURE.md` §5) — never a
   destructive edit.
4. **Escalation** — if all three stages fail, hand off to the human exception queue with the full
   failure trace attached, rather than looping or silently dropping the record.

*(Note: the academic SHIELDA taxonomy this pattern is drawn from documents a much finer-grained
36-type classification across 12 agent artifacts. Implement the 4-stage practical version above for
this build; if a judge asks about the fuller taxonomy, it's fine to say you implemented the
load-bearing pattern rather than the full academic taxonomy, given the timeline — that's an honest,
defensible scoping decision, not a gap to hide.)*

## 3. Cost & latency controls on the AI layer
- **Blocking before spending on embeddings**: only call the embedding API for pairs that already
  agree on hard fields (see `04_MATCHING_ENGINE_SPEC.md` §3) — never the full Cartesian product.
- **Batch embedding calls** rather than one call per candidate pair.
- **Cache embeddings** for recurring vendor description strings (many will repeat across
  transactions) — don't recompute the same string's embedding twice.
- **No LLM in the Tier 1 critical path** — Pass 1/2 deterministic matches must never wait on an API
  call; this is also what makes your throughput number credible.

## 4. Security & access control
- Every API endpoint requires authentication (a scoped API key or JWT is sufficient for a
  buildathon demo — document the pattern even if you don't build full SSO).
- RBAC: only a `reviewer` or `admin` role can call approve/reject endpoints on Tier 2/3 matches;
  read-only roles can view but not mutate.
- Financial data at rest: use your hosting provider's standard encryption-at-rest (e.g., managed
  Postgres with encryption enabled) — don't roll your own encryption for the buildathon scope, but
  do turn on what's available by default and say so in the architecture doc.
- Immutable audit log (§ in `03_DATA_MODEL.md`) — application-level enforcement (no `UPDATE`/`DELETE`
  grants on `audit_log` for the app's DB role) is enough to demonstrate the pattern; full WORM
  storage is a production concern, not a buildathon one — say this explicitly rather than silently
  skipping it.
- Human oversight for anything that mutates financial state at Tier 2/3 is the same pattern
  regulators increasingly require for high-risk automated decisions (this design independently
  matches that direction — it's good engineering on its own merits, not just compliance theater).

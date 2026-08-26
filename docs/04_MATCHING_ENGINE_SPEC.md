# 04 — Matching Engine Specification

## 1. Sequential 5-pass cascade
Each pass runs only against what the previous pass left unmatched. Never re-attempt a pass on
already-matched records.

| Pass | Objective | Logic |
|---|---|---|
| **1 — Exact** | Definitive 1:1 matches | Identical processor account, currency, amount (to the cent), matching external reference, date within a near-zero tolerance window (same day or ±1 day for timezone edge cases) |
| **2 — Tolerance-aware** | Expected timing/fee variance | Date within a configurable window (e.g., T+0 to T+3 for settlement lag), amount matched via the `expected_net_amount` formula (see `02_ARCHITECTURE.md` §1), not raw gross amount |
| **3 — Refund/Reversal** | Bind negative cash flows to their parent | Match `status = 'refunded'/'chargeback'` records to their `parent_transaction_id`; verify the refund amount doesn't exceed the original |
| **4 — Split/Roll-up** | Batched settlements | Subset-sum: find the combination of unmatched `canonical_transactions.expected_net_amount` values (within a date window) that sums to a `bank_settlements.net_amount`, within a small rounding tolerance (₹0.01–0.05 aggregate). Use a bounded dynamic-programming subset-sum, not brute-force combinatorics — cap the candidate pool per settlement batch (e.g., transactions within the same 3-day window and same processor account) before running subset-sum, or this pass won't scale |
| **5 — Route to exception queue** | Everything still unmatched | Classify by `category` (timing_difference / transaction_error / bank_initiated / unresolved) before handing to the probabilistic layer |

**Recall over precision, applied concretely**: if Pass 1–4 logic is *uncertain* whether a candidate
qualifies (e.g., subset-sum has two candidate groupings that both sum correctly), do not guess —
route both candidates to the exception queue with both options shown, rather than picking one
silently. A wrong auto-match is a real error; a surfaced ambiguity is a few seconds of review time.

## 2. Probabilistic layer — Fellegi-Sunter model (for Pass 5 residuals only)

For a candidate pair (one Side A record, one Side B record), define the agreement vector γ across
J fields (amount, date, reference, vendor description, etc.). For each field:

- **m-probability**: `P(field agrees | records are a true match)` — estimate this from your
  synthetic ground truth (you generated the data, so you know the true match rate per field).
  Low m-probability on a field that *should* usually agree signals systemic noise (OCR errors,
  truncation) in that field, not necessarily a bad match.
- **u-probability**: `P(field agrees | records are NOT a match)` — driven by field cardinality. A
  match on transaction date has high u-probability (many transactions share a date, so agreement by
  coincidence is common). A match on a 20-character reference ID has near-zero u-probability
  (agreement by coincidence is essentially impossible).

**Bayes factor**: `K = m / u`
**Log-weight** (additive across fields): `ω = log₂(m / u)`

Composite score for the pair: `Σ ω_j` across all compared fields.

- Score ≥ `threshold_upper` → auto-classified as a match (still logged with full field-level
  breakdown — "automatic" doesn't mean "unlogged")
- Score ≤ `threshold_lower` → rejected, stays in exception queue
- Between thresholds → routed to HITL with the full weight breakdown shown to the reviewer

**Concrete worked numbers** (illustrative, calibrate against your own synthetic data):
- Amount agrees exactly: m = 0.97, u = 0.02 → K = 48.5, ω = log₂(48.5) ≈ 5.6
- Reference ID agrees (rare 20-char string): m = 0.90, u = 0.001 → K = 900, ω ≈ 9.8
- Date agrees within window: m = 0.95, u = 0.30 → K ≈ 3.2, ω ≈ 1.7
- Sum ≈ 17.1 → well above a threshold_upper of, say, 10 → auto-match

Calibrate m/u empirically from your synthetic generator's known ground truth before the demo —
don't hand-pick thresholds that happen to make the demo dataset look good; report the calibration
methodology, since "measured accuracy" is explicitly part of the judging bar.

## 3. Semantic layer — embeddings for lexically-different, semantically-identical text
For text fields (vendor descriptions, narration strings) that survive to this layer:
1. **Blocking first**: only compute embeddings for pairs that already agree on hard fields
   (currency, amount band, date window). Never run embeddings on the full Cartesian product — it's
   slow and, at API-metered cost, unnecessarily expensive.
2. Compute cosine similarity between the two text embeddings.
3. Feed the similarity score into the pair's composite Fellegi-Sunter score as an additional field
   (or as a standalone gate below a calibrated similarity threshold, e.g. 0.85, if you don't want to
   fold it into the F-S weight sum for v1 — simpler to implement, slightly less rigorous).

## 4. Active learning loop (v2 / stretch — note in the pitch as a designed extension point even if not built)
Rather than hand-labeling every pair, identify the pairs whose composite score sits closest to the
decision boundary (most uncertain) and route only those to a human for a label. Refit m/u
estimates periodically from the accumulated labels. Worth mentioning as a designed-but-not-built
extension if you're out of time — shows you understand where this goes next, without overclaiming
what's actually implemented.

## 5. Confidence → tier mapping (the table the approval UI is built around)

| Match source | Confidence | Tier | Ledger mutation |
|---|---|---|---|
| Pass 1 (exact) | N/A — deterministic | HOOTL | Auto-posts immediately, logged |
| Pass 2 (tolerance) | N/A — deterministic, within configured bounds | HOOTL | Auto-posts, logged |
| Pass 3/4 (refund, split) | N/A — deterministic but higher blast radius | HOTL | Auto-prepared, posted after a short monitored window unless overridden |
| Fellegi-Sunter above threshold_upper | Score-based | HOTL | Auto-prepared, dashboard-visible, override window before posting |
| Fellegi-Sunter between thresholds, or semantic-only | Score-based | HITL | Drafted only — explicit human "Approve" required before any write |
| Below threshold_lower / unresolved | N/A | HITL | Stays in exception queue, no draft posted |

# 07 — Synthetic Data, Testing & Red-Team Plan

## 1. Synthetic data generation
Build the generator **before** the matching engine — you need realistic (imperfect) data from day
one, not clean fixtures that make Pass 1 look artificially strong.

- Use Python `Faker` for merchant names, references, descriptions.
- Model transaction amounts with an **exponential distribution**
  (`numpy.random.exponential(scale=...)`), not uniform random — real transaction ledgers are mostly
  small transactions with a long tail of large ones, and a matcher that only handles uniform test
  data will behave unpredictably on real distributions.
- Generate all three sources (gateway transactions, bank settlements, merchant ledger) from a shared
  ground-truth set so you know the *true* match for every record — this is what makes "measured
  accuracy," not just "match rate," reportable.

## 2. Deliberate anomaly injection (this is what actually tests the system)
Perfectly clean synthetic data proves nothing about the exception-handling architecture. Inject,
with a documented injection rate per category:
- **Timing shifts**: randomized lag days between gateway timestamp and bank settlement date —
  stresses Pass 2.
- **String truncation/typos**: remove vowels, swap characters, append arbitrary suffixes to vendor
  descriptions/references — stresses the Fellegi-Sunter reference-field agreement and the semantic
  embedding layer.
- **Missing fields / duplicate IDs**: use a `np.random.choice` with a defined failure rate (e.g.,
  5%) to drop unique identifiers or duplicate reference strings — stresses idempotency constraints
  and forces fallback to semantic matching.
- **Prompt injection strings**: embed instruction-like text inside synthetic transaction
  descriptions (e.g., text that tries to instruct a downstream LLM to alter a status field) —
  stresses the sanitization pipeline in `05_AI_GUARDRAILS_SPEC.md` §1. Verify these are stripped
  before ever reaching a prompt, and log a specific alert type when one is caught.
- **Batch fragmentation**: for Pass 4 testing, generate settlement batches from known subsets of
  10–200 transactions with a small aggregate rounding delta, to verify subset-sum matching scales
  and stays correct under rounding noise.

## 3. Test matrix
| Layer | Test type | What it proves |
|---|---|---|
| Each of Pass 1–4 | Unit tests, explicit edge cases (exact boundary of tolerance window, zero-amount transactions, single-transaction "batches") | Deterministic logic is correct, not just usually-right |
| Fellegi-Sunter | Unit test against hand-calculated m/u values for a known agreement vector | The weight math matches the spec in `04_MATCHING_ENGINE_SPEC.md` §2 |
| Sanitization pipeline | Fuzz test with injected prompt-injection strings | No untrusted text reaches a prompt unsanitized |
| Full pipeline | Integration test at 10,000+ synthetic records | Throughput + accuracy numbers reported are real, not extrapolated from the 50-record demo |
| Idempotency | Replay the same raw event 3x | No duplicate `canonical_transactions`/`matches` rows created |
| Compensating entries | Attempt to `UPDATE` a posted match row directly | Fails at the DB grant level, not just the app level |

## 4. Reporting template (use this exact structure in the dashboard and the pitch)
```
Total records processed:        12,000
Automated match rate:           94.6%  (Pass1: 86.0% / Pass2: 5.3% / Pass3: 1.8% / Pass4: 3.7% / F-S+semantic: 2.8%)
Net discrepancy value:          ₹1,420.50
Exceptions by category:         timing_difference: 18 | transaction_error: 6 | bank_initiated: 4 | unresolved: 22
Precision vs. synthetic ground truth:  99.1%
Recall vs. synthetic ground truth:     99.6%
Throughput:                     2,850 records/sec (p95 latency: 42ms per record)
```
Report this exact set of numbers, at the 10,000+ scale, in the pitch — this is the direct answer to
"throughput plus measured accuracy plus an honest exception list."

## 5. Red-team checklist (run before submission)
- [ ] Prompt injection strings in transaction descriptions never alter matcher behavior or leak
      into an LLM response unsanitized
- [ ] Duplicate webhook replay never creates duplicate ledger state
- [ ] Subset-sum (Pass 4) doesn't silently pick a wrong grouping when two candidate subsets both sum
      correctly — verify it routes ambiguous cases to review instead
- [ ] A deliberately malformed raw event doesn't crash the ingestion pipeline (graceful
      quarantine, not an unhandled exception)
- [ ] Approving a Tier 3 match without a `reviewer_id` is rejected by the API, not silently allowed

# 09 — Submission Kit

Razorpay's stated process: **public GitHub repo → 5-minute pitch → architecture → panel interview.**
Build for all four, not just the code.

## Repo structure
```
/
├── AGENTS.md                  # cross-tool agent instructions
├── CLAUDE.md                  # imports AGENTS.md
├── README.md                  # see template below
├── docs/                      # this entire spec pack — keep it in the repo, not just locally
├── src/
│   ├── ingestion/
│   ├── matching/               # passes 1-4, fellegi_sunter.py, semantic.py
│   ├── exceptions/
│   ├── api/
│   └── dashboard/
├── tests/
│   ├── unit/
│   └── integration/            # includes the 10,000-record scale test
├── synthetic_data/
│   └── generator.py
└── demo/
    └── seed_data.sql           # a reproducible demo dataset judges can re-run
```

## README.md template
```markdown
# [Project Name] — AI-Assisted Payment Reconciliation Engine

## The problem
[2-3 sentences, in your own words, on why 3-way payment reconciliation is broken today]

## What this does
Three-way reconciliation (gateway ↔ bank settlement ↔ merchant ledger) with a deterministic
5-pass matching core, a Fellegi-Sunter + semantic-embedding layer for what deterministic logic
can't resolve, and risk-tiered human approval for anything that mutates financial state.

## The numbers (measured, not cherry-picked)
Total processed: X | Automated match rate: X% | Throughput: X records/sec | 
Precision/Recall vs. synthetic ground truth: X%/X% | Open exceptions: X

## Architecture
[Link to docs/02_ARCHITECTURE.md, embed the diagram]

## Why AI is used exactly where it is (and not elsewhere)
[2-3 sentences — this is the single most panel-relevant paragraph in the README]

## Run it yourself
[exact commands — this needs to actually work when a judge tries it]

## What's deliberately out of scope
[Copy from docs/01_PRD.md — scoping honestly reads as maturity, not weakness]
```

## 5-minute pitch script (structure, not word-for-word — fill in your own numbers/voice)
- **0:00–0:45 — The problem, concretely.** Not "reconciliation is hard" — the actual mechanic:
  gateway transactions, batched bank settlements net of MDR + GST, merchant ledger expectations,
  and why these three rarely agree by default.
- **0:45–1:30 — What makes this different from a naive matcher.** Deterministic core does the math,
  AI only handles what deterministic logic genuinely can't (typos, semantic drift, ambiguous
  batches) — and never mutates the ledger without the right level of human sign-off.
- **1:30–3:00 — Live demo.** Run the pipeline live if possible; if not, show the recorded run at
  scale. Say the numbers out loud: throughput, match rate, precision/recall, exception count. Open
  the exception list and show a real unresolved item — this is the moment that proves honesty over
  a cherry-picked demo.
- **3:00–4:00 — Architecture, fast.** The diagram from `02_ARCHITECTURE.md`, narrated in 60 seconds:
  ingestion → deterministic passes → probabilistic layer → tiered approval → audit trail.
- **4:00–5:00 — What you'd build next.** Be specific: split/roll-up at larger batch sizes,
  settlement-lag forecasting, active learning on the Fellegi-Sunter thresholds. Shows you know where
  the ceiling is, not just where you stopped.

## Panel interview — likely questions, and how to actually answer them
- **"Why didn't the LLM just do the matching?"** → Because a control that a SOX/audit process would
  need to trust must be deterministic and reproducible; the LLM's role is bounded to exactly what
  deterministic logic can't do (semantic text matching, drafting explanations), never arithmetic or
  ledger writes.
- **"What happens if your matcher is wrong?"** → Nothing posts without the right tier of approval;
  errors on already-posted records are corrected with compensating entries, never silent edits — the
  full history, including the mistake, stays reconstructable.
- **"How does this scale past your demo dataset?"** → Point directly at the 10,000+ record
  throughput number and the bounded subset-sum implementation (explain why it's bounded, not
  brute-force).
- **"What did you deliberately not build?"** → Answer directly from `01_PRD.md`'s out-of-scope list.
  Confident scoping reads better than pretending you built everything.

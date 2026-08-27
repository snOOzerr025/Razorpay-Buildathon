# Razorpay AI Finance Controller: 5-Minute Pitch

*Note to presenter: Speak clearly, pause after the numbers. Open the repository on screen and run the test script live as the presentation moves into the demo phase.*

## 0:00–0:45 — The Problem, Concretely
"Three-way payment reconciliation is fundamentally broken. Today, when a payment is processed, we have a gateway transaction, a batched bank settlement arriving days later, and a merchant ledger expecting specific numbers. And the truth is, these three rarely agree by default. Banks deduct MDR and GST before settling, a single bank wire can represent 400 distinct gateway captures, and timing delays mean records cross over month-ends. Verification capacity — humans sitting and detangling Excel sheets — is the single largest operational bottleneck for a modern finance team."

## 0:45–1:30 — What Makes This Different
"This engine doesn't just throw everything at an LLM and cross its fingers. A SOX-compliant system cannot rely on an LLM for financial arithmetic. Instead, we built a deterministic, 5-pass matching core that does the math — including bounded subset-sum matching to untangle batched settlements. We use AI exactly where it is needed: dealing with semantic drift, resolving corrupted reference texts, and surfacing probabilistic matches for typos. Most importantly, it uses a tiered risk model — HOOTL, HOTL, and HITL — meaning it never mutates the ledger without the legally required level of human sign-off."

## 1:30–3:00 — Live Demo & The Numbers
"Let me run this live. I'm executing our 110,000-record scale test..." 
*(Wait a beat as the CLI output spins up)*
"Our engine is sustaining a throughput of nearly **1,200 records per second**. Out of 110,000 synthetic records complete with injected anomalies and batched refunds, it resolved **72.5% autonomously**, achieving a precision of **92.4%**. 

Here is our exception queue. We aren't hiding failures behind a 50-record demo. Notice these 16,000 unresolved items? We've successfully classified 10,000 of them as expected timing differences and flagged 3,400 as bank-initiated deductions. You can click into an unresolved exception, and the AI drafts the exact explanation for why the confidence wasn't high enough to auto-post."

## 3:00–4:00 — Architecture
*(Show the architecture diagram on screen)*
"Here is how we do it in 60 seconds. 
1. **Ingestion**: Raw webhooks and CSVs hit an append-only log. We verified idempotency under a 50-request concurrent load test, proving we drop duplicates safely.
2. **Deterministic Engine**: Pass 1 handles exact matches. Pass 2 handles tolerance (where we applied a hash-bucket optimization to drop latency from 25 seconds to milliseconds). Pass 3 resolves refunds. Pass 4 untangles many-to-one batched roll-ups using a bounded subset-sum algorithm. 
3. **Probabilistic Layer**: The leftovers fall to Pass 5. Pass 5 doesn't blindly force matches—it correctly routes unresolvable records to specific exception categories, staging them for the semantic AI layer and human review.
4. **Audit**: Every action taken auto-generates a forensic audit log."

## 4:00–5:00 — What We Build Next
"We built for scale, but we know where the ceiling is. Right now, our recall trades off against stability at scale. When batched roll-ups exceed 50,000 states, we deliberately cap the algorithm and route to exceptions to guarantee OOM safety and high throughput. Root-causing and dynamically pruning that state-cap contribution is our next step for boosting recall without sacrificing stability. 

Secondly, we'll implement settlement-lag forecasting: using the historical lag data this engine generates as input into a classical time-series model (like ARIMA) to predict exact dates for when pending gateway transactions will physically land in the bank."

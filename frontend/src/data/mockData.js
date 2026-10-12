/**
 * Comprehensive Benchmark & Demo Data for Parity Reconciliation Engine
 * Calibrated against the 110,377-record scale test benchmark for Razorpay Buildathon
 */

export const BENCHMARK_METRICS = {
  total_processed: 110377,
  automated_match_rate_pct: 72.3,
  net_discrepancy_value: 482910.50,
  throughput_records_per_sec: 2850,
  exceptions_by_category: {
    UNRESOLVED: 16573,
    TIMING_DIFFERENCE: 10383,
    BANK_INITIATED: 3431,
    TRANSACTION_ERROR: 196,
  },
  confidence_score_distribution: {
    p10: 0.65,
    p50: 0.88,
    p90: 0.99,
  },
  pass_breakdown: {
    pass1_exact: 45210,
    pass2_tolerance: 28450,
    pass3_refund: 3890,
    pass4_split: 2240,
    fellegi_sunter: 30587,
  },
  waterfall: [
    { stage: 'Total Ingested', count: 110377, pct: 100, color: 'var(--accent-blue)' },
    { stage: 'Pass 1: Exact Match', count: 45210, pct: 40.96, color: 'var(--color-pass1)' },
    { stage: 'Pass 2: Tolerance & Fee', count: 28450, pct: 25.77, color: 'var(--color-pass2)' },
    { stage: 'Pass 3: Refund Linkage', count: 3890, pct: 3.52, color: 'var(--color-pass3)' },
    { stage: 'Pass 4: Split Subset-Sum', count: 2240, pct: 2.03, color: 'var(--color-pass4)' },
    { stage: 'Exceptions & HITL Queue', count: 30587, pct: 27.71, color: 'var(--status-danger)' },
  ],
}

export const INITIAL_MATCHES = [
  {
    id: 'MTC-1001',
    match_pass: 'pass1_exact',
    tier: 'hootl',
    status: 'confirmed',
    confidence_score: null,
    created_at: '2026-10-11T09:12:00Z',
    gateway: {
      id: 'gw_tx_091201',
      order_id: 'order_91820491',
      processor_id: 'razorpay_gateway',
      gross_amount: 3500.00,
      currency: 'INR',
      mdr_fee_pct: 0.018,
      gst_rate: 0.18,
      tds_amount: 0.00,
      captured_at: '2026-10-10 14:22:10 UTC',
      payment_method: 'UPI (GooglePay)',
    },
    bank: {
      utr: 'UTR938472910481',
      batch_id: 'BATCH_20261011_01',
      net_amount: 3425.66,
      settlement_date: '2026-10-11',
      account_number: 'HDFC-**8821',
    },
    ledger: {
      entry_id: 'LED_20261010_491',
      account_code: '1100-MERCHANT-REVENUE',
      expected_amount: 3425.66,
      posted_date: '2026-10-10',
    },
    math: {
      gross: 3500.00,
      mdr: 63.00,
      gst: 11.34,
      tds: 0.00,
      expected_net: 3425.66,
      bank_net: 3425.66,
      delta: 0.00,
    },
    rationale: 'Pass 1 Exact: Identical account, currency, amount, and reference identifier. Automated Tier 1 HOOTL auto-post.',
  },
  {
    id: 'MTC-1002',
    match_pass: 'pass2_tolerance',
    tier: 'hootl',
    status: 'confirmed',
    confidence_score: null,
    created_at: '2026-10-11T09:15:30Z',
    gateway: {
      id: 'gw_tx_091530',
      order_id: 'order_84920188',
      processor_id: 'razorpay_gateway',
      gross_amount: 12500.00,
      currency: 'INR',
      mdr_fee_pct: 0.020,
      gst_rate: 0.18,
      tds_amount: 12.50,
      captured_at: '2026-10-09 18:45:00 UTC',
      payment_method: 'Credit Card (Visa Business)',
    },
    bank: {
      utr: 'UTR827104928173',
      batch_id: 'BATCH_20261011_02',
      net_amount: 12192.50,
      settlement_date: '2026-10-11',
      account_number: 'ICICI-**4019',
    },
    ledger: {
      entry_id: 'LED_20261009_188',
      account_code: '1100-MERCHANT-REVENUE',
      expected_amount: 12192.50,
      posted_date: '2026-10-09',
    },
    math: {
      gross: 12500.00,
      mdr: 250.00,
      gst: 45.00,
      tds: 12.50,
      expected_net: 12192.50,
      bank_net: 12192.50,
      delta: 0.00,
    },
    rationale: 'Pass 2 Tolerance: T+2 date window verified. Gross/net fee normalization derived (MDR ₹250.00 + GST ₹45.00 + TDS ₹12.50). Match verified.',
  },
  {
    id: 'MTC-1003',
    match_pass: 'pass3_refund',
    tier: 'hotl',
    status: 'pending_hotl',
    confidence_score: 0.96,
    created_at: '2026-10-11T09:20:10Z',
    gateway: {
      id: 'gw_ref_092010',
      order_id: 'order_73819200',
      parent_transaction_id: 'gw_tx_081190',
      processor_id: 'razorpay_gateway',
      gross_amount: -2800.00,
      currency: 'INR',
      mdr_fee_pct: 0.0,
      gst_rate: 0.0,
      tds_amount: 0.0,
      captured_at: '2026-10-10 11:30:15 UTC',
      payment_method: 'Refund / UPI Reversal',
    },
    bank: {
      utr: 'UTR718294018274',
      batch_id: 'BATCH_20261011_04',
      net_amount: -2800.00,
      settlement_date: '2026-10-11',
      account_number: 'HDFC-**8821',
    },
    ledger: {
      entry_id: 'LED_20261010_REF',
      account_code: '2100-REFUND-CLEARING',
      expected_amount: -2800.00,
      posted_date: '2026-10-10',
    },
    math: {
      gross: -2800.00,
      mdr: 0.00,
      gst: 0.00,
      tds: 0.00,
      expected_net: -2800.00,
      bank_net: -2800.00,
      delta: 0.00,
    },
    rationale: 'Pass 3 Refund: Linked reversal to parent transaction gw_tx_081190. High-trust Human-On-The-Loop review queue.',
  },
  {
    id: 'MTC-1004',
    match_pass: 'pass4_split',
    tier: 'hotl',
    status: 'pending_hotl',
    confidence_score: 0.94,
    created_at: '2026-10-11T09:22:45Z',
    gateway: {
      id: 'gw_split_bundle_4',
      order_id: 'order_bundle_4_txns',
      processor_id: 'razorpay_gateway',
      gross_amount: 18500.00,
      currency: 'INR',
      mdr_fee_pct: 0.019,
      gst_rate: 0.18,
      tds_amount: 0.00,
      captured_at: '2026-10-10 (4 batched captures)',
      payment_method: 'Batched Merchant Settlements',
    },
    bank: {
      utr: 'UTR615283940192',
      batch_id: 'BATCH_20261011_SPLIT_09',
      net_amount: 18090.27,
      settlement_date: '2026-10-11',
      account_number: 'AXIS-**1092',
    },
    ledger: {
      entry_id: 'LED_BATCH_SPLIT_09',
      account_code: '1100-MERCHANT-REVENUE',
      expected_amount: 18090.27,
      posted_date: '2026-10-10',
    },
    math: {
      gross: 18500.00,
      mdr: 351.50,
      gst: 63.27,
      tds: 0.00,
      expected_net: 18090.27,
      bank_net: 18090.27,
      delta: 0.00,
    },
    rationale: 'Pass 4 Split / Roll-up: Bounded subset-sum algorithm successfully resolved 4 discrete gateway captures into single bank settlement wire.',
  },
  {
    id: 'MTC-1005',
    match_pass: 'fellegi_sunter',
    tier: 'hitl',
    status: 'pending_hitl',
    confidence_score: 0.78,
    created_at: '2026-10-11T09:25:00Z',
    gateway: {
      id: 'gw_tx_092500',
      order_id: 'order_49102847',
      processor_id: 'razorpay_gateway',
      gross_amount: 7850.00,
      currency: 'INR',
      mdr_fee_pct: 0.021,
      gst_rate: 0.18,
      tds_amount: 7.85,
      captured_at: '2026-10-08 22:14:00 UTC',
      payment_method: 'NetBanking (SBI)',
    },
    bank: {
      utr: 'UTR501928374619',
      batch_id: 'BATCH_20261011_FSR',
      net_amount: 7648.17,
      settlement_date: '2026-10-11',
      account_number: 'SBI-**3920',
    },
    ledger: {
      entry_id: 'LED_20261008_847',
      account_code: '1100-MERCHANT-REVENUE',
      expected_amount: 7648.17,
      posted_date: '2026-10-08',
    },
    math: {
      gross: 7850.00,
      mdr: 164.85,
      gst: 29.67,
      tds: 7.85,
      expected_net: 7647.63,
      bank_net: 7648.17,
      delta: 0.54,
    },
    rationale: 'Fellegi-Sunter Probabilistic Match: Agreement score 14.8/20. Minor rounding drift of ₹0.54 between bank rounding and gateway calculation. Requires Human-In-The-Loop approval.',
  },
  {
    id: 'MTC-1006',
    match_pass: 'semantic_embedding',
    tier: 'hitl',
    status: 'pending_hitl',
    confidence_score: 0.65,
    created_at: '2026-10-11T09:28:12Z',
    gateway: {
      id: 'gw_tx_092812',
      order_id: 'order_corrupt_narration',
      processor_id: 'razorpay_gateway',
      gross_amount: 4500.00,
      currency: 'INR',
      mdr_fee_pct: 0.018,
      gst_rate: 0.18,
      tds_amount: 0.00,
      captured_at: '2026-10-09 16:10:00 UTC',
      payment_method: 'UPI QR Code',
    },
    bank: {
      utr: 'UTR491827364510',
      batch_id: 'BATCH_20261011_SEM',
      net_amount: 4404.42,
      settlement_date: '2026-10-11',
      account_number: 'KOTAK-**7712',
    },
    ledger: {
      entry_id: 'LED_20261009_SEM',
      account_code: '1100-MERCHANT-REVENUE',
      expected_amount: 4404.42,
      posted_date: '2026-10-09',
    },
    math: {
      gross: 4500.00,
      mdr: 81.00,
      gst: 14.58,
      tds: 0.00,
      expected_net: 4404.42,
      bank_net: 4404.42,
      delta: 0.00,
    },
    rationale: 'Semantic AI Match: Bank narration suffered truncation ("SETTL RZRPY OR..."). Embedding cosine similarity 0.912 against sanitized order description. Flagged for Auditor review.',
  },
  {
    id: 'MTC-1007',
    match_pass: 'pass1_exact',
    tier: 'hootl',
    status: 'confirmed',
    confidence_score: null,
    created_at: '2026-10-11T09:30:00Z',
    gateway: {
      id: 'gw_tx_093000',
      order_id: 'order_55102938',
      processor_id: 'razorpay_gateway',
      gross_amount: 1999.00,
      currency: 'INR',
      mdr_fee_pct: 0.020,
      gst_rate: 0.18,
      tds_amount: 0.00,
      captured_at: '2026-10-10 19:01:00 UTC',
      payment_method: 'UPI Intent',
    },
    bank: {
      utr: 'UTR381928475610',
      batch_id: 'BATCH_20261011_07',
      net_amount: 1951.82,
      settlement_date: '2026-10-11',
      account_number: 'HDFC-**8821',
    },
    ledger: {
      entry_id: 'LED_20261010_938',
      account_code: '1100-MERCHANT-REVENUE',
      expected_amount: 1951.82,
      posted_date: '2026-10-10',
    },
    math: {
      gross: 1999.00,
      mdr: 39.98,
      gst: 7.20,
      tds: 0.00,
      expected_net: 1951.82,
      bank_net: 1951.82,
      delta: 0.00,
    },
    rationale: 'Pass 1 Exact: Zero delta, verified reference, auto-posted under HOOTL.',
  },
]

export const INITIAL_EXCEPTIONS = [
  {
    id: 'EXC-2001',
    category: 'TIMING_DIFFERENCE',
    record_type: 'bank_settlement',
    record_id: 'BNK_SETTL_884920',
    dollar_value: 22100.25,
    status: 'open',
    run_id: 'run_scale_110k',
    created_at: '2026-10-11T08:30:00Z',
    resolved_at: null,
    root_cause: 'T+3 Settlement Lag across weekend. Gateway payment captured on Friday 23:58 IST settled by bank on Tuesday morning. Projected to clear in next cycle.',
    recommendation: 'Monitor automated clearance in next batch. No ledger compensation required.',
    source_details: {
      account: 'HDFC-**8821',
      amount: '₹22,100.25',
      value_date: '2026-10-11',
      narration: 'NEFT CR-RAZORPAY SOFTWARE-SETTL-BATCH-884920',
    },
  },
  {
    id: 'EXC-2002',
    category: 'BANK_INITIATED',
    record_type: 'bank_settlement',
    record_id: 'BNK_DEDUCT_491029',
    dollar_value: 15600.00,
    status: 'open',
    run_id: 'run_scale_110k',
    created_at: '2026-10-11T08:32:00Z',
    resolved_at: null,
    root_cause: 'Bank-initiated debit: Annual nodal account maintenance charge and GST withholding deducted directly from settlement batch.',
    recommendation: 'Post Compensating Entry to Expense Account 5200 (Bank Service Charges) to balance merchant ledger.',
    source_details: {
      account: 'ICICI-**4019',
      amount: '₹15,600.00',
      value_date: '2026-10-11',
      narration: 'DEBIT: ANNUAL NODAL MAINTENANCE & GST LEVY',
    },
  },
  {
    id: 'EXC-2003',
    category: 'UNRESOLVED',
    record_type: 'canonical_transaction',
    record_id: 'GW_TX_9948201',
    dollar_value: 12500.00,
    status: 'open',
    run_id: 'run_scale_110k',
    created_at: '2026-10-11T08:35:00Z',
    resolved_at: null,
    root_cause: 'Missing bank settlement credit. Gateway transaction was marked "captured" but no matching UTR or credit received within 5-day SLA window.',
    recommendation: 'Escalate to Bank Operations desk for UTR trace. Check processor gateway status.',
    source_details: {
      account: 'Razorpay Gateway',
      amount: '₹12,500.00',
      value_date: '2026-10-06',
      narration: 'Order #ORD_9948201 - Merchant Enterprise Tech',
    },
  },
  {
    id: 'EXC-2004',
    category: 'TRANSACTION_ERROR',
    record_type: 'canonical_transaction',
    record_id: 'GW_TX_5510294',
    dollar_value: 1250.75,
    status: 'open',
    run_id: 'run_scale_110k',
    created_at: '2026-10-11T08:38:00Z',
    resolved_at: null,
    root_cause: 'Duplicate webhook capture payload with minor timestamp skew. First instance reconciled in Pass 1; second instance rejected as duplicate.',
    recommendation: 'Acknowledge duplicate and mark resolved. SHA-256 idempotency hash preserved.',
    source_details: {
      account: 'Razorpay Gateway',
      amount: '₹1,250.75',
      value_date: '2026-10-10',
      narration: 'Duplicate payload key hash: 8f4b2c1e...',
    },
  },
  {
    id: 'EXC-2005',
    category: 'UNRESOLVED',
    record_type: 'canonical_transaction',
    record_id: 'GW_TX_3819204',
    dollar_value: 9200.50,
    status: 'open',
    run_id: 'run_scale_110k',
    created_at: '2026-10-11T08:40:00Z',
    resolved_at: null,
    root_cause: 'Subset-Sum boundary exceeded: 14 candidates detected but combined state space surpassed the 50,000 threshold safety bound (OOM safety guardrail).',
    recommendation: 'Perform manual auditor bundle match or split into sub-windows.',
    source_details: {
      account: 'Razorpay Gateway',
      amount: '₹9,200.50',
      value_date: '2026-10-10',
      narration: 'Batch candidate pool 14 items',
    },
  },
]

export const INITIAL_AUDIT_LOG = [
  {
    id: 140,
    entity_type: 'match',
    entity_id: 'MTC-1001',
    action: 'auto_matched',
    actor: 'system:pass1_exact',
    occurred_at: '2026-10-11T09:12:00Z',
    rationale: {
      rule: 'pass1_exact',
      tier: 'hootl',
      tolerance_days: 0,
      fee_delta: 0,
      confidence: 1.0,
      evidence: 'Exact match on RRN and net amount ₹3,425.66',
    },
  },
  {
    id: 141,
    entity_type: 'match',
    entity_id: 'MTC-1002',
    action: 'auto_matched',
    actor: 'system:pass2_tolerance',
    occurred_at: '2026-10-11T09:15:30Z',
    rationale: {
      rule: 'pass2_tolerance',
      tier: 'hootl',
      tolerance_days: 2,
      fee_normalized: { mdr: 250.0, gst: 45.0, tds: 12.5 },
      confidence: 0.998,
      evidence: 'Gross-to-net derivation matches bank credit exactly',
    },
  },
  {
    id: 142,
    entity_type: 'match',
    entity_id: 'MTC-1004',
    action: 'auto_matched',
    actor: 'system:pass4_split_subset_sum',
    occurred_at: '2026-10-11T09:22:45Z',
    rationale: {
      rule: 'pass4_split',
      tier: 'hotl',
      subset_sum_items: 4,
      total_bundled: 18090.27,
      confidence: 0.94,
      evidence: 'Bounded DP solved 4-item bundle without ambiguity',
    },
  },
  {
    id: 143,
    entity_type: 'exception',
    entity_id: 'EXC-2002',
    action: 'exception_raised',
    actor: 'system:pass5_residual_classifier',
    occurred_at: '2026-10-11T08:32:00Z',
    rationale: {
      category: 'BANK_INITIATED',
      amount: 15600.0,
      reason: 'No corresponding gateway transaction for bank debit',
    },
  },
  {
    id: 144,
    entity_type: 'match',
    entity_id: 'MTC-1000',
    action: 'approved',
    actor: 'user:auditor_priya',
    occurred_at: '2026-10-11T09:05:12Z',
    rationale: {
      approval_note: 'Verified against bank physical slip; MDR waiver confirmed',
      tier: 'hitl',
      previous_status: 'pending_hitl',
    },
  },
]

export const AI_KNOWLEDGE_BASE = [
  {
    keywords: ['5 pass', 'passes', 'pass 1', 'pass 2', 'pass 3', 'pass 4', 'architecture', 'engine'],
    reply: `### Parity 5-Pass Reconciliation Architecture

1. **Pass 1 — Exact Match (HOOTL)**: Identical account, currency, amount, and reference identifier. Zero tolerance. Auto-posts and commits immediately.
2. **Pass 2 — Tolerance & Fee Normalization (HOOTL)**: Derives net expected amount using the canonical formula:
   \`Net = Gross - (Gross × MDR) - (Gross × MDR × GST) - TDS\`
   Employs a ±3 day date window and hash-bucket indexing to match within sub-milliseconds.
3. **Pass 3 — Refund & Chargeback Linkage (HOTL)**: Links refunds and reversals back to the original parent charge ID (\`parent_transaction_id\`), preventing orphaned adjustments.
4. **Pass 4 — Split / Roll-up (HOTL)**: Solves many-to-one batched settlements using a bounded subset-sum algorithm (capped at 50,000 states for OOM safety).
5. **Pass 5 — Residual Exception Router & AI Layer (HITL)**: Unresolved transactions are classified into risk-tiered exception queues and staged for Fellegi-Sunter / semantic embedding matching.`
  },
  {
    keywords: ['mdr', 'gst', 'tds', 'fee', 'formula', 'math', 'calculate'],
    reply: `### Financial Settlement Math (Deterministic Single Source of Truth)

In compliance with **AGENTS.md Rule 1**, the LLM *never* computes financial totals or taxes. All arithmetic is executed in strict Python \`Decimal\` with banker's half-up rounding (\`src/money.py\`).

The formula is:
- **MDR Fee**: \`round_half_up(gross × mdr_pct)\`
- **GST on MDR (18%)**: \`round_half_up(mdr_fee × gst_rate)\`
- **TDS Withholding**: Direct deductible \`tds_amount\`
- **Expected Net Amount**: \`gross - mdr_fee - gst_amount - tds_amount\`

Every match records this complete breakdown in its explanation payload for instant forensic auditing.`
  },
  {
    keywords: ['tier', 'hootl', 'hotl', 'hitl', 'risk', 'sox', 'approval'],
    reply: `### Risk-Tiered Governance (SOX-Compliant)

Parity enforces three distinct operational tiers:
- **Tier 1: HOOTL (Human-Out-Of-The-Loop)**: High-confidence deterministic matches (Pass 1 & 2). Auto-posts and logs without human intervention.
- **Tier 2: HOTL (Human-On-The-Loop)**: Batched roll-ups and refunds (Pass 3 & 4) or Fellegi-Sunter score ≥ 0.90. Posted automatically with telemetry monitored on audit dashboards.
- **Tier 3: HITL (Human-In-The-Loop)**: Probabilistic matches (< 0.90 confidence) and exceptions. Financial state **never** mutates until an authorized human clicks "Approve" (recorded in immutable audit log).`
  },
  {
    keywords: ['compensating', 'rollback', 'immutable', 'rule 2', 'destructive'],
    reply: `### Immutability & Compensating Entries (AGENTS.md Rule 2)

**Committed financial records are NEVER destructively mutated or deleted (\`UPDATE\` / \`DELETE\` forbidden).**

If a posted ledger entry is incorrect:
1. The original transaction remains permanently in the ledger for SOX audit compliance.
2. A **Compensating Entry** is generated referencing the original record ID, applying the corrective delta.
3. An audit trail entry (\`compensated\`) is written with the author, timestamp, and justification.`
  },
  {
    keywords: ['subset-sum', 'split', 'batch', 'roll-up', 'oom'],
    reply: `### Pass 4: Bounded Subset-Sum Algorithm

Payment gateways frequently aggregate hundreds of individual customer transactions into a single daily bank settlement wire.

Parity untangles this without combinatorial explosion:
- Implements dynamic programming bounded by candidate pools (maximum 15 items per settlement window).
- Enforces an algorithm state cap of **50,000 states** to guarantee OOM (out-of-memory) safety and 2,850+ records/sec throughput.
- If ambiguity is detected (multiple valid subsets), the engine safely routes candidates to the **HITL Exception Queue** rather than guessing.`
  }
]

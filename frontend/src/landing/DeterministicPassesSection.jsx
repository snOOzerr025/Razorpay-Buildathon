import React from 'react'

export function DeterministicPassesSection() {
  const passes = [
    {
      num: 'PASS 01',
      title: 'Exact 1:1 Parity',
      desc: 'Instant parity matching on UTR reference, ISO currency, and exact transaction amount with zero timing drift.',
      tier: 'Tier 1 (HOOTL)',
      tierColor: 'var(--deso-green)',
      meta: 'Instant Auto-Post & Audit Write',
    },
    {
      num: 'PASS 02',
      title: 'Tolerance-Aware',
      desc: 'Neighbor-bucket hash indexing on net settlement amounts, resolving Merchant Discount Rates (1.8%–2.0%) + 18% GST.',
      tier: 'Tier 1 / Tier 2',
      tierColor: 'var(--deso-blue)',
      meta: 'Multi-Day Settlement Windows',
    },
    {
      num: 'PASS 03',
      title: 'Parent Refund Linkage',
      desc: 'Binds orphan reversal debits back to original captured payment IDs, preventing false discrepancy alarms.',
      tier: 'Tier 2 (HOTL)',
      tierColor: 'var(--deso-yellow)',
      meta: 'Chargeback & Reversal Tracing',
    },
    {
      num: 'PASS 04',
      title: 'Subset-Sum Roll-Up',
      desc: 'Bounded dynamic programming untangling 1 batched bank wire into N distinct gateway transactions, capped at 50,000 states for memory safety.',
      tier: 'Tier 2 (HOTL)',
      tierColor: 'var(--deso-yellow)',
      meta: 'Many-to-One Settlement Untangling',
    },
    {
      num: 'PASS 05',
      title: 'Residual Routing & HITL',
      desc: 'Hard-field blocked Fellegi-Sunter scoring and embedding similarity for messy narrations; low confidence routes directly to human sign-off.',
      tier: 'Tier 3 (HITL)',
      tierColor: 'var(--deso-fire)',
      meta: 'Zero-Math AI Explanation Drafting',
    },
  ]

  return (
    <section id="core" className="deso-section">
      <div className="section-eyebrow">
        <span>CHAPTER 02</span>
        <span>THE DETERMINISTIC CORE</span>
      </div>

      <h2 className="section-title">
        Deterministic Math.
        <br />
        <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400, color: 'var(--deso-yellow)' }}>
          Zero LLM Arithmetic.
        </span>
      </h2>

      <p className="section-desc">
        Financial reconciliation cannot tolerate generative hallucinations. Every fee calculation, tax adjustment, and batch combination is computed deterministically in Python code before AI is ever consulted.
      </p>

      {/* 5-Pass Stacking Deck */}
      <div className="passes-grid">
        {passes.map((p) => (
          <div key={p.num} className="pass-card">
            <div>
              <div
                className="pass-badge"
                style={{
                  background: `color-mix(in srgb, ${p.tierColor} 14%, transparent)`,
                  color: p.tierColor,
                  border: `1px solid color-mix(in srgb, ${p.tierColor} 30%, transparent)`,
                }}
              >
                <span>●</span>
                <span>{p.num}</span>
              </div>
              <h4>{p.title}</h4>
              <p>{p.desc}</p>
            </div>
            <div className="pass-meta">
              <span style={{ color: p.tierColor, fontWeight: 600 }}>{p.tier}</span>
              <span>{p.meta}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Comparative Protocol Card (DeSo style) */}
      <div className="protocol-comparison-card">
        <div className="comparison-col">
          <span className="comparison-badge" style={{ color: 'var(--deso-fire)' }}>Legacy Architecture</span>
          <h3>Generic 2-Way Bank-to-GL</h3>
          <ul className="comparison-list">
            <li>
              <span className="bullet-red">✕</span>
              <span>Matches only Bank Statement against General Ledger; ignores real gateway mechanics.</span>
            </li>
            <li>
              <span className="bullet-red">✕</span>
              <span>Fails on batched bank credits (1 wire representing 400 captured payments).</span>
            </li>
            <li>
              <span className="bullet-red">✕</span>
              <span>Orphaned refunds read as false unposted exceptions without parent binding.</span>
            </li>
            <li>
              <span className="bullet-red">✕</span>
              <span>Destructive database rollbacks violate SOX and immutable ledger regulations.</span>
            </li>
          </ul>
        </div>

        <div className="comparison-col" style={{ borderLeft: '1px solid rgba(255, 253, 245, 0.1)', paddingLeft: 'clamp(16px, 2vw, 32px)' }}>
          <span className="comparison-badge" style={{ color: 'var(--deso-green)' }}>Parity Architecture</span>
          <h3>Continuous 3-Way Parity</h3>
          <ul className="comparison-list">
            <li>
              <span className="bullet-green">✓</span>
              <span>True 3-way reconciliation: Gateway Transaction ↔ Bank Settlement (UTR) ↔ Merchant Ledger.</span>
            </li>
            <li>
              <span className="bullet-green">✓</span>
              <span>Bounded subset-sum dynamic programming untangles batched payouts deterministically.</span>
            </li>
            <li>
              <span className="bullet-green">✓</span>
              <span>Pass 3 links negative refund amounts directly to parent transaction captures.</span>
            </li>
            <li>
              <span className="bullet-green">✓</span>
              <span>Strict non-destructive compensating entries preserve 100% audit trail immutability.</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}

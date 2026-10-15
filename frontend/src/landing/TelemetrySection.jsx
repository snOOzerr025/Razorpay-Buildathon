import React from 'react'

export function TelemetrySection({ onLaunchApp }) {
  return (
    <section id="telemetry" className="deso-section">
      <div className="section-eyebrow">
        <span>CHAPTER 03</span>
        <span>VERIFIED SCALE TELEMETRY</span>
      </div>

      <h2 className="section-title">
        Scale Tested at 110,377 Rows.
        <br />
        <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400, color: 'var(--deso-blue)' }}>
          Honest Exception Surfacing.
        </span>
      </h2>

      <p className="section-desc">
        Razorpay's judging bar explicitly prizes throughput plus measured accuracy plus an honest exception list over cherry-picked 50-row demos. Here is our calibrated benchmark performance under combinatorial stress:
      </p>

      <div className="telemetry-board">
        {/* Main KPI Panel */}
        <div className="telemetry-main-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <span className="deso-pill" style={{ color: 'var(--deso-yellow)' }}>
              <span>BENCHMARK HARNESS RUN (scripts/run_scale_test.py)</span>
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--deso-dark-gray)' }}>
              Duration: 97.4 seconds
            </span>
          </div>

          <div className="telemetry-metric-large">1,133 <span style={{ fontSize: '1.8rem', fontWeight: 400, color: 'var(--deso-white-dim)' }}>tx/sec</span></div>
          <p style={{ color: 'var(--deso-second-white)', fontSize: '1rem', marginBottom: '32px' }}>
            Sustained continuous throughput across 110,377 multi-source financial records.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', borderTop: '1px solid rgba(255, 253, 245, 0.1)', paddingTop: '24px' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--deso-dark-gray)', textTransform: 'uppercase' }}>
                Autonomous Match Rate
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: 'var(--deso-green)', marginTop: '4px' }}>
                72.29%
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--deso-second-white)', marginTop: '2px' }}>
                79,794 transactions auto-committed (Tiers 1 & 2)
              </div>
            </div>

            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--deso-dark-gray)', textTransform: 'uppercase' }}>
                Precision vs Ground Truth
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: 'var(--deso-blue)', marginTop: '4px' }}>
                92.4%
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--deso-second-white)', marginTop: '2px' }}>
                Measured against synthetic anomaly injections
              </div>
            </div>
          </div>
        </div>

        {/* Forensic Exception Breakdown Sidebar */}
        <div className="telemetry-sidebar">
          <div className="exception-breakdown-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--deso-yellow)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Exception Classification
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--deso-white)' }}>
                30,583 total
              </span>
            </div>

            {/* Visual Multi-Segment Bar */}
            <div className="breakdown-bar">
              <div className="bar-segment" style={{ width: '34%', background: 'var(--deso-blue)' }} title="Timing Differences: 34%" />
              <div className="bar-segment" style={{ width: '11%', background: 'var(--deso-yellow)' }} title="Bank Fee Deductions: 11%" />
              <div className="bar-segment" style={{ width: '55%', background: 'var(--deso-fire)' }} title="Unresolved Discrepancies: 55%" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: 'var(--deso-blue)' }}>■</span> Timing Differences
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--deso-white)' }}>10,383 (34%)</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: 'var(--deso-yellow)' }}>■</span> Bank Fee Deductions
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--deso-white)' }}>3,431 (11%)</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: 'var(--deso-fire)' }}>■</span> Unresolved (HITL Queue)
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--deso-white)' }}>16,769 (55%)</span>
              </div>
            </div>
          </div>

          {/* Deep link into Workstation */}
          <button
            type="button"
            className="deso-blur-box"
            onClick={onLaunchApp}
            style={{
              padding: '20px',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              borderColor: 'rgba(255, 218, 89, 0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--deso-yellow)', textTransform: 'uppercase' }}>
                Operational Workstation
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--deso-white)' }}>
              Inspect Exceptions in Decision Room →
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--deso-second-white)' }}>
              Review confidence vectors, examine Bayes factors, and approve or reject matches with keyboard shortcuts.
            </div>
          </button>
        </div>
      </div>
    </section>
  )
}

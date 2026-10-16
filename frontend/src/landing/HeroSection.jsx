import React from 'react'

export function HeroSection({ onLaunchApp, isLive = false, metrics }) {
  const sustainedVelocity = isLive ? '1,133 tx/s' : '1,133 tx/s'
  const autoRate = '72.29%'
  const precision = '92.4%'
  const totalRecords = isLive && metrics?.total_processed ? metrics.total_processed.toLocaleString() : '110,377'

  return (
    <section id="welcome" className="deso-hero-section">
      {/* Chapter Tag */}
      <div className="hero-chapter-tag">
        <span className="hero-chapter-num">CHAPTER 01</span>
        <span className="hero-chapter-line" />
        <div className="deso-pill">
          <span style={{ color: isLive ? 'var(--deso-green)' : 'var(--deso-yellow)' }}>●</span>
          <span>{isLive ? 'Live Production Stream' : 'Benchmark Batch Replay'}</span>
        </div>
      </div>

      {/* Main Kinetic Title */}
      <h1 className="hero-main-title">
        Three-Way Financial
        <br />
        Settlement. <span className="serif-accent">Reimagined.</span>
      </h1>

      {/* Editorial Subtitle */}
      <p className="hero-subtitle">
        Continuous-close payment reconciliation pairing a strict 5-pass deterministic engine with an audit-ready probabilistic layer. Tested at 110,000+ transaction scale.
      </p>

      {/* Primary Action Group */}
      <div className="hero-cta-group">
        <button
          type="button"
          className="cta-primary"
          onClick={onLaunchApp}
        >
          <span>Launch Financial Workstation</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>

        <a
          href="#core"
          className="cta-secondary"
          onClick={(e) => {
            e.preventDefault()
            document.getElementById('core')?.scrollIntoView({ behavior: 'smooth' })
          }}
        >
          <span>Explore 5 Passes</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
        </a>
      </div>

      {/* Verified Scale Telemetry Deck */}
      <div className="hero-stats-deck">
        <div className="hero-stat-card">
          <div className="stat-card-header">
            <div className="stat-label">
              <span style={{ color: 'var(--deso-yellow)' }}>⚡</span>
              <span>Throughput</span>
            </div>
            <span className="stat-trend-arrow">↗</span>
          </div>
          <div className="stat-val-row">
            <div className="stat-val">{sustainedVelocity}</div>
          </div>
          {/* Velocity Upward Sparkline */}
          <div className="stat-visual-sparkline">
            <svg width="100%" height="28" viewBox="0 0 160 28" fill="none" preserveAspectRatio="none">
              <path
                d="M2,24 Q30,22 55,16 T105,14 T135,6 L158,2"
                stroke="var(--deso-yellow)"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <circle cx="158" cy="2" r="3" fill="var(--deso-yellow)" />
            </svg>
          </div>
          <div className="stat-sub">Sustained peak engine velocity</div>
        </div>

        <div className="hero-stat-card">
          <div className="stat-card-header">
            <div className="stat-label">
              <span style={{ color: 'var(--deso-green)' }}>✓</span>
              <span>Autonomous Rate</span>
            </div>
            {/* Mini Donut Progress Ring */}
            <div className="stat-mini-ring">
              <svg width="24" height="24" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(244, 242, 233, 0.12)" strokeWidth="3" />
                <circle
                  cx="16"
                  cy="16"
                  r="12"
                  fill="none"
                  stroke="var(--deso-green)"
                  strokeWidth="3.2"
                  strokeDasharray="75.4"
                  strokeDashoffset="20.8"
                  strokeLinecap="round"
                  transform="rotate(-90 16 16)"
                />
              </svg>
            </div>
          </div>
          <div className="stat-val">{autoRate}</div>
          <div className="stat-sub">Tier 1 HOOTL + Tier 2 HOTL resolved</div>
        </div>

        <div className="hero-stat-card">
          <div className="stat-card-header">
            <div className="stat-label">
              <span style={{ color: 'var(--deso-blue)' }}>🎯</span>
              <span>Precision</span>
            </div>
          </div>
          <div className="stat-val">{precision}</div>
          {/* Precision Harmonic Curve */}
          <div className="stat-visual-sparkline">
            <svg width="100%" height="28" viewBox="0 0 160 28" fill="none" preserveAspectRatio="none">
              <path
                d="M2,18 Q20,8 40,20 T80,12 T120,22 T158,10"
                stroke="var(--deso-blue)"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="stat-sub">Vs synthetic ground truth anomalies</div>
        </div>

        <div className="hero-stat-card">
          <div className="stat-card-header">
            <div className="stat-label">
              <span style={{ color: 'var(--deso-white-dim)' }}>📦</span>
              <span>Verified Batch</span>
            </div>
          </div>
          <div className="stat-val">{totalRecords}</div>
          {/* Batch Volume Bars */}
          <div className="stat-visual-bars">
            <div className="mini-bar" style={{ height: '35%' }} />
            <div className="mini-bar" style={{ height: '55%' }} />
            <div className="mini-bar" style={{ height: '40%' }} />
            <div className="mini-bar" style={{ height: '80%' }} />
            <div className="mini-bar" style={{ height: '65%' }} />
            <div className="mini-bar" style={{ height: '95%' }} />
            <div className="mini-bar" style={{ height: '70%' }} />
            <div className="mini-bar" style={{ height: '85%' }} />
          </div>
          <div className="stat-sub">Scale test records executed in 97.4s</div>
        </div>
      </div>
    </section>
  )
}

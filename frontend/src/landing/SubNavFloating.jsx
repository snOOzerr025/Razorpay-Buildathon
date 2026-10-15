import React, { useState } from 'react'

export function SubNavFloating({ onSelectChapter, onLaunchApp }) {
  const [isOpen, setIsOpen] = useState(false)

  const chapters = [
    { id: 'welcome', num: '01', title: 'Genesis', subtitle: 'Three-Way Continuous Close' },
    { id: 'core', num: '02', title: 'The Core', subtitle: '5-Pass Deterministic Engine' },
    { id: 'telemetry', num: '03', title: 'Telemetry', subtitle: '110,377 Scale Benchmarks' },
  ]

  return (
    <>
      {/* Floating Bottom Isometric Diamonds Button */}
      <div
        className="deso-sub-nav-floating"
        onClick={() => setIsOpen(!isOpen)}
        title="Explore Engine Chapters"
        role="button"
        tabIndex={0}
      >
        <div className="sub-nav-diamonds">
          <div className="diamond-layer layer-top" />
          <div className="diamond-layer layer-mid" />
          <div className="diamond-layer layer-bottom" />
        </div>
        <span className="sub-nav-text">{isOpen ? 'Close Navigator' : 'Chapters'}</span>
      </div>

      {/* Unfolding Glass Chapter Drawer */}
      {isOpen && (
        <div
          className="deso-blur-box"
          style={{
            position: 'fixed',
            bottom: '76px',
            left: '24px',
            zIndex: 60,
            width: '320px',
            padding: '16px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.7)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid rgba(255,253,245,0.1)', paddingBottom: '8px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--deso-yellow)', textTransform: 'uppercase' }}>
              Engine Chapters
            </span>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--deso-white-dim)', cursor: 'pointer', fontSize: '1rem' }}
            >
              ✕
            </button>
          </div>

          {chapters.map((ch) => (
            <div
              key={ch.id}
              onClick={() => {
                setIsOpen(false)
                onSelectChapter?.(ch.id)
                document.getElementById(ch.id)?.scrollIntoView({ behavior: 'smooth' })
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                background: 'rgba(255,253,245,0.03)',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,253,245,0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,253,245,0.03)')}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--deso-yellow)', fontWeight: 700 }}>
                {ch.num}
              </span>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--deso-white)' }}>
                  {ch.title}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--deso-second-white)' }}>
                  {ch.subtitle}
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            className="deso-pill-gold"
            onClick={() => {
              setIsOpen(false)
              onLaunchApp?.()
            }}
            style={{ marginTop: '8px', width: '100%', justifyContent: 'center', padding: '10px' }}
          >
            Launch Financial Workstation →
          </button>
        </div>
      )}
    </>
  )
}

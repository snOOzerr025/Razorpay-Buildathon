import React from 'react'

/**
 * RotatingCubeNav
 * Replicates DeSo's exact Studio Freight 3D rotating cube navigation links:
 * - CSS 3D Preserve-3D
 * - Front face: Grotesque sans tracking
 * - Bottom face: Italic Instrument Serif in Electric Gold
 */
export function RotatingCubeNav({ activeChapter = 'welcome', onSelectChapter, onLaunchApp }) {
  const links = [
    { id: 'welcome', label: '01 / Genesis', serif: 'Genesis' },
    { id: 'core', label: '02 / The Core', serif: '5 Passes' },
    { id: 'telemetry', label: '03 / Telemetry', serif: '110K Scale' },
  ]

  return (
    <nav className="deso-cube-nav-wrapper" aria-label="Chapter Navigation">
      {links.map((link) => (
        <a
          key={link.id}
          href={`#${link.id}`}
          onClick={(e) => {
            e.preventDefault()
            onSelectChapter?.(link.id)
            const el = document.getElementById(link.id)
            if (el) el.scrollIntoView({ behavior: 'smooth' })
          }}
          className={`cube-link-item ${activeChapter === link.id ? 'active' : ''}`}
        >
          <div className="cube-scene">
            <div className="cube-face cube-face-front">
              <span>{link.label}</span>
            </div>
            <div className="cube-face cube-face-bottom">
              <span>{link.serif}</span>
            </div>
          </div>
        </a>
      ))}

      <button
        type="button"
        className="nav-workstation-cta"
        onClick={onLaunchApp}
        title="Open Financial Workstation"
      >
        <span>Launch App</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </nav>
  )
}

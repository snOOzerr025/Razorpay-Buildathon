import React, { useEffect, useState, useRef } from 'react'
import Lenis from 'lenis'
import './landing.css'
import { ShaderGradientCanvas } from './ShaderGradientCanvas'
import { RotatingCubeNav } from './RotatingCubeNav'
import { HeroSection } from './HeroSection'
import { DeterministicPassesSection } from './DeterministicPassesSection'
import { TelemetrySection } from './TelemetrySection'
import { SubNavFloating } from './SubNavFloating'

export function LandingPage({ onLaunchApp, isLive = false, metrics }) {
  const [activeChapter, setActiveChapter] = useState('welcome')
  const [scrollProgress, setScrollProgress] = useState(0)
  const lenisRef = useRef(null)

  useEffect(() => {
    // 1. Initialize Lenis Momentum Smooth Scroll
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
    })
    lenisRef.current = lenis

    function raf(time) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    const rafId = requestAnimationFrame(raf)

    // 2. Track Normalized Scroll Progress
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight
      if (totalScroll > 0) {
        setScrollProgress(window.scrollY / totalScroll)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', handleScroll)
      lenis.destroy()
    }
  }, [])

  return (
    <div className="deso-landing">
      {/* Three.js Liquid Shader Gradient & 3D Financial Nodes */}
      <ShaderGradientCanvas scrollProgress={scrollProgress} />

      {/* Atmospheric Ambient Glows */}
      <div className="deso-ambient-glow glow-blue" />
      <div className="deso-ambient-glow glow-gold" />

      {/* Minimal Electric Yellow Scroll Indicator */}
      <div className="deso-scroll-indicator">
        <div
          className="deso-scroll-thumb"
          style={{ height: `${Math.max(scrollProgress * 100, 3)}%` }}
        />
      </div>

      {/* Sticky Top Header Navigation */}
      <header className="deso-nav-header">
        <a href="#welcome" className="deso-brand-logo">
          <div className="deso-brand-mark">P</div>
          <div className="deso-brand-text">
            Parity<span style={{ color: 'var(--deso-yellow)' }}>/</span>recon
            <span className="deso-brand-sub">CONTROLLER</span>
          </div>
        </a>

        {/* 3D Rotating Cube Navigation */}
        <RotatingCubeNav
          activeChapter={activeChapter}
          onSelectChapter={setActiveChapter}
          onLaunchApp={onLaunchApp}
        />
      </header>

      {/* Chapter 01: Genesis (Hero Section) */}
      <HeroSection
        onLaunchApp={onLaunchApp}
        isLive={isLive}
        metrics={metrics}
      />

      {/* Chapter 02: The Deterministic Core (5 Passes) */}
      <DeterministicPassesSection />

      {/* Chapter 03: Telemetry & Scale Benchmarks */}
      <TelemetrySection onLaunchApp={onLaunchApp} />

      {/* Footer */}
      <footer style={{
        position: 'relative',
        zIndex: 1,
        padding: '60px var(--deso-margin) 40px',
        borderTop: '1px solid rgba(255, 253, 245, 0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="deso-brand-mark" style={{ width: '24px', height: '24px', fontSize: '0.85rem' }}>P</div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--deso-dark-gray)' }}>
            PARITY RECON ENGINE • RAZORPAY AI BUILDATHON 2026
          </span>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            type="button"
            className="deso-pill-gold"
            onClick={onLaunchApp}
          >
            Launch Financial Workstation →
          </button>
        </div>
      </footer>

      {/* Floating Bottom Sub-Navigation Diamond Widget */}
      <SubNavFloating
        onSelectChapter={setActiveChapter}
        onLaunchApp={onLaunchApp}
      />
    </div>
  )
}

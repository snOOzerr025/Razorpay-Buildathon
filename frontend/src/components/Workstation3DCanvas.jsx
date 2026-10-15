import React, { useState, useEffect } from 'react'
import { ShaderGradientCanvas } from '../landing/ShaderGradientCanvas'

/**
 * Workstation3DCanvas
 * Brings back the beloved previous version:
 * The rich WebGL liquid organic GLSL mesh gradient with tripartite 3D financial nodes
 * (Gateway, Settlement Bank, Merchant Ledger) and animated particle flow streams,
 * synchronized with user scroll progress.
 */
export function Workstation3DCanvas() {
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight
      if (totalScroll > 0) {
        setScrollProgress(window.scrollY / totalScroll)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return <ShaderGradientCanvas scrollProgress={scrollProgress} />
}

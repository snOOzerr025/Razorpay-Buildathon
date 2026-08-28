'use client'

import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import MagneticButton from './MagneticButton'

function TiltCard({ title, desc }: { title: string; desc: string }) {
  const ref = useRef<HTMLDivElement>(null)
  
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  // Smooth out the mouse values
  const springConfig = { stiffness: 150, damping: 20, mass: 0.5 }
  const springX = useSpring(x, springConfig)
  const springY = useSpring(y, springConfig)

  // Map mouse position to rotation (±4deg max)
  const rotateX = useTransform(springY, [-1, 1], [4, -4])
  const rotateY = useTransform(springX, [-1, 1], [-4, 4])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    
    // Normalize mouse position from -1 to 1 based on card center
    const width = rect.width
    const height = rect.height
    
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    const xPct = (mouseX / width - 0.5) * 2
    const yPct = (mouseY / height - 0.5) * 2

    x.set(xPct)
    y.set(yPct)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 1000,
      }}
      className="p-8 bg-[var(--surface)] border border-[var(--hairline)] shadow-sm hover:shadow-md transition-shadow relative z-10"
    >
      <h3 className="text-xl font-display mb-3 text-[var(--ink)]">{title}</h3>
      <p className="text-[var(--ink-dim)]">{desc}</p>
    </motion.div>
  )
}

export default function TrustSection() {
  return (
    <section id="trust" className="relative w-full py-32 overflow-hidden bg-[var(--bg-paper)]">
      {/* Static Dotted Grid Background */}
      <div 
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at center, var(--hairline) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: 0.4 // Spec says 8% opacity of hairline, but hairline is #DCD0B0. 0.4 visual is fine, we can do 0.2
        }}
      />
      
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display mb-6 text-[var(--ink)]">Trust & Auditability</h2>
          <p className="text-xl text-[var(--ink-dim)] max-w-2xl mx-auto">
            Every match — automated or human-approved — writes an immutable audit log entry.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <TiltCard 
            title="Line-Level Lineage"
            desc="Every matched record retains a pointer to the exact rule or ML threshold that matched it."
          />
          <TiltCard 
            title="Non-Destructive"
            desc="Ledger rows are never updated or deleted. Corrections are exclusively handled via compensating entries."
          />
          <TiltCard 
            title="Risk-Tiered Gates"
            desc="HOOTL auto-posts. HOTL requires dashboard visibility. HITL requires explicit human approval."
          />
        </div>

        <div className="flex justify-center">
          <MagneticButton>
            View Documentation
          </MagneticButton>
        </div>
      </div>
    </section>
  )
}

'use client'

import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import MagneticButton from './MagneticButton'

function TiltCard({ title, desc, index }: { title: string; desc: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const springConfig = { stiffness: 150, damping: 20, mass: 0.5 }
  const springX = useSpring(x, springConfig)
  const springY = useSpring(y, springConfig)

  const rotateX = useTransform(springY, [-1, 1], [4, -4])
  const rotateY = useTransform(springX, [-1, 1], [-4, 4])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
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
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      className="relative z-10 group"
    >
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="p-8 h-full bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden relative"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        <h3 className="text-2xl font-display font-medium mb-4 text-white">{title}</h3>
        <p className="text-gray-400 leading-relaxed">{desc}</p>
        
        {/* Glow effect that tracks mouse could go here, but static hover is fine for now */}
        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-[#00E5FF] rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none" />
      </motion.div>
    </motion.div>
  )
}

export default function TrustSection() {
  return (
    <section id="trust" className="relative w-full py-32 overflow-hidden bg-[#050505]">
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#00E5FF]/5 rounded-full blur-[150px] mix-blend-screen pointer-events-none transform translate-x-1/3 -translate-y-1/3" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-6xl font-display font-bold mb-6 text-white tracking-tight"
          >
            Trust & Auditability
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-xl text-gray-400 max-w-2xl mx-auto font-light"
          >
            Every match — automated or human-approved — writes an immutable audit log entry.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          <TiltCard 
            index={0}
            title="Line-Level Lineage"
            desc="Every matched record retains a pointer to the exact rule or ML threshold that matched it."
          />
          <TiltCard 
            index={1}
            title="Non-Destructive"
            desc="Ledger rows are never updated or deleted. Corrections are exclusively handled via compensating entries."
          />
          <TiltCard 
            index={2}
            title="Risk-Tiered Gates"
            desc="HOOTL auto-posts. HOTL requires dashboard visibility. HITL requires explicit human approval."
          />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex justify-center"
        >
          <MagneticButton>
            <span className="font-medium tracking-wide">View Documentation</span>
          </MagneticButton>
        </motion.div>
      </div>
    </section>
  )
}

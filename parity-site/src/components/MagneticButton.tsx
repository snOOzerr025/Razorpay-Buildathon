'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

export default function MagneticButton({ 
  children, 
  className = '',
  onClick
}: { 
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null)
  
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const springConfig = { stiffness: 150, damping: 15, mass: 0.1 }
  const springX = useSpring(x, springConfig)
  const springY = useSpring(y, springConfig)

  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    setPrefersReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (prefersReduced) return
    if (!ref.current) return
    const { clientX, clientY } = e
    const { height, width, left, top } = ref.current.getBoundingClientRect()
    
    // Calculate distance from center of button
    const middleX = clientX - (left + width / 2)
    const middleY = clientY - (top + height / 2)
    
    // Max translation of 8px
    const max = 8
    const clampedX = Math.max(-max, Math.min(max, middleX * 0.2))
    const clampedY = Math.max(-max, Math.min(max, middleY * 0.2))

    x.set(clampedX)
    y.set(clampedY)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.button
      ref={ref}
      className={`px-6 py-3 bg-[var(--ink)] text-[var(--bg-paper)] font-display hover:bg-[var(--ink-dim)] transition-colors ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{ x: prefersReduced ? 0 : springX, y: prefersReduced ? 0 : springY }}
    >
      {children}
    </motion.button>
  )
}

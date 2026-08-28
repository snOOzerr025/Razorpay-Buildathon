'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

export default function ProblemNarrative() {
  const lineRef = useRef<SVGPathElement>(null)
  
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!lineRef.current) return
      
      const length = lineRef.current.getTotalLength()
      gsap.set(lineRef.current, { strokeDasharray: length, strokeDashoffset: length })

      gsap.to(lineRef.current, {
        strokeDashoffset: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: '#problem',
          start: 'top center',
          end: 'bottom center',
          scrub: true,
        }
      })
    })
    return () => ctx.revert()
  }, [])

  return (
    <section id="problem" className="relative w-full py-40 bg-[var(--surface)]">
      <div className="absolute top-1/2 left-0 w-full -translate-y-1/2 pointer-events-none">
        <svg className="w-full h-8" preserveAspectRatio="none" viewBox="0 0 1000 32">
          <path 
            ref={lineRef}
            d="M 0 16 C 300 16, 400 0, 500 16 C 600 32, 700 16, 1000 16" 
            stroke="var(--accent-brass)" 
            strokeWidth="2" 
            fill="none" 
          />
        </svg>
      </div>

      <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
        <h2 className="text-4xl md:text-6xl font-display mb-8 text-[var(--ink)]">
          The Gap Between Gateway and Ledger
        </h2>
        <p className="text-xl text-[var(--ink-dim)] leading-relaxed">
          Traditional reconciliation fails when unstructured text from bank settlements meets the rigid requirements of a general ledger. 
          We built a three-way reconciliation engine that bridges this gap deterministically, turning uncertainty into verifiable financial truth.
        </p>
      </div>
    </section>
  )
}

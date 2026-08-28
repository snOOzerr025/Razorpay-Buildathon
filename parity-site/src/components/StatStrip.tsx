'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { STATS } from '@/lib/stats'

function Counter({ endValue, suffix = '' }: { endValue: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const animated = useRef(false)

  useEffect(() => {
    if (!ref.current) return

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true
          const obj = { val: 0 }
          gsap.to(obj, {
            val: endValue,
            duration: 1.2,
            ease: 'expo.out',
            onUpdate: () => setDisplay(Math.round(obj.val))
          })
        }
      })
    }, { threshold: 0.1 })

    observer.observe(ref.current)

    return () => observer.disconnect()
  }, [endValue])

  return (
    <div ref={ref} className="text-4xl md:text-5xl font-mono mono-num text-[var(--ink)]">
      {display.toLocaleString()}{suffix}
    </div>
  )
}

export default function StatStrip() {
  const bgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(bgRef.current, {
        y: 40,
        ease: 'none',
        scrollTrigger: {
          trigger: '#stats',
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.5,
        }
      })
    })
    return () => ctx.revert()
  }, [])

  return (
    <section id="stats" className="relative w-full py-24 overflow-hidden border-y border-[var(--hairline)] bg-[var(--bg-paper)]">
      {/* Background SVG Parallax */}
      <div 
        ref={bgRef} 
        className="absolute inset-0 w-full h-[120%] -top-[10%] pointer-events-none"
      >
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="ledger-lines" x="0" y="0" width="100" height="32" patternUnits="userSpaceOnUse">
              <line x1="0" y1="31" x2="100" y2="31" stroke="var(--hairline)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ledger-lines)" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 text-center relative z-10">
        <div>
          <Counter endValue={STATS.recordsProcessed} />
          <div className="mt-2 text-sm text-[var(--ink-dim)] uppercase tracking-widest font-semibold">Records Processed</div>
        </div>
        <div>
          <Counter endValue={STATS.automatedMatchRate} suffix="%" />
          <div className="mt-2 text-sm text-[var(--ink-dim)] uppercase tracking-widest font-semibold">Automated Match Rate</div>
        </div>
        <div>
          <Counter endValue={STATS.throughputPerSec} />
          <div className="mt-2 text-sm text-[var(--ink-dim)] uppercase tracking-widest font-semibold">Throughput / Sec</div>
        </div>
        <div>
          <Counter endValue={STATS.fnContainment} suffix="%" />
          <div className="mt-2 text-sm text-[var(--ink-dim)] uppercase tracking-widest font-semibold">FN Containment</div>
        </div>
      </div>
    </section>
  )
}

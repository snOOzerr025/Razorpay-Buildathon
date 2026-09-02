'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

const passes = [
  { title: "Pass 1: Exact", desc: "Identical account, currency, amount, and reference." },
  { title: "Pass 2: Tolerance", desc: "Date window and gross/net fee normalization." },
  { title: "Pass 3: Linkage", desc: "Binds refunds and chargebacks to original charge." },
  { title: "Pass 4: Roll-up", desc: "Subset-sum for batched bank settlements." },
  { title: "Pass 5: AI & Queue", desc: "Semantic matching and risk-tiered exception handling." },
]

export default function ArchitectureSequence() {
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<(HTMLDivElement | null)[]>([])
  const linesRef = useRef<(SVGPathElement | null)[]>([])

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Setup initial state: cards collapsed at x=0
      // We will distribute them across the track width
      
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'center center',
          end: '+=150%',
          pin: true,
          scrub: 1,
        }
      })

      // We want to animate them from a stacked center to their spread out positions
      // Wait, let's just place them absolutely and animate their x, or flex and animate from negative margins.
      // Better: position them all at left: 0, and animate left to (index * 20%)
      
      cardsRef.current.forEach((card, index) => {
        if (!card) return
        if (index === 0) return // First card stays put
        
        // Target x position
        const targetX = index * 260 // 260px spacing

        // Start from collapsed (0) with rotateY(-8deg)
        gsap.set(card, { x: 0, rotationY: -8, opacity: 0 })

        tl.to(card, {
          x: targetX,
          rotationY: 0,
          opacity: 1,
          ease: 'power1.out',
          duration: 1
        }, index * 0.2) // stagger by 0.2
      })

      linesRef.current.forEach((line, index) => {
        if (!line) return
        const length = line.getTotalLength()
        gsap.set(line, { strokeDasharray: length, strokeDashoffset: length })
        
        // Line finishes drawing right as the NEXT card settles
        tl.to(line, {
          strokeDashoffset: 0,
          duration: 0.8,
          ease: 'none'
        }, (index + 1) * 0.2)
      })
    })
    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="architecture" className="w-full h-screen flex items-center bg-[#050505] overflow-hidden">
      <div className="max-w-[1400px] w-full mx-auto px-12">
        <h2 className="text-3xl font-display mb-20 text-white">Deterministic Matching Engine</h2>
        
        <div ref={trackRef} className="relative w-full h-[300px]" style={{ perspective: '1200px' }}>
          {passes.map((p, i) => (
            <div
              key={i}
              ref={(el) => { cardsRef.current[i] = el }}
              className="absolute top-0 left-0 w-[240px] h-full p-6 bg-[#0a0a0a] border border-white/10 flex flex-col shadow-lg z-10"
              style={{ transformOrigin: 'left center' }}
            >
              <div className="text-[#00E5FF] font-mono text-sm mb-4">0{i + 1}</div>
              <h3 className="font-display text-xl mb-2 text-white">{p.title}</h3>
              <p className="text-gray-400 text-sm">{p.desc}</p>
            </div>
          ))}

          {/* SVG Connecting lines between cards */}
          {passes.map((_, i) => {
            if (i === passes.length - 1) return null
            return (
              <svg 
                key={`line-${i}`} 
                className="absolute top-1/2 left-[240px] w-[260px] h-[2px] -translate-y-1/2 pointer-events-none z-0" 
                style={{ marginLeft: i * 260 }}
              >
                <path
                  ref={(el) => { linesRef.current[i] = el }}
                  d="M0,1 L260,1"
                  stroke="#00E5FF"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            )
          })}
        </div>
      </div>
    </section>
  )
}

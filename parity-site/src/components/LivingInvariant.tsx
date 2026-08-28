'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export default function LivingInvariant() {
  const ref = useRef<HTMLDivElement>(null)
  const equalsRef = useRef<HTMLDivElement>(null)
  const [val1, setVal1] = useState(0)
  const [val2, setVal2] = useState(0)
  const [val3, setVal3] = useState(0)
  const animated = useRef(false)

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!ref.current || !equalsRef.current) return

      ScrollTrigger.create({
        trigger: ref.current,
        start: 'top 80%',
        onEnter: () => {
          if (animated.current) return
          animated.current = true

          const obj = { v: 0 }
          const target = 14892400.00 // random large number

          // Count up
          gsap.to(obj, {
            v: target,
            duration: 2,
            ease: 'expo.out',
            onUpdate: () => {
              setVal1(obj.v)
              setVal2(obj.v * 0.98) // simulated slightly off until snap
              setVal3(obj.v * 0.02)
            },
            onComplete: () => {
              // The Snap
              setVal2(target)
              setVal3(0)
              
              // Scale-pulse & green flash on equals sign
              gsap.to(equalsRef.current, {
                scale: 1.5,
                color: 'var(--ledger-green)',
                duration: 0.15,
                yoyo: true,
                repeat: 1,
                ease: 'power2.inOut',
                onComplete: () => {
                  gsap.set(equalsRef.current, { color: 'var(--ink)' })
                }
              })
            }
          })
        }
      })
    })
    return () => ctx.revert()
  }, [])

  const format = (n: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  return (
    <section className="w-full py-12 bg-[var(--surface)] border-t border-[var(--hairline)]" ref={ref}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between text-2xl md:text-3xl font-mono mono-num text-[var(--ink)]">
          <div>{format(val1)}</div>
          <div ref={equalsRef} className="my-4 md:my-0 font-display font-bold">=</div>
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            <div>{format(val2)}</div>
            <div className="text-[var(--ink-dim)]">+</div>
            <div>{format(val3)}</div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between mt-4 text-xs tracking-widest uppercase text-[var(--ink-dim)]">
          <div>Gateway Settled</div>
          <div className="hidden md:block"></div>
          <div className="flex gap-16">
            <div>Ledger Posted</div>
            <div>In Transit</div>
          </div>
        </div>
      </div>
    </section>
  )
}

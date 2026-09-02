'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { STATS } from '@/lib/stats'
import { gsap } from 'gsap'

function Counter({ endValue, suffix = '' }: { endValue: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-10%" })

  useEffect(() => {
    if (isInView) {
      const obj = { val: 0 }
      gsap.to(obj, {
        val: endValue,
        duration: 1.5,
        ease: 'power3.out',
        onUpdate: () => setDisplay(Math.round(obj.val))
      })
    }
  }, [isInView, endValue])

  return (
    <div ref={ref} className="text-4xl md:text-5xl font-mono mono-num text-[var(--ink)]">
      {display.toLocaleString()}{suffix}
    </div>
  )
}

export default function StatStrip() {
  return (
    <section className="relative w-full py-24 bg-[var(--bg-paper)] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Records Processed', value: STATS.recordsProcessed, suffix: '' },
            { label: 'Automated Match Rate', value: STATS.automatedMatchRate, suffix: '%' },
            { label: 'Throughput / Sec', value: STATS.throughputPerSec, suffix: '' },
            { label: 'FN Containment', value: STATS.fnContainment, suffix: '%' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="bg-[var(--surface)] border border-[var(--hairline)] rounded-2xl p-8 flex flex-col items-center justify-center text-center backdrop-blur-md"
            >
              <Counter endValue={stat.value} suffix={stat.suffix} />
              <div className="mt-4 text-xs text-[var(--ink-dim)] uppercase tracking-widest font-medium">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

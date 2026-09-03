'use client'

import { STATS } from '@/lib/stats'
import { ArrowRight, Activity, ShieldCheck, Zap, Database, AlertOctagon, TrendingUp } from 'lucide-react'
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

const chartData = [
  { name: 'Mon', matches: 84000, exceptions: 1200 },
  { name: 'Tue', matches: 92000, exceptions: 1400 },
  { name: 'Wed', matches: 104000, exceptions: 1100 },
  { name: 'Thu', matches: 98000, exceptions: 1800 },
  { name: 'Fri', matches: 110377, exceptions: 20355 },
]

/* ── Animated number counter hook ── */
function useCountUp(target: number, duration = 1200, decimals = 0) {
  const [value, setValue] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started) setStarted(true)
    }, { threshold: 0.3 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [started])

  useEffect(() => {
    if (!started) return
    const start = performance.now()
    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Number((eased * target).toFixed(decimals)))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [started, target, duration, decimals])

  return { value, ref }
}

/* ── Pipeline pass data ── */
const pipelineData = [
  { name: 'Pass 1: Exact', count: 32142, pct: 29.1, color: 'var(--success)' },
  { name: 'Pass 2: Tolerance', count: 44484, pct: 40.3, color: 'var(--success)' },
  { name: 'Pass 3: Refund', count: 3085, pct: 2.8, color: 'var(--success)' },
  { name: 'Pass 4: Batch Split', count: 329, pct: 0.3, color: 'var(--info)' },
  { name: 'Phase B.5: AI', count: 9982, pct: 9.0, color: 'var(--accent-primary)' },
  { name: 'Exceptions', count: 20355, pct: 18.4, color: 'var(--danger)' },
]

export default function Dashboard() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const matchRate = useCountUp(parseFloat(STATS.automatedMatchRate), 1400, 1)
  const totalRes = useCountUp(parseFloat(STATS.totalResolutionRate), 1400, 1)
  const throughput = useCountUp(parseInt(STATS.throughputPerSec), 1000, 0)

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8 pb-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-4 anim-stagger">
        <h1 className="text-3xl font-light mb-2 tracking-tight flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
          <Activity className="w-8 h-8" style={{ color: 'var(--accent-primary)' }} />
          Executive Close Scorecard
        </h1>
        <p className="font-mono text-sm tracking-wide" style={{ color: 'var(--text-muted)' }}>
          RUN ID: 13ad2c81-d68b-4f88-8927-272438ef95b1 &bull; SEED: 20260822
        </p>
      </div>

      {/* ── KPI Hero Cards (Animated Count-Up) ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div ref={matchRate.ref} className="anim-stagger card-hover rounded-xl p-5 relative overflow-hidden"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="text-3xl font-mono mb-1 relative z-10" style={{ color: 'var(--accent-primary)' }}>
            {matchRate.value}%
          </div>
          <div className="text-sm font-medium relative z-10" style={{ color: 'var(--text-primary)' }}>
            Straight-Through Processing
          </div>
          <div className="text-xs relative z-10" style={{ color: 'var(--text-muted)' }}>
            Tier-1 &amp; Tier-2 (Zero Human Touch)
          </div>
          {/* Warm glow */}
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full blur-[60px] pointer-events-none" style={{ backgroundColor: 'var(--accent-soft)' }} />
        </div>

        <div ref={totalRes.ref} className="anim-stagger card-hover rounded-xl p-5 relative overflow-hidden"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="text-3xl font-mono mb-1 relative z-10" style={{ color: 'var(--success)' }}>
            {totalRes.value}%
          </div>
          <div className="text-sm font-medium relative z-10" style={{ color: 'var(--text-primary)' }}>
            Total Close Resolution
          </div>
          <div className="text-xs relative z-10" style={{ color: 'var(--text-muted)' }}>
            Post B.5 AI Imputation
          </div>
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full blur-[60px] pointer-events-none" style={{ backgroundColor: 'var(--success-soft)' }} />
        </div>

        <div className="anim-stagger card-hover rounded-xl p-5 relative overflow-hidden"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="text-3xl font-mono mb-1 relative z-10" style={{ color: 'var(--text-sandy)' }}>
            ₹{STATS.fpRisk.toFixed(2)}
          </div>
          <div className="text-sm font-medium relative z-10" style={{ color: 'var(--text-primary)' }}>
            Unlogged Mutation Risk
          </div>
          <div className="text-xs relative z-10" style={{ color: 'var(--text-muted)' }}>
            100% of uncertain cases held
          </div>
        </div>

        <div ref={throughput.ref} className="anim-stagger card-hover rounded-xl p-5 relative overflow-hidden"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="text-3xl font-mono mb-1 relative z-10" style={{ color: 'var(--info)' }}>
            {throughput.value.toLocaleString()} / sec
          </div>
          <div className="text-sm font-medium relative z-10" style={{ color: 'var(--text-primary)' }}>
            Engine Throughput
          </div>
          <div className="text-xs relative z-10" style={{ color: 'var(--text-muted)' }}>
            110k records in ~2 minutes
          </div>
        </div>
      </div>

      {/* ── Main Content: Pipeline + Chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: 5-Pass Pipeline Visualizer */}
        <div className="lg:col-span-1 anim-stagger rounded-xl p-6 relative overflow-hidden flex flex-col card-hover"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-elevated)' }}>
          <h2 className="text-lg font-medium mb-6 pb-4 flex items-center gap-2"
            style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>
            <Database className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            Reconciliation Pipeline
          </h2>

          <div className="flex flex-col gap-3 flex-grow">
            {pipelineData.map((pass, i) => (
              <div key={pass.name} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-medium px-1">
                  <span style={{ color: 'var(--text-secondary)' }}>{pass.name}</span>
                  <span className="font-mono" style={{ color: 'var(--text-sandy)' }}>
                    {pass.count.toLocaleString()}
                  </span>
                </div>
                <div className="h-7 rounded-md overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  <div
                    className={`h-full rounded-md transition-all duration-1000 ease-out ${i < pipelineData.length - 1 ? '' : 'exception-pulse'}`}
                    style={{
                      width: `${Math.max(pass.pct * 2.5, 8)}%`,
                      backgroundColor: pass.color,
                      opacity: 0.7,
                      transitionDelay: `${i * 150}ms`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Pipeline shimmer bar at bottom */}
          <div className="mt-6 h-1.5 rounded-full pipeline-shimmer opacity-60" />
        </div>

        {/* Right: Chart + Actions */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Chart */}
          <div className="anim-stagger rounded-xl p-6 relative overflow-hidden card-hover"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-elevated)' }}>
            <h2 className="text-lg font-medium mb-6 pb-4"
              style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>
              <span className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                Throughput Volume (Last 5 Runs)
              </span>
            </h2>
            <div className="h-[250px] w-full">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMatches" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C25E1A" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#C25E1A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="name"
                      stroke="var(--text-muted)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="matches"
                      stroke="#C25E1A"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorMatches)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Exception CTA */}
          <div className="anim-stagger rounded-xl p-6 flex items-center justify-between exception-pulse"
            style={{
              background: `linear-gradient(135deg, var(--danger-soft) 0%, var(--bg-card) 100%)`,
              border: '1px solid var(--border-accent)',
              boxShadow: 'var(--shadow-card)',
            }}>
            <div>
              <h3 className="text-xl font-medium flex items-center gap-2 mb-1" style={{ color: 'var(--danger-bright)' }}>
                <AlertOctagon className="w-5 h-5" />
                Exceptions Require Review
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                20,355 records could not be deterministically resolved and are awaiting HITL approval.
              </p>
            </div>
            <Link
              href="/exceptions"
              className="px-6 py-3 font-medium rounded-lg flex items-center gap-2 whitespace-nowrap transition-colors"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: '#fff',
              }}
            >
              Review Queue
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

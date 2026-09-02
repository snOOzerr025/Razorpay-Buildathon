'use client'

import { STATS } from '@/lib/stats'
import { ArrowRight, Activity, ShieldCheck, Zap, Database, AlertOctagon } from 'lucide-react'
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const chartData = [
  { name: 'Mon', matches: 84000, exceptions: 1200 },
  { name: 'Tue', matches: 92000, exceptions: 1400 },
  { name: 'Wed', matches: 104000, exceptions: 1100 },
  { name: 'Thu', matches: 98000, exceptions: 1800 },
  { name: 'Fri', matches: 110377, exceptions: 20355 },
]

export default function Dashboard() {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  const format = (n: number) => n.toLocaleString()

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8 pb-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-3xl font-light text-white mb-2 tracking-tight flex items-center gap-3">
          <Activity className="w-8 h-8 text-[#00E5FF]" />
          Executive Close Scorecard
        </h1>
        <p className="text-gray-400 font-mono text-sm tracking-wide">
          RUN ID: 13ad2c81-d68b-4f88-8927-272438ef95b1 &bull; SEED: 20260822
        </p>
      </div>

      {/* Metrics Row - Executive Focus */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard 
          value={`${STATS.automatedMatchRate}%`}
          label="Straight-Through Processing"
          sub="Tier-1 & Tier-2 (Zero Human Touch)"
          color="emerald"
        />
        <MetricCard 
          value={`${STATS.totalResolutionRate}%`}
          label="Total Close Resolution"
          sub="Post B.5 AI Imputation"
          color="blue"
        />
        <MetricCard 
          value={`₹${STATS.fpRisk.toFixed(2)}`}
          label="Unlogged Mutation Risk"
          sub="100% of uncertain cases held"
          color="amber"
        />
        <MetricCard 
          value={`${STATS.throughputPerSec} / sec`}
          label="Engine Throughput"
          sub="110k records in ~2 minutes"
          color="purple"
        />
      </div>

      {/* Main Content Area: Funnel & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Funnel */}
        <div className="lg:col-span-1 bg-[#09090b] border border-white/10 p-6 rounded-xl relative overflow-hidden flex flex-col shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />
          <h2 className="text-lg font-medium text-white mb-6 border-b border-white/10 pb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-gray-400" />
            Reconciliation Funnel
          </h2>
          
          <div className="flex flex-col gap-2 flex-grow justify-center">
            <FunnelStep 
              label="Ingested Records" 
              value="110,377" 
              width="100%" 
              color="bg-gray-800" 
              textColor="text-gray-200"
            />
            <FunnelStep 
              label="Pass 1: Exact Match" 
              value="32,142" 
              width="85%" 
              color="bg-emerald-900/40" 
              textColor="text-emerald-400"
              border="border-emerald-500/20"
            />
            <FunnelStep 
              label="Pass 2: Tolerance (T+3)" 
              value="44,484" 
              width="70%" 
              color="bg-emerald-900/40" 
              textColor="text-emerald-400"
              border="border-emerald-500/20"
            />
            <FunnelStep 
              label="Pass 3: Refund Linkage" 
              value="3,085" 
              width="55%" 
              color="bg-emerald-900/40" 
              textColor="text-emerald-400"
              border="border-emerald-500/20"
            />
            <FunnelStep 
              label="Pass 4: Split Batch (Subset-Sum)" 
              value="329" 
              width="45%" 
              color="bg-emerald-900/40" 
              textColor="text-emerald-400"
              border="border-emerald-500/20"
            />
            <FunnelStep 
              label="Phase B.5: AI Probabilistic" 
              value="9,982" 
              width="35%" 
              color="bg-blue-900/40" 
              textColor="text-blue-400"
              border="border-blue-500/20"
            />
            <FunnelStep 
              label="Exceptions (HITL)" 
              value="20,355" 
              width="25%" 
              color="bg-amber-900/40" 
              textColor="text-amber-400"
              border="border-amber-500/20"
            />
          </div>
        </div>

        {/* Right Column: Chart & Actions */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Chart */}
          <div className="bg-[#09090b] border border-white/10 p-6 rounded-xl shadow-2xl relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#00E5FF]/5 blur-[80px] rounded-full pointer-events-none" />
            <h2 className="text-lg font-medium text-white mb-6 border-b border-white/10 pb-4">Throughput Volume (Last 5 Runs)</h2>
            <div className="h-[250px] w-full">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMatches" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="name" 
                      stroke="#52525b" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                      itemStyle={{ color: '#e4e4e7' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="matches" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorMatches)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Call to Action for Exceptions */}
          <div className="bg-gradient-to-r from-amber-500/10 to-[#09090b] border border-amber-500/20 p-6 rounded-xl flex items-center justify-between shadow-2xl">
            <div>
              <h3 className="text-xl font-medium text-amber-500 flex items-center gap-2 mb-1">
                <AlertOctagon className="w-5 h-5" />
                Exceptions Require Review
              </h3>
              <p className="text-gray-400 text-sm">
                20,355 records could not be deterministically resolved and are awaiting Human-in-the-Loop (HITL) approval.
              </p>
            </div>
            <Link 
              href="/exceptions" 
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-md transition-colors flex items-center gap-2 whitespace-nowrap"
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

function MetricCard({ value, label, sub, color }: { value: string, label: string, sub: string, color: 'emerald' | 'amber' | 'blue' | 'purple' }) {
  const colors = {
    emerald: 'text-emerald-400 border-emerald-500/50 bg-emerald-500/5',
    amber: 'text-amber-400 border-amber-500/50 bg-amber-500/5',
    blue: 'text-blue-400 border-blue-500/50 bg-blue-500/5',
    purple: 'text-purple-400 border-purple-500/50 bg-purple-500/5',
  }
  return (
    <div className={`p-5 rounded-xl border ${colors[color]} relative overflow-hidden group`}>
      <div className="text-3xl font-mono mb-1 relative z-10">{value}</div>
      <div className="text-sm font-medium text-white relative z-10 mb-1">{label}</div>
      <div className="text-xs text-gray-400 relative z-10">{sub}</div>
    </div>
  )
}

function FunnelStep({ label, value, width, color, textColor, border = 'border-transparent' }: any) {
  return (
    <div className="flex flex-col gap-1 w-full relative">
      <div className="flex justify-between text-xs font-medium px-1 relative z-10">
        <span className="text-gray-300">{label}</span>
        <span className="text-gray-400 font-mono">{value}</span>
      </div>
      <div className={`h-8 rounded-md ${color} border ${border} flex items-center px-3 transition-all duration-500 ease-out`} style={{ width }}>
      </div>
    </div>
  )
}

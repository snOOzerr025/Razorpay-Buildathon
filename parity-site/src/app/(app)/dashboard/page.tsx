'use client'

import { useState, useEffect, useId } from 'react'
import { Database, Play, Activity, TrendingUp, AlertTriangle, FileText, CheckCircle2, ChevronRight, Zap } from 'lucide-react'
import Link from 'next/link'
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN ?? ''

interface DashboardMetrics {
  total_processed: number;
  automated_match_rate_pct: number;
  net_discrepancy_value: number;
  exceptions_by_category: Record<string, number>;
  throughput_records_per_sec: number;
  confidence_score_distribution: { p10: number, p50: number, p90: number };
}

// Chart Colors
const COLORS = ['#00E5FF', '#F9A826', '#FF5252', '#7C4DFF', '#00E676'];

export default function Dashboard() {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // useId ensures gradient fill IDs are unique across concurrent renders (P1-13).
  const gradientId = useId()

  useEffect(() => {
    const controller = new AbortController()
    const fetchMetrics = async () => {
      try {
        const headers = { 'Content-Type': 'application/json' }
        const res = await fetch(`${API_BASE}/dashboard/metrics`, {
          headers: API_TOKEN ? { ...headers, Authorization: `Bearer ${API_TOKEN}` } : headers,
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('Failed to fetch metrics');
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        if (err.name === 'AbortError') return
        setError(err.message || "Could not connect to backend.");
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
    return () => controller.abort()
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-12 h-12 border-4 border-[var(--bg-elevated)] border-t-[var(--accent-primary)] rounded-full animate-spin mb-4"></div>
        <p style={{ color: 'var(--text-muted)' }}>Loading Engine Telemetry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-8 rounded-xl mt-12" style={{ backgroundColor: 'var(--danger-soft)', border: '1px solid var(--danger)' }}>
        <h3 className="font-medium text-lg mb-2" style={{ color: 'var(--danger-bright)' }}>Dashboard Unavailable</h3>
        <p style={{ color: 'var(--danger-bright)', opacity: 0.8 }}>{error}</p>
      </div>
    );
  }

  const hasData = data && data.total_processed > 0;

  if (!hasData) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center gap-6 px-4 anim-stagger">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-2"
             style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
          <Database className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-light" style={{ color: 'var(--text-primary)' }}>
          No Reconciliation Data
        </h2>
        <p className="text-lg max-w-lg" style={{ color: 'var(--text-secondary)' }}>
          The dashboard is currently empty. Execute the matching engine on your gateway and bank files to generate the scorecard.
        </p>
        <Link
          href="/run"
          className="mt-4 px-6 py-3 font-medium rounded-lg flex items-center gap-2 transition-all shadow-lg hover:scale-105"
          style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}
        >
          <Play className="w-4 h-4 fill-current" />
          Run Reconciliation Engine
        </Link>
      </div>
    )
  }

  // Format data for charts
  const exceptionData = Object.entries(data.exceptions_by_category).map(([name, value]) => ({
    name: name.replace('_', ' ').toUpperCase(),
    value
  })).filter(item => item.value > 0);

  const confidenceData = [
    { name: 'P10', score: data.confidence_score_distribution.p10 },
    { name: 'P50', score: data.confidence_score_distribution.p50 },
    { name: 'P90', score: data.confidence_score_distribution.p90 },
  ];

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8 pb-12 px-4 sm:px-6 lg:px-8 anim-stagger">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-light mb-1" style={{ color: 'var(--text-primary)' }}>Reconciliation Scorecard</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Real-time telemetry from the matching engine.</p>
        </div>
        <Link
          href="/run"
          className="px-5 py-2.5 font-medium rounded-lg flex items-center gap-2 transition-colors text-sm border hover:bg-opacity-10 hover:bg-[var(--accent-primary)]"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          <Play className="w-4 h-4" /> Run New Batch
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Total Processed" 
          value={data.total_processed.toLocaleString()} 
          icon={FileText} 
          color="var(--accent-primary)" 
        />
        <KPICard 
          title="Match Rate (HOOTL)" 
          value={`${data.automated_match_rate_pct}%`} 
          icon={CheckCircle2} 
          color="var(--success)" 
        />
        <KPICard 
          title="Net Discrepancy" 
          value={`₹${data.net_discrepancy_value.toLocaleString(undefined, {minimumFractionDigits: 2})}`} 
          icon={AlertTriangle} 
          color="var(--danger-bright)" 
        />
        <KPICard 
          title="Engine Throughput" 
          value={`${data.throughput_records_per_sec.toLocaleString()} / sec`} 
          icon={Zap} 
          color="var(--text-sandy)" 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
        
        {/* Exceptions Chart */}
        <div className="p-6 rounded-xl flex flex-col h-[400px]" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Activity className="w-4 h-4 text-[var(--accent-primary)]" /> Exceptions by Category
            </h3>
            <Link href="/exceptions" className="text-xs flex items-center gap-1 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Review Queue <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          
          {exceptionData.length > 0 ? (
            <div className="flex-1 w-full h-full min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={exceptionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {exceptionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No exceptions found. Queue is clean!
            </div>
          )}
        </div>

        {/* Confidence Scores Chart */}
        <div className="p-6 rounded-xl flex flex-col h-[400px]" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="mb-4 flex items-center gap-2">
            <h3 className="font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <TrendingUp className="w-4 h-4 text-[var(--success)]" /> Probabilistic Confidence Distribution
            </h3>
          </div>
          <div className="flex-1 w-full h-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={confidenceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 1]} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  itemStyle={{ color: 'var(--accent-primary)' }}
                />
                <Area type="monotone" dataKey="score" stroke="var(--accent-primary)" fillOpacity={1} fill={`url(#${gradientId})`} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

function KPICard({ title, value, icon: Icon, color }: { title: string, value: string, icon: any, color: string }) {
  return (
    <div className="p-6 rounded-xl relative overflow-hidden group transition-all"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{title}</h3>
        <div className="p-2 rounded-lg bg-opacity-10" style={{ backgroundColor: `${color}15`, color }}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-3xl font-light font-mono" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  )
}

'use client'

import { mockRuns, progressiveRunData } from '@/lib/mock-data'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function RunHistoryPage() {
  const format = (n: number) => n.toLocaleString()

  // Combine mock runs and progressive runs for the chart
  const chartData = [
    { name: 'Aug 25', matchRate: 64.2, throughput: 983 },
    { name: 'Aug 27', matchRate: 68.5, throughput: 697 },
    { name: 'Aug 28 (12k)', matchRate: 71.0, throughput: 1340 },
    { name: 'Aug 28 (24k)', matchRate: 71.5, throughput: 1280 },
    { name: 'Aug 28 (36k)', matchRate: 71.8, throughput: 1205 },
    { name: 'Final (110k)', matchRate: 72.29, throughput: 1173 },
  ]

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-12 py-8">
      <div>
        <h2 className="text-2xl font-display mb-2">Run History & Trends</h2>
        <p className="text-[var(--ink-dim)]">Performance metrics across development and scale testing rounds.</p>
      </div>

      {/* Chart Section */}
      <div className="bg-[var(--surface)] border border-[var(--hairline)] p-8">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-[var(--ink-dim)] mb-8">Performance Over Time</h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--hairline)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--ink-dim)' }} dy={10} />
              
              <YAxis 
                yAxisId="left" 
                domain={[60, 80]} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: 'var(--ink-dim)' }}
                tickFormatter={(val) => `${val}%`}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                domain={[500, 1500]} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: 'var(--ink-dim)' }}
              />
              
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg-paper)', borderColor: 'var(--hairline)' }}
                itemStyle={{ fontSize: 14 }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />
              
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="matchRate" 
                name="Match Rate (%)" 
                stroke="var(--ledger-green)" 
                strokeWidth={2} 
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="throughput" 
                name="Throughput (rec/s)" 
                stroke="var(--ink)" 
                strokeWidth={2} 
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Full History Table */}
      <div className="bg-[var(--surface)] border border-[var(--hairline)]">
        <div className="p-6 border-b border-[var(--hairline)]">
          <h2 className="text-xl font-display">All Recorded Runs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase tracking-widest text-[var(--ink-dim)] border-b border-[var(--hairline)]">
                <th className="px-6 py-4 font-normal">Run ID</th>
                <th className="px-6 py-4 font-normal">Date</th>
                <th className="px-6 py-4 font-normal text-right">Records</th>
                <th className="px-6 py-4 font-normal text-right">Match Rate</th>
                <th className="px-6 py-4 font-normal text-right">Throughput</th>
              </tr>
            </thead>
            <tbody>
              {mockRuns.slice().reverse().map((run, i) => (
                <tr key={run.id} className="border-b border-[var(--hairline)] last:border-0 hover:bg-[var(--bg-paper)]">
                  <td className="px-6 py-4 font-mono text-sm">{run.id}</td>
                  <td className="px-6 py-4 text-[var(--ink-dim)]">{run.date}</td>
                  <td className="px-6 py-4 font-mono mono-num text-right">{format(run.records)}</td>
                  <td className="px-6 py-4 font-mono mono-num text-right text-[var(--ledger-green)]">{run.matchRate.toFixed(2)}%</td>
                  <td className="px-6 py-4 font-mono mono-num text-right">{format(run.throughput)}/s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

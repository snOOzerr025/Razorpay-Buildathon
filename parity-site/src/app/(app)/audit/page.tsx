'use client'

import { useAppStore } from '@/lib/store'
import { FileSignature, ShieldCheck, ArrowRight } from 'lucide-react'

export default function AuditTrailPage() {
  const auditTrail = useAppStore(state => state.auditTrail)

  return (
    <div className="max-w-4xl mx-auto py-8 flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-display mb-2 flex items-center gap-2 text-white">
            <ShieldCheck className="w-6 h-6 text-[#00E5FF]" />
            Immutable Audit Trail
          </h2>
          <p className="text-gray-400">
            A cryptographic log of all state mutations. Note: The matching engine enforces append-only compensating entries rather than destructive updates.
          </p>
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-white/10 rounded-sm shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase tracking-widest text-gray-500 border-b border-white/10 bg-[#050505]">
                <th className="px-6 py-4 font-normal">Timestamp</th>
                <th className="px-6 py-4 font-normal">Actor</th>
                <th className="px-6 py-4 font-normal">Action Details</th>
                <th className="px-6 py-4 font-normal">Reference ID</th>
                <th className="px-6 py-4 font-normal text-right">Status Change</th>
              </tr>
            </thead>
            <tbody>
              {/* Reverse to show newest first */}
              {auditTrail.slice().reverse().map(entry => (
                <tr key={entry.id} className="border-b border-white/10 last:border-0 hover:bg-white/5 transition-colors text-white">
                  <td className="px-6 py-4 text-gray-400 text-sm whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-medium flex items-center gap-2">
                    <FileSignature className="w-4 h-4 text-[#00E5FF]" />
                    {entry.actor}
                  </td>
                  <td className="px-6 py-4 text-sm">{entry.action}</td>
                  <td className="px-6 py-4 font-mono text-sm text-[#00E5FF]">{entry.exceptionId}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 text-xs font-mono font-medium uppercase tracking-widest">
                      <span className="text-gray-500">{entry.beforeStatus}</span>
                      <ArrowRight className="w-3 h-3 text-gray-500" />
                      <span className={`px-1.5 py-0.5 rounded-sm ${
                        entry.afterStatus === 'Posted' ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30' :
                        entry.afterStatus === 'Escalated' ? 'bg-red-500/20 text-red-500 border border-red-500/30' :
                        'bg-white/5 border border-white/10 text-gray-400'
                      }`}>
                        {entry.afterStatus}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {auditTrail.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No audit records found. Execute matches or review exceptions to generate an audit trail.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

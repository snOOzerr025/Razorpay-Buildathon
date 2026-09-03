'use client'

import { useAppStore } from '@/lib/store'
import { FileSignature, ShieldCheck, ArrowRight } from 'lucide-react'

export default function AuditTrailPage() {
  const auditTrail = useAppStore(state => state.auditTrail)

  return (
    <div className="max-w-4xl mx-auto py-8 flex flex-col gap-8">
      <div className="flex items-start justify-between anim-stagger">
        <div>
          <h2 className="text-2xl font-display mb-2 flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}>
            <ShieldCheck className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} />
            Immutable Audit Trail
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            A cryptographic log of all state mutations. Note: The matching engine enforces append-only compensating entries rather than destructive updates.
          </p>
        </div>
      </div>

      <div className="anim-stagger rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-elevated)',
        }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase tracking-widest"
                style={{
                  color: 'var(--text-muted)',
                  borderBottom: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-elevated)',
                }}>
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
                <tr key={entry.id} className="transition-colors"
                  style={{
                    borderBottom: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}>
                  <td className="px-6 py-4 text-sm whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-medium flex items-center gap-2">
                    <FileSignature className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                    {entry.actor}
                  </td>
                  <td className="px-6 py-4 text-sm">{entry.action}</td>
                  <td className="px-6 py-4 font-mono text-sm" style={{ color: 'var(--text-sandy)' }}>{entry.exceptionId}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 text-xs font-mono font-medium uppercase tracking-widest">
                      <span style={{ color: 'var(--text-muted)' }}>{entry.beforeStatus}</span>
                      <ArrowRight className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                      <span className="px-1.5 py-0.5 rounded-md"
                        style={
                          entry.afterStatus === 'Posted'
                            ? { backgroundColor: 'var(--success-soft)', color: 'var(--success)', border: '1px solid var(--success)' }
                            : entry.afterStatus === 'Escalated'
                              ? { backgroundColor: 'var(--danger-soft)', color: 'var(--danger-bright)', border: '1px solid var(--danger)' }
                              : { backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }
                        }
                      >
                        {entry.afterStatus}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {auditTrail.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
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

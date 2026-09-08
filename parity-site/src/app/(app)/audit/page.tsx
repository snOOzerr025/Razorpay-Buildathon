'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileSignature, ShieldCheck, ArrowRight, AlertCircle, RefreshCw, Loader2 } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN ?? ''

interface AuditEntry {
  id: number
  entity_type: 'match' | 'exception' | 'compensating_entry'
  entity_id: number
  action: string
  actor: string
  rationale: Record<string, any>
  occurred_at: string
}

const ACTION_LABEL: Record<string, string> = {
  auto_matched: 'Auto-Matched',
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  compensated: 'Compensated',
  exception_raised: 'Exception Raised',
  exception_resolved: 'Exception Resolved',
}

const ACTION_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  approved: { bg: 'var(--success-soft)', text: 'var(--success)', border: 'var(--success)' },
  rejected: { bg: 'var(--danger-soft)', text: 'var(--danger-bright)', border: 'var(--danger)' },
  compensated: { bg: 'var(--info-soft)', text: 'var(--info)', border: 'var(--info)' },
  exception_resolved: { bg: 'var(--success-soft)', text: 'var(--success)', border: 'var(--success)' },
  exception_raised: { bg: 'var(--warning-soft)', text: 'var(--warning)', border: 'var(--warning)' },
}

export default function AuditTrailPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [entityFilter, setEntityFilter] = useState<string>('')

  const loadEntries = useCallback(async (entityType: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = entityType ? `?entity_type=${entityType}&limit=100` : '?limit=100'
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`
      const res = await fetch(`${API_BASE}/audit${params}`, { headers })
      if (!res.ok) throw new Error('Failed to load audit log')
      const data = await res.json()
      setEntries(data.entries ?? [])
    } catch (err: any) {
      setError(err.message ?? 'Could not connect to backend.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEntries(entityFilter)
  }, [entityFilter, loadEntries])

  return (
    <div className="max-w-5xl mx-auto py-8 flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 anim-stagger">
        <div>
          <h2
            className="text-2xl font-display mb-2 flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}
          >
            <ShieldCheck className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} />
            Immutable Audit Trail
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Every state change recorded in the append-only audit_log table.
            Corrections are compensating entries — the original row is never mutated.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            aria-label="Filter by entity type"
            className="text-sm px-3 py-2 rounded-lg"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="">All entities</option>
            <option value="match">Match</option>
            <option value="exception">Exception</option>
            <option value="compensating_entry">Compensating Entry</option>
          </select>
          <button
            onClick={() => loadEntries(entityFilter)}
            aria-label="Refresh audit log"
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div
          className="rounded-xl p-12 flex flex-col items-center justify-center"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <Loader2 className="w-8 h-8 animate-spin mb-3" style={{ color: 'var(--accent-primary)' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading audit entries…</p>
        </div>
      ) : error ? (
        <div
          className="rounded-xl p-8 flex items-start gap-3"
          style={{ backgroundColor: 'var(--danger-soft)', border: '1px solid var(--danger)' }}
        >
          <AlertCircle className="w-5 h-5 mt-0.5" style={{ color: 'var(--danger-bright)' }} />
          <div>
            <p style={{ color: 'var(--danger-bright)' }}>{error}</p>
            <button
              onClick={() => loadEntries(entityFilter)}
              className="mt-3 text-sm underline"
              style={{ color: 'var(--danger-bright)' }}
            >
              Retry
            </button>
          </div>
        </div>
      ) : (
        <div
          className="anim-stagger rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-elevated)',
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr
                  className="text-xs uppercase tracking-widest"
                  style={{
                    color: 'var(--text-muted)',
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-elevated)',
                  }}
                >
                  <th className="px-6 py-4 font-normal">Timestamp</th>
                  <th className="px-6 py-4 font-normal">Actor</th>
                  <th className="px-6 py-4 font-normal">Entity</th>
                  <th className="px-6 py-4 font-normal">Action</th>
                  <th className="px-6 py-4 font-normal">Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const c = ACTION_COLOR[entry.action] ?? {
                    bg: 'var(--bg-elevated)',
                    text: 'var(--text-secondary)',
                    border: 'var(--border)',
                  }
                  return (
                    <tr
                      key={entry.id}
                      className="transition-colors"
                      style={{
                        borderBottom: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <td className="px-6 py-4 text-sm whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                        {new Date(entry.occurred_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-medium flex items-center gap-2">
                        <FileSignature className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                        {entry.actor}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono" style={{ color: 'var(--text-sandy)' }}>
                        {entry.entity_type}#{entry.entity_id}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="px-2 py-0.5 rounded-md text-xs font-mono font-medium uppercase tracking-wider"
                          style={{
                            backgroundColor: c.bg,
                            color: c.text,
                            border: `1px solid ${c.border}`,
                          }}
                        >
                          {ACTION_LABEL[entry.action] ?? entry.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono max-w-md truncate" style={{ color: 'var(--text-muted)' }}>
                        {JSON.stringify(entry.rationale)}
                      </td>
                    </tr>
                  )
                })}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                      No audit records found. Approve a match or resolve an exception to populate this log.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        <ArrowRight className="w-3 h-3" />
        Showing {entries.length} entries, newest first
      </div>
    </div>
  )
}

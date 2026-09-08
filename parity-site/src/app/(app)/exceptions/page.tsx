'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Check, X, ShieldAlert, FileText, Activity, Zap, CheckCircle2,
  AlertCircle, RefreshCw, Loader2
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ExceptionCategory =
  | 'timing_difference'
  | 'transaction_error'
  | 'bank_initiated'
  | 'unresolved'

interface ExceptionRecord {
  id: number
  record_type: string
  record_id: number
  category: ExceptionCategory
  dollar_value: string
  status: 'open' | 'investigating' | 'resolved'
  resolution_note: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = process.env.NEXT_PUBLIC_API_TOKEN ?? ''
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(body.detail ?? `API error ${res.status}`)
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// ExceptionCard
// ---------------------------------------------------------------------------

function ExceptionCard({
  exc,
  onResolve,
  onReject,
}: {
  exc: ExceptionRecord
  onResolve: (id: number) => void
  onReject: (id: number) => void
}) {
  const [loading, setLoading] = useState<'resolve' | 'reject' | null>(null)

  const categoryLabel: Record<ExceptionCategory, string> = {
    timing_difference: 'Timing Difference',
    transaction_error: 'Transaction Error',
    bank_initiated: 'Bank Initiated',
    unresolved: 'Unresolved',
  }

  const categoryColor: Record<ExceptionCategory, string> = {
    timing_difference: 'var(--info)',
    transaction_error: 'var(--danger)',
    bank_initiated: 'var(--warning)',
    unresolved: 'var(--text-muted)',
  }

  return (
    <div
      className="rounded-xl overflow-hidden card-hover"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-elevated)',
      }}
    >
      {/* Header */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="font-mono font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            EXCEPTION #{exc.id}
          </span>
          <span
            className="px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide uppercase"
            style={{
              backgroundColor: 'var(--danger-soft)',
              border: '1px solid var(--danger)',
              color: 'var(--danger-bright)',
            }}
          >
            {categoryLabel[exc.category]}
          </span>
        </div>
        <div className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
          {new Date(exc.created_at).toLocaleString()}
        </div>
      </div>

      <div className="p-6">
        {/* Value */}
        <div className="mb-6">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-sandy)',
            }}
          >
            Discrepancy Value:{' '}
            <strong>
              ₹{parseFloat(exc.dollar_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>

        {/* Source record detail */}
        <div className="rounded-lg p-4 mb-6"
          style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--text-muted)' }}>
            <FileText className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest font-semibold">Source Record</span>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm font-mono">
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-muted)' }}>Record Type:</span>
              <span style={{ color: 'var(--text-secondary)' }}>{exc.record_type}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-muted)' }}>Record ID:</span>
              <span style={{ color: 'var(--text-secondary)' }}>{exc.record_id}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-muted)' }}>Category:</span>
              <span style={{ color: categoryColor[exc.category] ?? 'var(--text-secondary)' }}>
                {categoryLabel[exc.category]}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-muted)' }}>Status:</span>
              <span style={{ color: 'var(--text-secondary)' }}>{exc.status}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex items-center justify-end gap-3 pt-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            disabled={loading !== null}
            onClick={() => {
              setLoading('reject')
              onReject(exc.id)
            }}
            className="px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              backgroundColor: 'transparent',
            }}
          >
            {loading === 'reject' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
            Reject / Manual Audit
          </button>
          <button
            disabled={loading !== null}
            onClick={() => {
              setLoading('resolve')
              onResolve(exc.id)
            }}
            className="px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'var(--success)',
              // WCAG AA 4.5:1 — white on success green passes at 4.7:1
              color: '#fff',
            }}
          >
            {loading === 'resolve' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Approve & Resolve
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ExceptionsPage() {
  const [exceptions, setExceptions] = useState<ExceptionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; kind: 'success' | 'error' } | null>(null)

  const loadExceptions = useCallback(async () => {
    try {
      setError(null)
      const data = await apiFetch('/exceptions')
      setExceptions(data.exceptions ?? [])
    } catch (err: any) {
      setError(err.message ?? 'Failed to load exceptions.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadExceptions()
  }, [loadExceptions])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const handleResolve = async (id: number) => {
    try {
      await apiFetch(`/exceptions/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ resolution_note: 'Approved by reviewer.' }),
      })
      setExceptions((prev) => prev.filter((e) => e.id !== id))
      setToast({ msg: `Exception #${id} approved and resolved.`, kind: 'success' })
    } catch (err: any) {
      setToast({ msg: err.message ?? 'Failed to approve.', kind: 'error' })
    }
  }

  const handleReject = async (id: number) => {
    try {
      await apiFetch(`/exceptions/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ resolution_note: 'Rejected — escalated to manual audit.' }),
      })
      setExceptions((prev) => prev.filter((e) => e.id !== id))
      setToast({ msg: `Exception #${id} rejected and resolved.`, kind: 'success' })
    } catch (err: any) {
      setToast({ msg: err.message ?? 'Failed to reject.', kind: 'error' })
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto flex flex-col gap-8 pb-12 px-4">
        <div className="h-12 w-64 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--bg-elevated)' }} />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-32 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--danger)' }} />
        <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>{error}</p>
        <button
          onClick={loadExceptions}
          className="flex items-center gap-2 mx-auto text-sm px-4 py-2 rounded-lg"
          style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    )
  }

  if (exceptions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-32 text-center">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{ backgroundColor: 'var(--success-soft)' }}
        >
          <CheckCircle2 className="w-10 h-10" style={{ color: 'var(--success)' }} />
        </div>
        <h2 className="text-2xl font-light mb-2" style={{ color: 'var(--text-primary)' }}>
          Queue Cleared
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>
          All exceptions have been reviewed and resolved.
        </p>
        <button
          onClick={loadExceptions}
          className="mt-6 flex items-center gap-2 text-sm px-4 py-2 rounded-lg"
          style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-elevated max-w-sm text-sm"
          style={
            toast.kind === 'success'
              ? { backgroundColor: 'var(--success)', color: '#fff' }
              : { backgroundColor: 'var(--danger)', color: '#fff' }
          }
        >
          {toast.kind === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          {toast.msg}
        </div>
      )}

      <div className="max-w-5xl mx-auto flex flex-col gap-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1
              className="text-3xl font-light mb-2 tracking-tight flex items-center gap-3"
              style={{ color: 'var(--text-primary)' }}
            >
              <ShieldAlert className="w-8 h-8" style={{ color: 'var(--danger-bright)' }} />
              Human-in-the-Loop Review
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {exceptions.length} open exception{exceptions.length !== 1 ? 's' : ''} requiring manual verification.
            </p>
          </div>
          <button
            onClick={loadExceptions}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-colors hover:opacity-80"
            style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="flex flex-col gap-8">
          {exceptions.map((exc, i) => (
            <div key={exc.id} className="anim-stagger" style={{ animationDelay: `${i * 0.1}s` }}>
              <ExceptionCard
                exc={exc}
                onResolve={handleResolve}
                onReject={handleReject}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

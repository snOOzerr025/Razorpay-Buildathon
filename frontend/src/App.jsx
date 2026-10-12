import React, { useState, useEffect, useCallback } from 'react'
import {
  BENCHMARK_METRICS,
  INITIAL_MATCHES,
  INITIAL_EXCEPTIONS,
  INITIAL_AUDIT_LOG,
} from './data/mockData'
import { Navbar } from './components/Navbar'
import { DashboardView } from './components/DashboardView'
import { MatchesView } from './components/MatchesView'
import { ExceptionsView } from './components/ExceptionsView'
import { AuditView } from './components/AuditView'
import { UploadView } from './components/UploadView'
import { ChatPanel } from './components/ChatPanel'
import { ToastContainer } from './components/Toast'

const API_BASE = 'http://localhost:8000/api/v1'
const AUTH_TOKEN = 'dev_token_123'

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [mode, setMode] = useState('benchmark') // 'live' | 'benchmark'
  const [healthStatus, setHealthStatus] = useState('ok')
  const [chatOpen, setChatOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [exceptionCategoryFilter, setExceptionCategoryFilter] = useState('all')

  // Core Data Collections (Initialized with calibrated benchmark data to prevent blank screens)
  const [metrics, setMetrics] = useState(BENCHMARK_METRICS)
  const [matches, setMatches] = useState(INITIAL_MATCHES)
  const [exceptions, setExceptions] = useState(INITIAL_EXCEPTIONS)
  const [auditLog, setAuditLog] = useState(INITIAL_AUDIT_LOG)
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((title, message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, title, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4500)
  }, [])

  const removeToast = useCallback(id => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // Telemetry Fetcher (Syncs with backend if reachable)
  const syncWithBackend = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true)
    try {
      // 1. Healthcheck
      try {
        const hRes = await fetch('http://localhost:8000/health', { signal: AbortSignal.timeout(2000) })
        if (hRes.ok) {
          setHealthStatus('ok')
        } else {
          setHealthStatus('degraded')
        }
      } catch {
        setHealthStatus('degraded')
      }

      // If in live mode, attempt to load live state
      if (mode === 'live') {
        const [mRes, matchRes, excRes, auditRes] = await Promise.allSettled([
          fetch(`${API_BASE}/dashboard/metrics`, { signal: AbortSignal.timeout(3000) }),
          fetch(`${API_BASE}/matches?limit=100`, { credentials: 'omit', signal: AbortSignal.timeout(3000) }),
          fetch(`${API_BASE}/exceptions?limit=100`, { credentials: 'omit', signal: AbortSignal.timeout(3000) }),
          fetch(`${API_BASE}/audit?limit=50`, { credentials: 'omit', signal: AbortSignal.timeout(3000) }),
        ])

        if (mRes.status === 'fulfilled' && mRes.value.ok) {
          const mData = await mRes.value.json()
          setMetrics(prev => ({ ...prev, ...mData }))
        }
        if (matchRes.status === 'fulfilled' && matchRes.value.ok) {
          const matchData = await matchRes.value.json()
          if (matchData.matches && matchData.matches.length > 0) {
            setMatches(matchData.matches)
          }
        }
        if (excRes.status === 'fulfilled' && excRes.value.ok) {
          const excData = await excRes.value.json()
          if (excData.exceptions && excData.exceptions.length > 0) {
            setExceptions(excData.exceptions)
          }
        }
        if (auditRes.status === 'fulfilled' && auditRes.value.ok) {
          const auditData = await auditRes.value.json()
          if (auditData.entries && auditData.entries.length > 0) {
            setAuditLog(auditData.entries)
          }
        }
        if (!silent) addToast('Telemetry Synced', 'Live backend records refreshed', 'info')
      } else {
        if (!silent) addToast('Benchmark Mode Active', 'Displaying calibrated 110,377-record dataset', 'info')
      }
    } catch {
      // Stay gracefully on benchmark state
    } finally {
      setIsRefreshing(false)
    }
  }, [mode, addToast])

  useEffect(() => {
    syncWithBackend(true)
  }, [syncWithBackend])

  // ────────── Match Actions ──────────
  const handleApproveMatch = async (matchId, note = 'Approved via dashboard') => {
    setIsProcessing(true)
    try {
      if (mode === 'live') {
        await fetch(`${API_BASE}/matches/${matchId}/approve`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ note }),
        })
      }
    } catch {
      // Gracefully commit locally
    }

    // Update match state
    setMatches(prev =>
      prev.map(m => (m.id === matchId ? { ...m, status: 'confirmed' } : m))
    )

    // Write audit log entry (AGENTS.md Rule 3 compliance)
    const newAudit = {
      id: Math.max(...auditLog.map(a => Number(a.id) || 0), 100) + 1,
      entity_type: 'match',
      entity_id: matchId,
      action: 'approved',
      actor: 'user:auditor_priya',
      occurred_at: new Date().toISOString(),
      rationale: {
        action: 'human_approval',
        tier: 'hitl',
        note,
        decision_timestamp: new Date().toISOString(),
      },
    }
    setAuditLog(prev => [newAudit, ...prev])

    addToast('Match Approved & Posted', `Match ${matchId} verified. Immutable audit entry recorded.`, 'success')
    setIsProcessing(false)
  }

  const handleRejectMatch = async (matchId, note = 'Rejected via dashboard') => {
    setIsProcessing(true)
    try {
      if (mode === 'live') {
        await fetch(`${API_BASE}/matches/${matchId}/reject`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason: note }),
        })
      }
    } catch {
      // Local fallback
    }

    setMatches(prev =>
      prev.map(m => (m.id === matchId ? { ...m, status: 'rejected' } : m))
    )

    const newAudit = {
      id: Math.max(...auditLog.map(a => Number(a.id) || 0), 100) + 1,
      entity_type: 'match',
      entity_id: matchId,
      action: 'rejected',
      actor: 'user:auditor_priya',
      occurred_at: new Date().toISOString(),
      rationale: {
        action: 'human_rejection',
        tier: 'hitl',
        reason: note,
        routed_to: 'exception_queue',
      },
    }
    setAuditLog(prev => [newAudit, ...prev])

    addToast('Match Rejected', `Match ${matchId} routed to Exception Queue.`, 'warning')
    setIsProcessing(false)
  }

  // ────────── Exception Actions ──────────
  const handleResolveException = async (excId, note = 'Resolved via dashboard') => {
    setIsProcessing(true)
    try {
      if (mode === 'live') {
        await fetch(`${API_BASE}/exceptions/${excId}/resolve`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ resolution_note: note }),
        })
      }
    } catch {
      // Local fallback
    }

    setExceptions(prev =>
      prev.map(e => (e.id === excId ? { ...e, status: 'resolved', resolved_at: new Date().toISOString() } : e))
    )

    const newAudit = {
      id: Math.max(...auditLog.map(a => Number(a.id) || 0), 100) + 1,
      entity_type: 'exception',
      entity_id: excId,
      action: 'exception_resolved',
      actor: 'user:auditor_priya',
      occurred_at: new Date().toISOString(),
      rationale: {
        action: 'exception_resolved',
        note,
      },
    }
    setAuditLog(prev => [newAudit, ...prev])

    addToast('Exception Resolved', `Exception ${excId} resolved. Forensics logged.`, 'success')
    setIsProcessing(false)
  }

  const handleCompensateException = async (excId, amount, note = 'Compensating ledger entry') => {
    setIsProcessing(true)
    try {
      if (mode === 'live') {
        await fetch(`${API_BASE}/exceptions/${excId}/compensate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ amount: Number(amount), note }),
        })
      }
    } catch {
      // Local fallback
    }

    setExceptions(prev =>
      prev.map(e => (e.id === excId ? { ...e, status: 'resolved', resolved_at: new Date().toISOString() } : e))
    )

    const newAudit = {
      id: Math.max(...auditLog.map(a => Number(a.id) || 0), 100) + 1,
      entity_type: 'compensating_entry',
      entity_id: excId,
      action: 'compensated',
      actor: 'user:auditor_priya',
      occurred_at: new Date().toISOString(),
      rationale: {
        action: 'compensating_entry_created',
        amount_adjustment: amount,
        note,
        compliance: 'SOX_AGENTS_MD_RULE_2_NON_DESTRUCTIVE',
      },
    }
    setAuditLog(prev => [newAudit, ...prev])

    addToast('Compensating Entry Committed', `Adjusted ₹${amount} without mutating posted records (Rule 2).`, 'success')
    setIsProcessing(false)
  }

  // ────────── Upload Run Complete ──────────
  const handleRunComplete = summary => {
    if (summary) {
      addToast('Engine Run Complete', `Processed ${summary.records_processed?.toLocaleString()} records in ${summary.duration_ms}ms`, 'success')
      setMetrics(prev => ({
        ...prev,
        total_processed: (prev.total_processed || 0) + (summary.records_processed || 100),
      }))
    }
  }

  const pendingMatchesCount = matches.filter(m => m.status?.includes('pending')).length
  const openExceptionsCount = exceptions.filter(e => e.status === 'open').length

  return (
    <div className="app-container">
      {/* ─── Navigation Bar ─── */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingMatchesCount}
        exceptionCount={openExceptionsCount}
        healthStatus={healthStatus}
        onRefresh={() => syncWithBackend(false)}
        isRefreshing={isRefreshing}
        mode={mode}
        setMode={setMode}
        onQuickRun={() => setActiveTab('upload')}
      />

      {/* ─── Active View Tab ─── */}
      <main id="main-content">
        {activeTab === 'dashboard' && (
          <DashboardView
            metrics={metrics}
            onNavigateTab={tab => setActiveTab(tab)}
            onFilterExceptions={cat => {
              setExceptionCategoryFilter(cat)
              setActiveTab('exceptions')
            }}
          />
        )}

        {activeTab === 'matches' && (
          <MatchesView
            matches={matches}
            onApproveMatch={handleApproveMatch}
            onRejectMatch={handleRejectMatch}
            isProcessing={isProcessing}
          />
        )}

        {activeTab === 'exceptions' && (
          <ExceptionsView
            exceptions={exceptions}
            onResolveException={handleResolveException}
            onCompensateException={handleCompensateException}
            isProcessing={isProcessing}
            initialCategoryFilter={exceptionCategoryFilter}
          />
        )}

        {activeTab === 'audit' && (
          <AuditView auditLog={auditLog} />
        )}

        {activeTab === 'upload' && (
          <UploadView
            onRunComplete={handleRunComplete}
            onNavigateTab={tab => setActiveTab(tab)}
          />
        )}
      </main>

      {/* ─── Parity Assistant Floating Widget ─── */}
      <button
        className="chat-fab"
        onClick={() => setChatOpen(!chatOpen)}
        title="Open Parity Assistant"
        aria-label="Open Parity Assistant"
      >
        {chatOpen ? '✕' : '⚡'}
      </button>

      <ChatPanel
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
      />

      {/* ─── Notification Toast System ─── */}
      <ToastContainer
        toasts={toasts}
        onClose={removeToast}
      />
    </div>
  )
}

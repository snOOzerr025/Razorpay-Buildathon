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
import { AuthView } from './components/AuthView'
import { LandingPage } from './landing/LandingPage'
import { Workstation3DCanvas } from './components/Workstation3DCanvas'

const API_BASE = 'http://localhost:8000/api/v1'
const AUTH_TOKEN = 'dev_token_123'

import Lenis from 'lenis'

export default function App() {
  // Two-Zone View Mode: 'landing' (cinematic DeSo route) vs 'app' (financial workstation)
  const [viewMode, setViewMode] = useState(() => {
    return window.location.hash.includes('app') ? 'app' : 'landing'
  })

  useEffect(() => {
    const handleHash = () => {
      setViewMode(window.location.hash.includes('app') ? 'app' : 'landing')
    }
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  // Smooth Lenis Momentum Scroll
  useEffect(() => {
    if (viewMode !== 'app') return
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
    })

    function raf(time) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    const rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [viewMode])

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('parity_user_session')
      return saved ? JSON.parse(saved) : {
        name: 'Priya Sharma',
        email: 'priya.sharma@razorpay.demo',
        role: 'Lead Finance Controller',
        badge: 'Tier 3 Approval Authority',
        avatar: '👩‍💼',
        org: 'Razorpay Enterprise Ops',
      }
    } catch {
      return null
    }
  })

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

  const handleLoginSuccess = userSession => {
    setCurrentUser(userSession)
    addToast('Authentication Verified', `Welcome back, ${userSession.name} (${userSession.role})`, 'success')
  }

  const handleSignOut = () => {
    localStorage.removeItem('parity_user_session')
    setCurrentUser(null)
    addToast('Session Ended', 'Signed out of reconciliation portal', 'info')
  }

  // Telemetry Fetcher (Syncs with backend if reachable)
  const syncWithBackend = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true)
    try {
      // 1. Healthcheck
      let isHealthy = false
      try {
        const hRes = await fetch('http://localhost:8000/health', { signal: AbortSignal.timeout(2000) })
        if (hRes.ok) {
          setHealthStatus('ok')
          isHealthy = true
        } else {
          setHealthStatus('degraded')
        }
      } catch {
        setHealthStatus('degraded')
      }

      // If in live mode, attempt to load live state
      if (mode === 'live' && isHealthy) {
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

  // ────────── Match Actions (Supports Live Backend + Interactive Benchmark Replay) ──────────
  const handleApproveMatch = async (matchId, note = 'Approved via dashboard') => {
    setIsProcessing(true)
    const reviewerActor = currentUser?.name ? `user:${currentUser.name.toLowerCase().replace(/\s+/g, '_')}` : 'user:auditor_priya'

    try {
      if (mode === 'live' && healthStatus === 'ok') {
        const res = await fetch(`${API_BASE}/matches/${matchId}/approve`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ note, actor: reviewerActor }),
        })
        if (!res.ok) throw new Error(`Server returned ${res.status}`)
      }

      setMatches(prev =>
        prev.map(m => (m.id === matchId ? { ...m, status: 'confirmed' } : m))
      )

      const newAudit = {
        id: Math.max(...auditLog.map(a => Number(a.id) || 0), 100) + 1,
        entity_type: 'match',
        entity_id: matchId,
        action: 'approved',
        actor: reviewerActor,
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
    } catch (err) {
      addToast('Approval Failed', `Could not reach backend: ${err.message}`, 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRejectMatch = async (matchId, note = 'Rejected via dashboard') => {
    setIsProcessing(true)
    const reviewerActor = currentUser?.name ? `user:${currentUser.name.toLowerCase().replace(/\s+/g, '_')}` : 'user:auditor_priya'

    try {
      if (mode === 'live' && healthStatus === 'ok') {
        const res = await fetch(`${API_BASE}/matches/${matchId}/reject`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason: note, actor: reviewerActor }),
        })
        if (!res.ok) throw new Error(`Server returned ${res.status}`)
      }

      setMatches(prev =>
        prev.map(m => (m.id === matchId ? { ...m, status: 'rejected' } : m))
      )

      const newAudit = {
        id: Math.max(...auditLog.map(a => Number(a.id) || 0), 100) + 1,
        entity_type: 'match',
        entity_id: matchId,
        action: 'rejected',
        actor: reviewerActor,
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
    } catch (err) {
      addToast('Rejection Failed', `Could not reach backend: ${err.message}`, 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  // ────────── Exception Actions (Supports Live Backend + Interactive Benchmark Replay) ──────────
  const handleResolveException = async (excId, note = 'Resolved via dashboard') => {
    setIsProcessing(true)
    const reviewerActor = currentUser?.name ? `user:${currentUser.name.toLowerCase().replace(/\s+/g, '_')}` : 'user:auditor_priya'

    try {
      if (mode === 'live' && healthStatus === 'ok') {
        const res = await fetch(`${API_BASE}/exceptions/${excId}/resolve`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ resolution_note: note, actor: reviewerActor }),
        })
        if (!res.ok) throw new Error(`Server returned ${res.status}`)
      }

      setExceptions(prev =>
        prev.map(e => (e.id === excId ? { ...e, status: 'resolved', resolved_at: new Date().toISOString() } : e))
      )

      const newAudit = {
        id: Math.max(...auditLog.map(a => Number(a.id) || 0), 100) + 1,
        entity_type: 'exception',
        entity_id: excId,
        action: 'resolved',
        actor: reviewerActor,
        occurred_at: new Date().toISOString(),
        rationale: {
          action: 'human_resolution',
          tier: 'hitl',
          note,
        },
      }
      setAuditLog(prev => [newAudit, ...prev])

      addToast('Exception Resolved', `Exception ${excId} resolved. Forensics logged.`, 'success')
    } catch (err) {
      addToast('Resolution Failed', err.message, 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCompensateException = async (excId, amount, note = 'Compensating ledger entry') => {
    setIsProcessing(true)
    const reviewerActor = currentUser?.name ? `user:${currentUser.name.toLowerCase().replace(/\s+/g, '_')}` : 'user:auditor_priya'

    try {
      if (mode === 'live' && healthStatus === 'ok') {
        const res = await fetch(`${API_BASE}/exceptions/${excId}/compensate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ amount: Number(amount), note, actor: reviewerActor }),
        })
        if (!res.ok) throw new Error(`Server returned ${res.status}`)
      }

      setExceptions(prev =>
        prev.map(e => (e.id === excId ? { ...e, status: 'resolved', resolved_at: new Date().toISOString() } : e))
      )

      const newAudit = {
        id: Math.max(...auditLog.map(a => Number(a.id) || 0), 100) + 1,
        entity_type: 'compensating_journal',
        entity_id: excId,
        action: 'compensated',
        actor: reviewerActor,
        occurred_at: new Date().toISOString(),
        rationale: {
          action: 'compensating_entry',
          amount: Number(amount),
          rule: 'AGENTS_MD_RULE_2_NON_DESTRUCTIVE_MUTATION',
          note,
        },
      }
      setAuditLog(prev => [newAudit, ...prev])

      addToast('Compensating Entry Committed', `Adjusted ₹${amount} without mutating posted records (Rule 2).`, 'success')
    } catch (err) {
      addToast('Compensate Failed', err.message, 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  // ────────── Keyboard Shortcuts for HITL Review ──────────
  useEffect(() => {
    if (viewMode !== 'app' || activeTab !== 'matches') return

    const handleKeyDown = e => {
      // Don't trigger if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return

      const firstPending = matches.find(m => m.status?.includes('pending'))
      if (!firstPending) return

      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        handleApproveMatch(firstPending.id, 'Approved via keyboard shortcut [A]')
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        handleRejectMatch(firstPending.id, 'Rejected via keyboard shortcut [R]')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewMode, activeTab, matches, mode, healthStatus])

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

  // ─── ROUTE 1: DeSo-Inspired Cinematic Landing Page ───
  if (viewMode === 'landing') {
    return (
      <>
        <LandingPage
          onLaunchApp={() => {
            setViewMode('app')
            window.location.hash = 'app'
          }}
          isLive={mode === 'live' && healthStatus === 'ok'}
          metrics={metrics}
        />
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </>
    )
  }

  // ─── ROUTE 2: Operational Financial Workstation (/app) ───
  if (!currentUser) {
    return (
      <div className="app-container">
        <div style={{ padding: '16px 24px' }}>
          <button
            onClick={() => {
              setViewMode('landing')
              window.location.hash = ''
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-gold, #ffda59)',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
            }}
          >
            ← Back to Cinematic Story
          </button>
        </div>
        <AuthView onLoginSuccess={handleLoginSuccess} />
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </div>
    )
  }

  return (
    <div className="app-container" style={{ position: 'relative', minHeight: '100vh' }}>
      {/* ─── 3D Ambient Financial Ledger Background Mesh ─── */}
      <Workstation3DCanvas />

      {/* ─── Navigation Bar with Cinematic Switcher ─── */}
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
        currentUser={currentUser}
        onSignOut={handleSignOut}
        onBackToLanding={() => {
          setViewMode('landing')
          window.location.hash = ''
        }}
      />

      {/* ─── Active Workstation Tab ─── */}
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

      {/* ─── Trace-Grounded Parity Copilot Floating Widget ─── */}
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

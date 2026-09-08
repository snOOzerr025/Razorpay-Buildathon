'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UploadCloud, FileText, ServerCrash } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN ?? ''

export default function LiveRunPage() {
  const router = useRouter()
  const [gatewayFile, setGatewayFile] = useState<File | null>(null)
  const [bankFile, setBankFile] = useState<File | null>(null)
  const [ledgerFile, setLedgerFile] = useState<File | null>(null)

  const [isProcessing, setIsProcessing] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Cancel any in-flight request on unmount
  useEffect(() => () => abortRef.current?.abort(), [])

  const handleRun = async () => {
    if (!gatewayFile || !bankFile) {
      alert("Please upload Gateway and Bank CSV files.")
      return
    }

    setIsProcessing(true)
    setApiError(null)

    // AbortController cleanup so we don't get an unhandled-rejection when
    // the user navigates away mid-upload (P1-12).
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    try {
      const formData = new FormData()
      formData.append('gateway', gatewayFile)
      formData.append('bank', bankFile)
      if (ledgerFile) {
        formData.append('ledger', ledgerFile)
      }

      const response = await fetch(`${API_BASE}/reconcile/upload`, {
        method: 'POST',
        headers: {
          // The token is injected via build-time env, never hardcoded.
          // In dev, fall back to the same dev token the FastAPI backend uses
          // for the buildathon demo (P1-18).
          ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
        },
        body: formData,
        signal: abortRef.current.signal,
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => null)
        throw new Error(errData?.detail || `API error: ${response.status}`)
      }

      // Engine accepted the upload. router.push keeps us inside the SPA
      // (P1-11) — no full-page reload.
      router.push('/dashboard')
    } catch (err: any) {
      if (err.name === 'AbortError') return
      setApiError(err.message || "Failed to connect to backend.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 flex flex-col gap-8 anim-stagger">

      <div className="rounded-xl p-8"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-elevated)',
        }}>

        <div className="mb-6">
          <h2 className="text-2xl font-light mb-2" style={{ color: 'var(--text-primary)' }}>Run Reconciliation Engine</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Upload your raw Gateway Transactions, Bank Settlement, and Merchant Ledger CSVs below. The engine will ingest, sanitize, and run the 5-pass deterministic and probabilistic matching pipeline.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Gateway File Upload */}
          <label
            className="p-6 flex flex-col items-center justify-center text-center rounded-lg relative transition-colors group cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '2px dashed var(--border)',
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files?.[0]
              if (f) setGatewayFile(f)
            }}
          >
            <input
              type="file"
              accept=".csv,.xlsx"
              className="sr-only"
              onChange={(e) => setGatewayFile(e.target.files?.[0] || null)}
            />
            {gatewayFile ? (
              <>
                <FileText className="w-8 h-8 mb-3" style={{ color: 'var(--accent-primary)' }} />
                <p className="text-sm font-medium break-all px-2" style={{ color: 'var(--text-primary)' }}>{gatewayFile.name}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--success)' }}>Ready</p>
              </>
            ) : (
              <>
                <UploadCloud className="w-8 h-8 mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>Gateway</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Click or drop CSV</p>
              </>
            )}
          </label>

          {/* Bank File Upload */}
          <label
            className="p-6 flex flex-col items-center justify-center text-center rounded-lg relative transition-colors group cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '2px dashed var(--border)',
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files?.[0]
              if (f) setBankFile(f)
            }}
          >
            <input
              type="file"
              accept=".csv,.xlsx"
              className="sr-only"
              onChange={(e) => setBankFile(e.target.files?.[0] || null)}
            />
            {bankFile ? (
              <>
                <FileText className="w-8 h-8 mb-3" style={{ color: 'var(--accent-primary)' }} />
                <p className="text-sm font-medium break-all px-2" style={{ color: 'var(--text-primary)' }}>{bankFile.name}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--success)' }}>Ready</p>
              </>
            ) : (
              <>
                <UploadCloud className="w-8 h-8 mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>Bank</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Click or drop CSV</p>
              </>
            )}
          </label>

          {/* Ledger File Upload */}
          <label
            className="p-6 flex flex-col items-center justify-center text-center rounded-lg relative transition-colors group cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '2px dashed var(--border)',
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files?.[0]
              if (f) setLedgerFile(f)
            }}
          >
            <input
              type="file"
              accept=".csv,.xlsx"
              className="sr-only"
              onChange={(e) => setLedgerFile(e.target.files?.[0] || null)}
            />
            {ledgerFile ? (
              <>
                <FileText className="w-8 h-8 mb-3" style={{ color: 'var(--accent-primary)' }} />
                <p className="text-sm font-medium break-all px-2" style={{ color: 'var(--text-primary)' }}>{ledgerFile.name}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--success)' }}>Ready</p>
              </>
            ) : (
              <>
                <UploadCloud className="w-8 h-8 mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>Ledger</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Click or drop CSV (optional)</p>
              </>
            )}
          </label>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleRun}
            disabled={!gatewayFile || !bankFile || isProcessing}
            className="px-6 py-3 font-medium rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={(!gatewayFile || !bankFile || isProcessing)
              ? { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }
              : { backgroundColor: 'var(--accent-primary)', color: '#fff' }
            }>
            {isProcessing ? 'Processing...' : 'Execute Engine'}
          </button>
        </div>
      </div>

      {apiError && (
        <div className="p-6 rounded-xl flex items-start gap-4 anim-stagger"
          style={{
            backgroundColor: 'var(--danger-soft)',
            border: '1px solid var(--danger)',
          }}>
          <ServerCrash className="w-6 h-6 mt-0.5 flex-shrink-0" style={{ color: 'var(--danger-bright)' }} />
          <div>
            <h3 className="font-medium text-lg mb-1" style={{ color: 'var(--danger-bright)' }}>API Connection Failed</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--danger-bright)', opacity: 0.8 }}>
              {apiError} <br />
              The frontend is operating in disconnected mode. Please start the Python backend and configure the API routes to process live datasets.
            </p>
          </div>
        </div>
      )}

    </div>
  )
}

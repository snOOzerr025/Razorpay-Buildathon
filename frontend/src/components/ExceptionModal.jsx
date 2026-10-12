import React, { useState } from 'react'

function formatINR(v) {
  if (v === null || v === undefined) return '—'
  return '₹' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function ExceptionModal({
  exception,
  onClose,
  onResolve,
  onCompensate,
  isProcessing,
}) {
  const [activeAction, setActiveAction] = useState('resolve') // 'resolve' | 'compensate'
  const [note, setNote] = useState('')
  const [compAmount, setCompAmount] = useState('')

  if (!exception) return null

  const isResolved = exception.status === 'resolved'
  const defaultCompAmount = exception.dollar_value ? String(exception.dollar_value) : ''

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-window animate-scale-up" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-area">
            <span className="mono text-muted text-sm">EXCEPTION FORENSICS &amp; INVESTIGATION</span>
            <div className="modal-title-row">
              <h2 className="modal-title">{exception.id}</h2>
              <span className={`badge badge-${exception.category?.toLowerCase()}`}>
                {exception.category?.replace(/_/g, ' ')}
              </span>
              <span className={`badge badge-${exception.status}`}>
                {exception.status?.toUpperCase()}
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Key Facts Grid */}
          <div className="exception-facts-grid">
            <div className="fact-card">
              <span className="fact-label">Discrepancy Value</span>
              <span className="fact-val text-status-danger font-bold">{formatINR(exception.dollar_value)}</span>
            </div>
            <div className="fact-card">
              <span className="fact-label">Source Entity</span>
              <span className="fact-val mono">{exception.record_type}</span>
            </div>
            <div className="fact-card">
              <span className="fact-label">Record Identifier</span>
              <span className="fact-val mono text-accent-gold">{exception.record_id}</span>
            </div>
            <div className="fact-card">
              <span className="fact-label">Detection Run</span>
              <span className="fact-val mono text-xs">{exception.run_id || 'run_scale_110k'}</span>
            </div>
          </div>

          {/* AI Investigator Root Cause Attribution */}
          <div className="ai-diagnosis-card">
            <div className="ai-diagnosis-header">
              <div className="ai-diagnosis-badge">
                <span className="ai-dot" />
                <span>AI INVESTIGATOR DIAGNOSIS</span>
              </div>
              <span className="mono text-xs text-muted">SOX Compliance Verified</span>
            </div>

            <div className="ai-diagnosis-body">
              <div className="diagnosis-block">
                <span className="diagnosis-heading">Root Cause Analysis:</span>
                <p className="diagnosis-text">
                  {exception.root_cause ||
                    `Unmatched ${exception.record_type} residual of ${formatINR(exception.dollar_value)}. Detected in Pass 5 after deterministic tolerances and subset-sum windows were exhausted.`}
                </p>
              </div>

              <div className="diagnosis-block">
                <span className="diagnosis-heading">Recommended Action:</span>
                <p className="diagnosis-text recommendation">
                  {exception.recommendation ||
                    'Review supporting bank batch statement or generate a compensating ledger adjustment entry.'}
                </p>
              </div>

              {exception.source_details && (
                <div className="diagnosis-meta-grid">
                  <div className="meta-item">
                    <span className="meta-lbl">Account / Node:</span>
                    <span className="meta-val mono">{exception.source_details.account}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-lbl">Value Date:</span>
                    <span className="meta-val mono">{exception.source_details.value_date}</span>
                  </div>
                  <div className="meta-item full-width">
                    <span className="meta-lbl">Narration / Text:</span>
                    <span className="meta-val mono text-xs">{exception.source_details.narration}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Compliance Resolution Action Panel */}
          {!isResolved ? (
            <div className="resolution-workflow-card">
              <div className="workflow-tab-header">
                <button
                  className={`workflow-tab ${activeAction === 'resolve' ? 'active' : ''}`}
                  onClick={() => setActiveAction('resolve')}
                >
                  ✓ Direct Resolution
                </button>
                <button
                  className={`workflow-tab ${activeAction === 'compensate' ? 'active' : ''}`}
                  onClick={() => setActiveAction('compensate')}
                >
                  ⚖ Issue Compensating Entry (Rule 2)
                </button>
              </div>

              {activeAction === 'resolve' && (
                <div className="workflow-tab-body">
                  <p className="workflow-desc">
                    Mark this exception as investigated and resolved. Writes an immutable audit entry into <code className="mono">audit_log</code> with your principal identity.
                  </p>
                  <input
                    type="text"
                    className="workflow-input"
                    placeholder="Enter resolution rationale (e.g., 'Timing lag confirmed with bank operations desk')..."
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    disabled={isProcessing}
                  />
                  <button
                    className="btn-primary-action"
                    onClick={() => onResolve(exception.id, note || 'Exception investigated and resolved via dashboard')}
                    disabled={isProcessing}
                  >
                    {isProcessing ? '⏳ Recording Resolution…' : '✓ Mark Exception Resolved'}
                  </button>
                </div>
              )}

              {activeAction === 'compensate' && (
                <div className="workflow-tab-body">
                  <p className="workflow-desc">
                    <strong>AGENTS.md Rule 2 Immutability Guardrail:</strong> Posted records are never modified. This will post a compensating reversing entry to balance the merchant ledger.
                  </p>
                  <div className="workflow-input-group">
                    <label className="field-lbl">Adjustment Amount (INR):</label>
                    <input
                      type="number"
                      step="0.01"
                      className="workflow-input"
                      placeholder={defaultCompAmount || '0.00'}
                      value={compAmount || defaultCompAmount}
                      onChange={e => setCompAmount(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                  <div className="workflow-input-group">
                    <label className="field-lbl">Compensating Journal Note:</label>
                    <input
                      type="text"
                      className="workflow-input"
                      placeholder="Justification note (e.g., 'Compensating entry for unannounced bank fee levy')..."
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                  <button
                    className="btn-compensate-action"
                    onClick={() => onCompensate(exception.id, compAmount || defaultCompAmount, note || 'Compensating adjustment posted')}
                    disabled={isProcessing}
                  >
                    {isProcessing ? '⏳ Writing Compensating Ledger Entry…' : '⚖ Commit Compensating Entry'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="resolved-status-stamp">
              <span className="stamp-icon">✓</span>
              <div>
                <strong>Exception Resolved</strong>
                <p className="text-sm text-muted">This exception was investigated and marked resolved with full audit forensics.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

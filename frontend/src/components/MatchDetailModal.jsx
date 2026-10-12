import React, { useState } from 'react'

function formatINR(v) {
  if (v === null || v === undefined) return '—'
  return '₹' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function passLabel(p) {
  const m = {
    pass1_exact: 'Pass 1: Exact Match',
    pass2_tolerance: 'Pass 2: Tolerance & Fee',
    pass3_refund: 'Pass 3: Refund Linkage',
    pass4_split: 'Pass 4: Split / Roll-up',
    fellegi_sunter: 'Pass 5: Fellegi-Sunter AI',
    semantic_embedding: 'Pass 5: Semantic Embedding',
  }
  return m[p] || p
}

export function MatchDetailModal({
  match,
  onClose,
  onApprove,
  onReject,
  isProcessing,
}) {
  const [note, setNote] = useState('')
  if (!match) return null

  const isPending = match.status?.includes('pending')
  const mth = match.math || {
    gross: match.gateway?.gross_amount || 0,
    mdr: (match.gateway?.gross_amount || 0) * (match.gateway?.mdr_fee_pct || 0.02),
    gst: (match.gateway?.gross_amount || 0) * (match.gateway?.mdr_fee_pct || 0.02) * 0.18,
    tds: match.gateway?.tds_amount || 0,
    expected_net: match.bank?.net_amount || 0,
    bank_net: match.bank?.net_amount || 0,
    delta: 0,
  }

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-window animate-scale-up" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-area">
            <span className="mono text-muted text-sm">MATCH IDENTIFIER</span>
            <div className="modal-title-row">
              <h2 className="modal-title">{match.id}</h2>
              <span className={`badge badge-${match.tier}`}>{match.tier?.toUpperCase()}</span>
              <span className={`badge badge-${match.match_pass}`}>{passLabel(match.match_pass)}</span>
              <span className={`badge badge-${match.status}`}>{match.status?.replace(/_/g, ' ')}</span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Three-Way Comparison Columns */}
          <div className="three-way-grid">
            {/* Column 1: Gateway */}
            <div className="three-way-col col-gateway">
              <div className="col-header">
                <span className="col-icon">💳</span>
                <div>
                  <h3 className="col-title">Gateway Transaction</h3>
                  <span className="col-subtitle">{match.gateway?.processor_id || 'Razorpay Gateway'}</span>
                </div>
              </div>
              <div className="col-fields">
                <div className="col-field">
                  <span className="field-lbl">Gross Captured:</span>
                  <span className="field-val highlight-val">{formatINR(match.gateway?.gross_amount)}</span>
                </div>
                <div className="col-field">
                  <span className="field-lbl">Order ID:</span>
                  <span className="field-val mono">{match.gateway?.order_id || '—'}</span>
                </div>
                <div className="col-field">
                  <span className="field-lbl">Gateway Tx ID:</span>
                  <span className="field-val mono">{match.gateway?.id || '—'}</span>
                </div>
                <div className="col-field">
                  <span className="field-lbl">Payment Mode:</span>
                  <span className="field-val">{match.gateway?.payment_method || 'UPI'}</span>
                </div>
                <div className="col-field">
                  <span className="field-lbl">Captured At:</span>
                  <span className="field-val mono text-xs">{match.gateway?.captured_at || match.created_at}</span>
                </div>
              </div>
            </div>

            {/* Column 2: Bank Settlement */}
            <div className="three-way-col col-bank">
              <div className="col-header">
                <span className="col-icon">🏦</span>
                <div>
                  <h3 className="col-title">Bank Settlement</h3>
                  <span className="col-subtitle">{match.bank?.account_number || 'Nodal Settlement'}</span>
                </div>
              </div>
              <div className="col-fields">
                <div className="col-field">
                  <span className="field-lbl">Net Credit Amount:</span>
                  <span className="field-val highlight-val text-status-success">{formatINR(match.bank?.net_amount)}</span>
                </div>
                <div className="col-field">
                  <span className="field-lbl">Bank UTR / Ref:</span>
                  <span className="field-val mono">{match.bank?.utr || '—'}</span>
                </div>
                <div className="col-field">
                  <span className="field-lbl">Settlement Batch:</span>
                  <span className="field-val mono">{match.bank?.batch_id || '—'}</span>
                </div>
                <div className="col-field">
                  <span className="field-lbl">Value Date:</span>
                  <span className="field-val mono">{match.bank?.settlement_date || '—'}</span>
                </div>
                <div className="col-field">
                  <span className="field-lbl">Discrepancy:</span>
                  <span className={`field-val ${mth.delta === 0 ? 'text-status-success' : 'text-status-danger'}`}>
                    {mth.delta === 0 ? '₹0.00 (Zero Delta ✓)' : formatINR(mth.delta)}
                  </span>
                </div>
              </div>
            </div>

            {/* Column 3: Merchant Ledger */}
            <div className="three-way-col col-ledger">
              <div className="col-header">
                <span className="col-icon">📖</span>
                <div>
                  <h3 className="col-title">Merchant Ledger</h3>
                  <span className="col-subtitle">{match.ledger?.account_code || '1100-REVENUE'}</span>
                </div>
              </div>
              <div className="col-fields">
                <div className="col-field">
                  <span className="field-lbl">Expected Revenue:</span>
                  <span className="field-val highlight-val text-accent-blue">{formatINR(match.ledger?.expected_amount || mth.expected_net)}</span>
                </div>
                <div className="col-field">
                  <span className="field-lbl">Journal Entry:</span>
                  <span className="field-val mono">{match.ledger?.entry_id || '—'}</span>
                </div>
                <div className="col-field">
                  <span className="field-lbl">Account Code:</span>
                  <span className="field-val mono">{match.ledger?.account_code || '1100'}</span>
                </div>
                <div className="col-field">
                  <span className="field-lbl">Posted Date:</span>
                  <span className="field-val mono">{match.ledger?.posted_date || '—'}</span>
                </div>
                <div className="col-field">
                  <span className="field-lbl">Post Status:</span>
                  <span className="field-val">{isPending ? 'Pending Signoff' : 'Posted & Reconciled'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mathematical Settlement Formula Inspection */}
          <div className="math-breakdown-card">
            <div className="math-header">
              <span className="math-badge">STRICT DETERMINISTIC MONEY MATH</span>
              <span className="math-formula-tag">Gross - MDR - (MDR × GST 18%) - TDS = Expected Net</span>
            </div>
            <div className="math-formula-grid">
              <div className="math-step">
                <span className="step-label">1. Gross Amount</span>
                <span className="step-val">{formatINR(mth.gross)}</span>
              </div>
              <span className="math-operator">−</span>
              <div className="math-step">
                <span className="step-label">2. MDR Fee</span>
                <span className="step-val text-status-danger">{formatINR(mth.mdr)}</span>
              </div>
              <span className="math-operator">−</span>
              <div className="math-step">
                <span className="step-label">3. GST on MDR (18%)</span>
                <span className="step-val text-status-danger">{formatINR(mth.gst)}</span>
              </div>
              <span className="math-operator">−</span>
              <div className="math-step">
                <span className="step-label">4. TDS Deducted</span>
                <span className="step-val text-status-danger">{formatINR(mth.tds)}</span>
              </div>
              <span className="math-operator">=</span>
              <div className="math-step highlight-step">
                <span className="step-label">Expected Net</span>
                <span className="step-val text-status-success">{formatINR(mth.expected_net)}</span>
              </div>
            </div>
          </div>

          {/* Forensic Engine Explanation */}
          <div className="rationale-card">
            <h4 className="rationale-title">Engine Forensic Audit Trail</h4>
            <p className="rationale-text">{match.rationale || 'Match derived through deterministic 5-pass engine verification.'}</p>
            {match.confidence_score !== null && match.confidence_score !== undefined && (
              <div className="rationale-score-bar">
                <span>Confidence Score: <strong>{(match.confidence_score * 100).toFixed(1)}%</strong></span>
                <div className="score-track">
                  <div className="score-fill" style={{ width: `${match.confidence_score * 100}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Human Review Controls */}
          {isPending && (
            <div className="audit-action-panel">
              <h4 className="action-panel-title">Human-In-The-Loop Governance Signoff</h4>
              <p className="action-panel-sub">
                Under SOX Rule 2 compliance, approving this match will record an immutable audit entry and commit the entry to the merchant ledger.
              </p>
              <div className="action-input-row">
                <input
                  type="text"
                  className="auditor-note-input"
                  placeholder="Enter auditor verification note (e.g., 'Bank physical advice verified')..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  disabled={isProcessing}
                />
              </div>
              <div className="action-buttons-row">
                <button
                  className="btn-reject"
                  onClick={() => onReject(match.id, note)}
                  disabled={isProcessing}
                >
                  ✕ Reject &amp; Escalate
                </button>
                <button
                  className="btn-approve-large"
                  onClick={() => onApprove(match.id, note)}
                  disabled={isProcessing}
                >
                  {isProcessing ? '⏳ Recording Audit Entry…' : '✓ Sign & Approve Match'}
                </button>
              </div>
            </div>
          )}

          {!isPending && (
            <div className="confirmed-stamp">
              <span className="stamp-icon">✓</span>
              <span>This match is confirmed, reconciled, and posted to the ledger under immutable audit record.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

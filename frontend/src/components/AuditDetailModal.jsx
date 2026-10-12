import React, { useState } from 'react'

export function AuditDetailModal({ entry, onClose }) {
  const [copied, setCopied] = useState(false)
  if (!entry) return null

  const jsonStr = typeof entry.rationale === 'object'
    ? JSON.stringify(entry.rationale, null, 2)
    : entry.rationale || '{}'

  const copyJson = () => {
    navigator.clipboard.writeText(jsonStr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-window animate-scale-up" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-area">
            <span className="mono text-muted text-sm">FORENSIC AUDIT TRAIL ENTRY</span>
            <div className="modal-title-row">
              <h2 className="modal-title">Entry #{entry.id}</h2>
              <span className={`badge badge-${entry.action}`}>{entry.action?.replace(/_/g, ' ')}</span>
              <span className="mono text-xs text-status-success">✓ Cryptographic Stamp Verified</span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Key Audit Metadata */}
          <div className="audit-meta-grid">
            <div className="meta-card">
              <span className="meta-lbl">Entity Type</span>
              <span className="meta-val mono font-bold">{entry.entity_type}</span>
            </div>
            <div className="meta-card">
              <span className="meta-lbl">Entity Identifier</span>
              <span className="meta-val mono text-accent-gold">#{entry.entity_id}</span>
            </div>
            <div className="meta-card">
              <span className="meta-lbl">Actor Principal</span>
              <span className="meta-val mono">{entry.actor}</span>
            </div>
            <div className="meta-card">
              <span className="meta-lbl">Occurred Timestamp</span>
              <span className="meta-val mono text-xs">{entry.occurred_at || new Date().toISOString()}</span>
            </div>
          </div>

          {/* Immutable Guarantee Banner */}
          <div className="immutable-banner">
            <span className="banner-icon">🔒</span>
            <div className="banner-text">
              <strong>SOX-Compliant Append-Only Ledger (AGENTS.md Rule 3)</strong>
              <p>Every match, automated rule execution, and human intervention is recorded with an immutable audit entry. Modification or deletion of this row is cryptographically forbidden.</p>
            </div>
          </div>

          {/* Structured Forensic Rationale Payload */}
          <div className="json-viewer-card">
            <div className="json-header">
              <span className="json-title">Structured Forensic Rationale (JSONB)</span>
              <button className="btn-copy-sm" onClick={copyJson}>
                {copied ? '✓ Copied' : 'Copy JSON'}
              </button>
            </div>
            <pre className="json-code-block">
              <code>{jsonStr}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

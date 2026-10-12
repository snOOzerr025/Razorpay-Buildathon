import React, { useState, useMemo } from 'react'
import { AuditDetailModal } from './AuditDetailModal'

export function AuditView({ auditLog }) {
  const [actionFilter, setActionFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedEntry, setSelectedEntry] = useState(null)

  const filteredLog = useMemo(() => {
    return auditLog.filter(e => {
      if (actionFilter !== 'all') {
        if (actionFilter === 'auto_matched' && e.action !== 'auto_matched') return false
        if (actionFilter === 'approved' && e.action !== 'approved') return false
        if (actionFilter === 'rejected' && e.action !== 'rejected') return false
        if (actionFilter === 'compensated' && e.action !== 'compensated') return false
        if (actionFilter === 'exception' && !e.action?.includes('exception')) return false
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        const id = String(e.id).toLowerCase()
        const actor = String(e.actor || '').toLowerCase()
        const entity = String(e.entity_type || '').toLowerCase()
        const entityId = String(e.entity_id || '').toLowerCase()
        const action = String(e.action || '').toLowerCase()
        if (!id.includes(q) && !actor.includes(q) && !entity.includes(q) && !entityId.includes(q) && !action.includes(q)) {
          return false
        }
      }
      return true
    })
  }, [auditLog, actionFilter, search])

  return (
    <div className="audit-view-container animate-in">
      {/* Header */}
      <div className="view-header">
        <div>
          <span className="section-badge">IMMUTABLE FORENSIC REGISTER</span>
          <h1 className="view-title">Audit Trail &amp; SOX Forensics</h1>
          <p className="view-subtitle">
            Cryptographically sealed, append-only ledger of every automated pass match, human approval, and compensating entry.
          </p>
        </div>
        <div className="view-stats-pill">
          <span className="stat-pill-item text-status-success">
            <strong>{auditLog.length}</strong> Audit Entries
          </span>
          <span className="stat-pill-divider">•</span>
          <span className="stat-pill-item text-accent-blue">
            SHA-256 Ledger Verified ✓
          </span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="filters-toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search by Entry ID, Actor Principal, or Entity..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear-btn" onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        <div className="filter-chips">
          <button
            className={`filter-chip ${actionFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActionFilter('all')}
          >
            All Actions ({auditLog.length})
          </button>
          <button
            className={`filter-chip ${actionFilter === 'auto_matched' ? 'active' : ''}`}
            onClick={() => setActionFilter('auto_matched')}
          >
            Auto Matched
          </button>
          <button
            className={`filter-chip ${actionFilter === 'approved' ? 'active' : ''}`}
            onClick={() => setActionFilter('approved')}
          >
            Human Approved
          </button>
          <button
            className={`filter-chip ${actionFilter === 'compensated' ? 'active' : ''}`}
            onClick={() => setActionFilter('compensated')}
          >
            Compensating Entries
          </button>
          <button
            className={`filter-chip ${actionFilter === 'exception' ? 'active' : ''}`}
            onClick={() => setActionFilter('exception')}
          >
            Exceptions
          </button>
        </div>
      </div>

      {/* Audit Table */}
      <div className="table-card">
        {filteredLog.length === 0 ? (
          <div className="empty-state-box">
            <span className="empty-state-icon">📜</span>
            <div className="empty-state-title">No audit records match your query</div>
            <p className="empty-state-sub">Try searching for a different actor or resetting filters.</p>
            <button className="btn-secondary-sm" onClick={() => { setSearch(''); setActionFilter('all') }}>
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table" aria-label="Forensic Audit Log Table">
              <thead>
                <tr>
                  <th>Audit ID</th>
                  <th>Target Entity</th>
                  <th>Action Recorded</th>
                  <th>Actor Principal</th>
                  <th>Timestamp (UTC)</th>
                  <th style={{ textAlign: 'right' }}>Forensics</th>
                </tr>
              </thead>
              <tbody>
                {filteredLog.map(e => (
                  <tr
                    key={e.id}
                    className="table-row-hover"
                    onClick={() => setSelectedEntry(e)}
                  >
                    <td>
                      <span className="mono font-bold text-accent-gold">#{e.id}</span>
                    </td>

                    <td>
                      <div className="entity-cell">
                        <span className="mono text-xs text-muted">{e.entity_type}</span>
                        <span className="mono font-semibold text-sm">#{e.entity_id}</span>
                      </div>
                    </td>

                    <td>
                      <span className={`badge badge-${e.action}`}>
                        {e.action?.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td>
                      <span className="mono text-xs">{e.actor}</span>
                    </td>

                    <td>
                      <span className="mono text-xs text-muted">
                        {e.occurred_at ? new Date(e.occurred_at).toLocaleString('en-IN') : '—'}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn-inspect"
                        onClick={evt => { evt.stopPropagation(); setSelectedEntry(e) }}
                      >
                        Inspect Payload ↗
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Detail Modal */}
      {selectedEntry && (
        <AuditDetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  )
}

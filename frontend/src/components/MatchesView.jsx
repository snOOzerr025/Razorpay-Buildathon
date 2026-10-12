import React, { useState, useMemo } from 'react'
import { MatchDetailModal } from './MatchDetailModal'

function passLabel(p) {
  const m = {
    pass1_exact: 'Pass 1 Exact',
    pass2_tolerance: 'Pass 2 Tolerance',
    pass3_refund: 'Pass 3 Refund',
    pass4_split: 'Pass 4 Split',
    fellegi_sunter: 'Pass 5 Fellegi-Sunter',
    semantic_embedding: 'Pass 5 Semantic AI',
  }
  return m[p] || p
}

function formatINR(v) {
  if (v === null || v === undefined) return '—'
  return '₹' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function MatchesView({
  matches,
  onApproveMatch,
  onRejectMatch,
  isProcessing,
}) {
  const [search, setSearch] = useState('')
  const [passFilter, setPassFilter] = useState('all')
  const [tierFilter, setTierFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedMatch, setSelectedMatch] = useState(null)

  // Filtered matches
  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      if (passFilter !== 'all' && m.match_pass !== passFilter) return false
      if (tierFilter !== 'all' && m.tier !== tierFilter) return false
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending' && !m.status?.includes('pending')) return false
        if (statusFilter === 'confirmed' && m.status !== 'confirmed') return false
        if (statusFilter === 'rejected' && m.status !== 'rejected') return false
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchId = String(m.id).toLowerCase()
        const orderId = String(m.gateway?.order_id || '').toLowerCase()
        const utr = String(m.bank?.utr || '').toLowerCase()
        const pass = String(m.match_pass || '').toLowerCase()
        if (!matchId.includes(q) && !orderId.includes(q) && !utr.includes(q) && !pass.includes(q)) {
          return false
        }
      }
      return true
    })
  }, [matches, passFilter, tierFilter, statusFilter, search])

  const pendingCount = matches.filter(m => m.status?.includes('pending')).length
  const confirmedCount = matches.filter(m => m.status === 'confirmed').length

  return (
    <div className="matches-view-container animate-in">
      {/* Header */}
      <div className="view-header">
        <div>
          <span className="section-badge">GOVERNANCE REVIEW QUEUE</span>
          <h1 className="view-title">Reconciliation Matches</h1>
          <p className="view-subtitle">
            Inspect three-way bindings between Gateway Captures, Bank Settlements, and Merchant Ledger Entries.
          </p>
        </div>
        <div className="view-stats-pill">
          <span className="stat-pill-item text-status-success">
            <strong>{confirmedCount}</strong> Confirmed
          </span>
          <span className="stat-pill-divider">•</span>
          <span className="stat-pill-item text-accent-gold">
            <strong>{pendingCount}</strong> Pending Signoff
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filters-toolbar">
        {/* Search */}
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search by Match ID, Order ID, UTR, or Pass..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear-btn" onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        {/* Status Chips */}
        <div className="filter-chips">
          <button
            className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({matches.length})
          </button>
          <button
            className={`filter-chip ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            Pending Review ({pendingCount})
          </button>
          <button
            className={`filter-chip ${statusFilter === 'confirmed' ? 'active' : ''}`}
            onClick={() => setStatusFilter('confirmed')}
          >
            Confirmed ({confirmedCount})
          </button>
        </div>

        {/* Dropdowns */}
        <div className="filter-selects">
          <select
            className="filter-select"
            value={passFilter}
            onChange={e => setPassFilter(e.target.value)}
            aria-label="Filter by Pass"
          >
            <option value="all">All Passes</option>
            <option value="pass1_exact">Pass 1: Exact</option>
            <option value="pass2_tolerance">Pass 2: Tolerance &amp; Fee</option>
            <option value="pass3_refund">Pass 3: Refund Linkage</option>
            <option value="pass4_split">Pass 4: Split / Roll-up</option>
            <option value="fellegi_sunter">Pass 5: Fellegi-Sunter AI</option>
            <option value="semantic_embedding">Pass 5: Semantic AI</option>
          </select>

          <select
            className="filter-select"
            value={tierFilter}
            onChange={e => setTierFilter(e.target.value)}
            aria-label="Filter by Risk Tier"
          >
            <option value="all">All Risk Tiers</option>
            <option value="hootl">HOOTL (Tier 1 Auto)</option>
            <option value="hotl">HOTL (Tier 2 Monitored)</option>
            <option value="hitl">HITL (Tier 3 Human)</option>
          </select>
        </div>
      </div>

      {/* Matches Table */}
      <div className="table-card">
        {filteredMatches.length === 0 ? (
          <div className="empty-state-box">
            <span className="empty-state-icon">🔍</span>
            <div className="empty-state-title">No matching records found</div>
            <p className="empty-state-sub">Try broadening your search term or clearing the active filters.</p>
            <button
              className="btn-secondary-sm"
              onClick={() => { setSearch(''); setPassFilter('all'); setTierFilter('all'); setStatusFilter('all') }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table" aria-label="Reconciliation Matches Table">
              <thead>
                <tr>
                  <th>Match ID</th>
                  <th>Pass Rule</th>
                  <th>Risk Tier</th>
                  <th>Settled Value</th>
                  <th>Status</th>
                  <th>Confidence Score</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMatches.map(m => {
                  const isPending = m.status?.includes('pending')
                  const confPct = m.confidence_score ? (m.confidence_score * 100).toFixed(0) : null
                  const settledVal = m.bank?.net_amount || m.gateway?.gross_amount

                  return (
                    <tr
                      key={m.id}
                      className={`table-row-hover ${isPending ? 'row-pending' : ''}`}
                      onClick={() => setSelectedMatch(m)}
                    >
                      <td>
                        <div className="id-col">
                          <span className="mono font-bold text-accent-gold">{m.id}</span>
                          {m.gateway?.order_id && (
                            <span className="text-xs text-muted mono">{m.gateway.order_id}</span>
                          )}
                        </div>
                      </td>

                      <td>
                        <span className={`badge badge-${m.match_pass}`}>
                          {passLabel(m.match_pass)}
                        </span>
                      </td>

                      <td>
                        <span className={`badge badge-${m.tier}`}>
                          {m.tier?.toUpperCase()}
                        </span>
                      </td>

                      <td>
                        <span className="mono font-semibold">
                          {settledVal ? formatINR(settledVal) : '—'}
                        </span>
                      </td>

                      <td>
                        <span className={`badge badge-${m.status}`}>
                          {m.status?.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td>
                        {confPct ? (
                          <div className="confidence-meter-sm">
                            <div className="conf-bar-track">
                              <div
                                className={`conf-bar-fill ${Number(confPct) >= 80 ? 'fill-high' : 'fill-med'}`}
                                style={{ width: `${confPct}%` }}
                              />
                            </div>
                            <span className="conf-text">{confPct}%</span>
                          </div>
                        ) : (
                          <span className="mono text-xs text-muted">DETERMINISTIC 100%</span>
                        )}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div className="actions-cell" onClick={e => e.stopPropagation()}>
                          <button
                            className="btn-inspect"
                            onClick={() => setSelectedMatch(m)}
                            title="Inspect three-way comparison details"
                          >
                            Inspect ↗
                          </button>
                          {isPending && (
                            <button
                              className="btn-quick-approve"
                              onClick={() => onApproveMatch(m.id, 'One-click approved via review queue')}
                              disabled={isProcessing}
                              title="Sign and approve match"
                            >
                              Approve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Match Detail Modal */}
      {selectedMatch && (
        <MatchDetailModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          onApprove={(id, note) => {
            onApproveMatch(id, note)
            setSelectedMatch(null)
          }}
          onReject={(id, note) => {
            onRejectMatch(id, note)
            setSelectedMatch(null)
          }}
          isProcessing={isProcessing}
        />
      )}
    </div>
  )
}

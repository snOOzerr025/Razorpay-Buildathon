import React, { useState, useMemo } from 'react'
import { ExceptionModal } from './ExceptionModal'

function formatINR(v) {
  if (v === null || v === undefined) return '—'
  return '₹' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function ExceptionsView({
  exceptions,
  onResolveException,
  onCompensateException,
  isProcessing,
  initialCategoryFilter,
}) {
  const [categoryFilter, setCategoryFilter] = useState(initialCategoryFilter || 'all')
  const [statusFilter, setStatusFilter] = useState('open')
  const [search, setSearch] = useState('')
  const [selectedException, setSelectedException] = useState(null)

  // Filtered exceptions
  const filteredExceptions = useMemo(() => {
    return exceptions.filter(e => {
      if (categoryFilter !== 'all' && e.category?.toLowerCase() !== categoryFilter.toLowerCase()) return false
      if (statusFilter !== 'all' && e.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const id = String(e.id).toLowerCase()
        const recId = String(e.record_id || '').toLowerCase()
        const cat = String(e.category || '').toLowerCase()
        const val = String(e.dollar_value || '').toLowerCase()
        if (!id.includes(q) && !recId.includes(q) && !cat.includes(q) && !val.includes(q)) return false
      }
      return true
    })
  }, [exceptions, categoryFilter, statusFilter, search])

  // Category counts and totals
  const stats = useMemo(() => {
    const summary = {
      timing: { count: 0, val: 0 },
      bank: { count: 0, val: 0 },
      unresolved: { count: 0, val: 0 },
      error: { count: 0, val: 0 },
    }
    exceptions.forEach(e => {
      const v = Number(e.dollar_value) || 0
      const c = e.category
      if (c === 'TIMING_DIFFERENCE') { summary.timing.count++; summary.timing.val += v }
      else if (c === 'BANK_INITIATED') { summary.bank.count++; summary.bank.val += v }
      else if (c === 'UNRESOLVED') { summary.unresolved.count++; summary.unresolved.val += v }
      else if (c === 'TRANSACTION_ERROR') { summary.error.count++; summary.error.val += v }
    })
    return summary
  }, [exceptions])

  const openCount = exceptions.filter(e => e.status === 'open').length
  const totalOpenVal = exceptions
    .filter(e => e.status === 'open')
    .reduce((sum, e) => sum + (Number(e.dollar_value) || 0), 0)

  return (
    <div className="exceptions-view-container animate-in">
      {/* Header */}
      <div className="view-header">
        <div>
          <span className="section-badge">FORENSIC AUDIT QUEUE</span>
          <h1 className="view-title">Honest Exception Queue</h1>
          <p className="view-subtitle">
            Unresolved residual items staged with root-cause attribution. Zero automated guessing on financial records.
          </p>
        </div>
        <div className="view-stats-pill">
          <span className="stat-pill-item text-status-danger">
            <strong>{openCount}</strong> Open Discrepancies
          </span>
          <span className="stat-pill-divider">•</span>
          <span className="stat-pill-item text-accent-gold">
            Total Open: <strong>{formatINR(totalOpenVal)}</strong>
          </span>
        </div>
      </div>

      {/* Category Summary Cards */}
      <div className="category-kpi-grid">
        <div
          className={`cat-kpi-card ${categoryFilter === 'TIMING_DIFFERENCE' ? 'selected' : ''}`}
          onClick={() => setCategoryFilter(categoryFilter === 'TIMING_DIFFERENCE' ? 'all' : 'TIMING_DIFFERENCE')}
        >
          <div className="cat-kpi-top">
            <span className="cat-dot dot-timing" />
            <span className="cat-kpi-title">Timing Difference</span>
          </div>
          <div className="cat-kpi-val">{stats.timing.count.toLocaleString()}</div>
          <div className="cat-kpi-sub">{formatINR(stats.timing.val)} (T+2/T+3 Lag)</div>
        </div>

        <div
          className={`cat-kpi-card ${categoryFilter === 'BANK_INITIATED' ? 'selected' : ''}`}
          onClick={() => setCategoryFilter(categoryFilter === 'BANK_INITIATED' ? 'all' : 'BANK_INITIATED')}
        >
          <div className="cat-kpi-top">
            <span className="cat-dot dot-bank" />
            <span className="cat-kpi-title">Bank Initiated</span>
          </div>
          <div className="cat-kpi-val">{stats.bank.count.toLocaleString()}</div>
          <div className="cat-kpi-sub">{formatINR(stats.bank.val)} (Direct Debits)</div>
        </div>

        <div
          className={`cat-kpi-card ${categoryFilter === 'UNRESOLVED' ? 'selected' : ''}`}
          onClick={() => setCategoryFilter(categoryFilter === 'UNRESOLVED' ? 'all' : 'UNRESOLVED')}
        >
          <div className="cat-kpi-top">
            <span className="cat-dot dot-unresolved" />
            <span className="cat-kpi-title">Unresolved Residuals</span>
          </div>
          <div className="cat-kpi-val">{stats.unresolved.count.toLocaleString()}</div>
          <div className="cat-kpi-sub">{formatINR(stats.unresolved.val)} (Semantic/UTR)</div>
        </div>

        <div
          className={`cat-kpi-card ${categoryFilter === 'TRANSACTION_ERROR' ? 'selected' : ''}`}
          onClick={() => setCategoryFilter(categoryFilter === 'TRANSACTION_ERROR' ? 'all' : 'TRANSACTION_ERROR')}
        >
          <div className="cat-kpi-top">
            <span className="cat-dot dot-error" />
            <span className="cat-kpi-title">Transaction Error</span>
          </div>
          <div className="cat-kpi-val">{stats.error.count.toLocaleString()}</div>
          <div className="cat-kpi-sub">{formatINR(stats.error.val)} (Duplicates/Skew)</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="filters-toolbar">
        {/* Search */}
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search by Exception ID, Record ID, or Amount..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear-btn" onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        {/* Status Filter */}
        <div className="filter-chips">
          <button
            className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Items ({exceptions.length})
          </button>
          <button
            className={`filter-chip ${statusFilter === 'open' ? 'active' : ''}`}
            onClick={() => setStatusFilter('open')}
          >
            Open Queue ({openCount})
          </button>
          <button
            className={`filter-chip ${statusFilter === 'resolved' ? 'active' : ''}`}
            onClick={() => setStatusFilter('resolved')}
          >
            Resolved ({exceptions.length - openCount})
          </button>
        </div>

        {/* Category Select */}
        <div className="filter-selects">
          <select
            className="filter-select"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            aria-label="Filter by Exception Category"
          >
            <option value="all">All Categories</option>
            <option value="TIMING_DIFFERENCE">Timing Difference</option>
            <option value="BANK_INITIATED">Bank Initiated</option>
            <option value="UNRESOLVED">Unresolved Residuals</option>
            <option value="TRANSACTION_ERROR">Transaction Error</option>
          </select>
        </div>
      </div>

      {/* Exceptions Table */}
      <div className="table-card">
        {filteredExceptions.length === 0 ? (
          <div className="empty-state-box">
            <span className="empty-state-icon">✓</span>
            <div className="empty-state-title">No matching exceptions found</div>
            <p className="empty-state-sub">Zero discrepancies meet the current filter criteria.</p>
            <button
              className="btn-secondary-sm"
              onClick={() => { setSearch(''); setCategoryFilter('all'); setStatusFilter('all') }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table" aria-label="Exception Queue Table">
              <thead>
                <tr>
                  <th>Exception ID</th>
                  <th>Category</th>
                  <th>Source Entity</th>
                  <th>Record Ref</th>
                  <th>Discrepancy Value</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExceptions.map(e => {
                  const isOp = e.status === 'open'
                  return (
                    <tr
                      key={e.id}
                      className={`table-row-hover ${isOp ? 'row-pending' : ''}`}
                      onClick={() => setSelectedException(e)}
                    >
                      <td>
                        <span className="mono font-bold text-accent-gold">{e.id}</span>
                      </td>

                      <td>
                        <span className={`badge badge-${e.category?.toLowerCase()}`}>
                          {e.category?.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td>
                        <span className="mono text-xs text-muted">{e.record_type}</span>
                      </td>

                      <td>
                        <span className="mono text-sm">{e.record_id}</span>
                      </td>

                      <td>
                        <span className="mono font-bold text-status-danger">
                          {formatINR(e.dollar_value)}
                        </span>
                      </td>

                      <td>
                        <span className={`badge badge-${e.status}`}>
                          {e.status?.toUpperCase()}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div className="actions-cell" onClick={evt => evt.stopPropagation()}>
                          <button
                            className="btn-inspect"
                            onClick={() => setSelectedException(e)}
                            title="Investigate exception details"
                          >
                            Investigate ↗
                          </button>
                          {isOp && (
                            <button
                              className="btn-quick-resolve"
                              onClick={() => onResolveException(e.id, 'Directly resolved via queue')}
                              disabled={isProcessing}
                              title="Resolve exception"
                            >
                              Resolve
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

      {/* Exception Modal */}
      {selectedException && (
        <ExceptionModal
          exception={selectedException}
          onClose={() => setSelectedException(null)}
          onResolve={(id, note) => {
            onResolveException(id, note)
            setSelectedException(null)
          }}
          onCompensate={(id, amt, note) => {
            onCompensateException(id, amt, note)
            setSelectedException(null)
          }}
          isProcessing={isProcessing}
        />
      )}
    </div>
  )
}

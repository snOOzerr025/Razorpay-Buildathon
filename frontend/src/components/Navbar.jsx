import React from 'react'

export function Navbar({
  activeTab,
  setActiveTab,
  pendingCount,
  exceptionCount,
  healthStatus,
  onRefresh,
  isRefreshing,
  mode,
  setMode,
  onQuickRun,
  currentUser,
  onSignOut,
  onBackToLanding,
}) {
  const isLiveConnected = mode === 'live' && healthStatus === 'ok'

  return (
    <header className="navbar-container">
      <nav className="navbar" aria-label="Main Navigation">
        {/* ─── Left: Brand & Perspective ─── */}
        <div className="navbar-brand-wrapper">
          <div
            className="navbar-brand"
            onClick={() => setActiveTab('dashboard')}
            style={{ cursor: 'pointer' }}
            title="Parity Reconciliation Workstation"
          >
            <div className="brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div className="brand-text">
              <span className="brand-title">
                Parity<span className="brand-slash">/</span><span className="brand-sub">recon</span>
              </span>
            </div>
          </div>

          {onBackToLanding && (
            <button
              type="button"
              className="navbar-story-link"
              onClick={onBackToLanding}
              title="Return to DeSo-inspired cinematic storytelling page"
            >
              <span>← Story Mode</span>
            </button>
          )}
        </div>

        {/* ─── Center: Segmented Navigation Tabs ─── */}
        <div className="navbar-nav" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'dashboard'}
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span>Dashboard</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'matches'}
            className={`nav-tab ${activeTab === 'matches' ? 'active' : ''}`}
            onClick={() => setActiveTab('matches')}
          >
            <span>Matches</span>
            {pendingCount > 0 && (
              <span className="nav-tab-badge badge-pending">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'exceptions'}
            className={`nav-tab ${activeTab === 'exceptions' ? 'active' : ''}`}
            onClick={() => setActiveTab('exceptions')}
          >
            <span>Exceptions</span>
            {exceptionCount > 0 && (
              <span className="nav-tab-badge badge-exception">
                {exceptionCount}
              </span>
            )}
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'audit'}
            className={`nav-tab ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            <span>Audit Log</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'upload'}
            className={`nav-tab ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <span>Batch Studio</span>
          </button>
        </div>

        {/* ─── Right: Status & Actions ─── */}
        <div className="navbar-actions">
          {/* Unified Clean Status Pill */}
          <div
            className={`navbar-status-badge ${isLiveConnected ? 'status-live' : 'status-benchmark'}`}
            title={isLiveConnected ? 'Live backend connected at localhost:8000' : 'Calibrated 110,377 benchmark replay dataset (Mutations locked)'}
            onClick={() => setMode(mode === 'live' ? 'benchmark' : 'live')}
            style={{ cursor: 'pointer' }}
          >
            <span className="status-dot" />
            <span className="status-label">{isLiveConnected ? 'Live Engine' : 'Benchmark Replay'}</span>
          </div>

          {/* Sync Refresh Button */}
          <button
            className={`btn-icon-refresh ${isRefreshing ? 'spinning' : ''}`}
            onClick={onRefresh}
            title="Refresh reconciliation telemetry"
            aria-label="Refresh telemetry"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
          </button>

          {/* Quick Run Button */}
          <button
            className="btn-quick-run"
            onClick={onQuickRun}
            title="Open batch runner and execute reconciliation"
          >
            <span style={{ fontSize: '0.8rem' }}>▶</span> Run Batch
          </button>

          {/* User Profile Pill */}
          {currentUser && (
            <div className="user-profile-pill" title={`Logged in as ${currentUser.name} (${currentUser.role})`}>
              <span className="user-profile-avatar">{currentUser.avatar || '👤'}</span>
              <div className="user-profile-meta">
                <span className="user-profile-name">{currentUser.name}</span>
              </div>
              <button
                className="btn-signout"
                onClick={onSignOut}
                title="Sign out of reconciliation portal"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  )
}

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
}) {
  return (
    <header className="navbar-container">
      <nav className="navbar" aria-label="Main Navigation">
        {/* Brand Section */}
        <div className="navbar-brand-wrapper">
          <div className="navbar-brand" onClick={() => setActiveTab('dashboard')} style={{ cursor: 'pointer' }}>
            <div className="brand-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div className="brand-text">
              <span className="brand-title">Parity<span className="brand-slash">/</span><span className="brand-sub">recon</span></span>
              <span className="brand-tag">AI FINANCE CONTROLLER</span>
            </div>
          </div>

          {/* Telemetry & Mode Indicator */}
          <div className="telemetry-bar">
            <div className={`status-pill ${healthStatus === 'ok' ? 'status-live' : 'status-demo'}`}>
              <span className="status-ping" />
              <span className="status-text">{mode === 'live' ? 'Live API' : '110k Benchmark'}</span>
            </div>
            <div className="telemetry-item" title="Engine sustained execution throughput">
              <span className="telemetry-label">SPEED:</span>
              <span className="telemetry-val">2,850 rec/s</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="navbar-nav" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'dashboard'}
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="nav-tab-icon">📊</span>
            <span>Dashboard</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'matches'}
            className={`nav-tab ${activeTab === 'matches' ? 'active' : ''}`}
            onClick={() => setActiveTab('matches')}
          >
            <span className="nav-tab-icon">⚡</span>
            <span>Matches</span>
            {pendingCount > 0 && (
              <span className="nav-tab-badge badge-pending" title={`${pendingCount} matches pending review`}>
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
            <span className="nav-tab-icon">⚠</span>
            <span>Exceptions</span>
            {exceptionCount > 0 && (
              <span className="nav-tab-badge badge-exception" title={`${exceptionCount} open exceptions`}>
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
            <span className="nav-tab-icon">📜</span>
            <span>Audit Log</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'upload'}
            className={`nav-tab ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <span className="nav-tab-icon">🚀</span>
            <span>Upload &amp; Reconcile</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="navbar-actions">
          {/* Mode Switcher Toggle */}
          <div className="mode-toggle" title="Toggle between Live Backend and 110k Calibrated Scale Test mode">
            <button
              className={`mode-btn ${mode === 'live' ? 'active' : ''}`}
              onClick={() => setMode('live')}
            >
              Live
            </button>
            <button
              className={`mode-btn ${mode === 'benchmark' ? 'active' : ''}`}
              onClick={() => setMode('benchmark')}
            >
              Benchmark
            </button>
          </div>

          {/* Sync Refresh Button */}
          <button
            className={`btn-icon-refresh ${isRefreshing ? 'spinning' : ''}`}
            onClick={onRefresh}
            title="Refresh reconciliation telemetry"
            aria-label="Refresh telemetry"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
          </button>

          {/* Trigger Reconcile Button */}
          <button
            className="btn-quick-run"
            onClick={onQuickRun}
            title="Run 5-pass reconciliation engine"
          >
            <span>▶</span> Run Engine
          </button>

          {/* User Profile Pill & Sign Out */}
          {currentUser && (
            <div className="user-profile-pill" title={`Logged in as ${currentUser.name} (${currentUser.org})`}>
              <span className="user-profile-avatar">{currentUser.avatar || '👤'}</span>
              <div className="user-profile-meta">
                <span className="user-profile-name">{currentUser.name}</span>
                <span className="user-profile-role">{currentUser.role}</span>
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

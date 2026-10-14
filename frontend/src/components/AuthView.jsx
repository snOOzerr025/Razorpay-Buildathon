import React, { useState } from 'react'

const DEMO_PERSONAS = [
  {
    name: 'Priya Sharma',
    email: 'priya.sharma@razorpay.demo',
    role: 'Lead Finance Controller',
    badge: 'Tier 3 Approval Authority',
    avatar: '👩‍💼',
    org: 'Razorpay Enterprise Ops',
  },
  {
    name: 'Arjun Mehta',
    email: 'arjun.mehta@compliance.demo',
    role: 'Senior Audit Officer',
    badge: 'SOX Compliance Reviewer',
    avatar: '👨‍💼',
    org: 'Deloitte Assurance',
  },
  {
    name: 'Neha Roy',
    email: 'neha.roy@merchant.demo',
    role: 'Treasury & Settlement Ops',
    badge: 'Batch Recon Lead',
    avatar: '👩‍💻',
    org: 'Zomato Merchant Treasury',
  },
]

export function AuthView({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('priya.sharma@razorpay.demo')
  const [password, setPassword] = useState('demo1234')
  const [fullName, setFullName] = useState('')
  const [organization, setOrganization] = useState('')
  const [role, setRole] = useState('Finance Controller')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleAuthSubmit = e => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please provide both email and password.')
      return
    }

    if (isSignUp && !fullName) {
      setError('Please enter your full name.')
      return
    }

    setIsLoading(true)

    // Simulate authenticating against backend / local session
    setTimeout(() => {
      const userSession = {
        name: isSignUp ? fullName : (DEMO_PERSONAS.find(p => p.email === email)?.name || email.split('@')[0]),
        email,
        role: isSignUp ? role : (DEMO_PERSONAS.find(p => p.email === email)?.role || 'Reconciliation Reviewer'),
        org: isSignUp ? (organization || 'Merchant Treasury') : (DEMO_PERSONAS.find(p => p.email === email)?.org || 'Payment Operations'),
        avatar: isSignUp ? '👤' : (DEMO_PERSONAS.find(p => p.email === email)?.avatar || '👤'),
        token: 'dev_token_123',
        loggedInAt: new Date().toISOString(),
      }

      localStorage.setItem('parity_user_session', JSON.stringify(userSession))
      setIsLoading(false)
      onLoginSuccess(userSession)
    }, 450)
  }

  const handlePersonaSelect = persona => {
    setEmail(persona.email)
    setPassword('demo1234')
    setIsLoading(true)

    setTimeout(() => {
      const userSession = {
        name: persona.name,
        email: persona.email,
        role: persona.role,
        org: persona.org,
        avatar: persona.avatar,
        token: 'dev_token_123',
        loggedInAt: new Date().toISOString(),
      }

      localStorage.setItem('parity_user_session', JSON.stringify(userSession))
      setIsLoading(false)
      onLoginSuccess(userSession)
    }, 300)
  }

  const handleGuestAccess = () => {
    const guestSession = {
      name: 'Guest Reviewer',
      email: 'guest.reviewer@evaluator.demo',
      role: 'Hackathon Panel Judge',
      org: 'Razorpay AI Buildathon',
      avatar: '⚖️',
      token: 'dev_token_123',
      loggedInAt: new Date().toISOString(),
    }
    localStorage.setItem('parity_user_session', JSON.stringify(guestSession))
    onLoginSuccess(guestSession)
  }

  return (
    <div className="auth-container">
      {/* Background glowing ambient effects */}
      <div className="auth-glow-top" />
      <div className="auth-glow-bottom" />

      <div className="auth-card">
        {/* Header Branding */}
        <div className="auth-header">
          <div className="auth-logo-badge">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <h1 className="auth-title">
            Parity<span className="auth-title-accent">/recon</span>
          </h1>
          <p className="auth-subtitle">AI-Assisted 3-Way Financial Reconciliation Engine</p>
          <div className="auth-security-tag">
            <span className="auth-security-icon">🔒</span> SOX-Compliant • Deterministic-First • Risk-Tiered
          </div>
        </div>

        {/* Tab Toggle: Sign In vs Sign Up */}
        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            className={`auth-tab-btn ${!isSignUp ? 'active' : ''}`}
            onClick={() => {
              setIsSignUp(false)
              setError('')
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${isSignUp ? 'active' : ''}`}
            onClick={() => {
              setIsSignUp(true)
              setError('')
            }}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="auth-error-alert" role="alert">
            <span className="auth-error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Primary Form */}
        <form onSubmit={handleAuthSubmit} className="auth-form">
          {isSignUp && (
            <>
              <div className="auth-form-group">
                <label className="auth-label" htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  type="text"
                  className="auth-input"
                  placeholder="e.g. Priya Sharma"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>

              <div className="auth-form-row">
                <div className="auth-form-group">
                  <label className="auth-label" htmlFor="organization">Merchant / Org</label>
                  <input
                    id="organization"
                    type="text"
                    className="auth-input"
                    placeholder="e.g. Zomato Treasury"
                    value={organization}
                    onChange={e => setOrganization(e.target.value)}
                  />
                </div>

                <div className="auth-form-group">
                  <label className="auth-label" htmlFor="role">Role</label>
                  <select
                    id="role"
                    className="auth-input auth-select"
                    value={role}
                    onChange={e => setRole(e.target.value)}
                  >
                    <option value="Finance Controller">Finance Controller</option>
                    <option value="Senior Auditor">Senior Auditor</option>
                    <option value="Treasury Lead">Treasury Lead</option>
                    <option value="Risk & Compliance">Risk &amp; Compliance</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="auth-form-group">
            <label className="auth-label" htmlFor="email">Work Email</label>
            <input
              id="email"
              type="email"
              className="auth-input"
              placeholder="name@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="auth-form-group">
            <div className="auth-label-row">
              <label className="auth-label" htmlFor="password">Password</label>
              {!isSignUp && (
                <span className="auth-hint">Demo: Any password works</span>
              )}
            </div>
            <input
              id="password"
              type="password"
              className="auth-input"
              placeholder="••••••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              required
            />
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="auth-loading-spinner" />
            ) : isSignUp ? (
              'Create Account & Launch Portal →'
            ) : (
              'Sign In to Dashboard →'
            )}
          </button>
        </form>

        {/* 1-Click Demo Personas (For Judges & Instant Evaluation) */}
        <div className="auth-personas-section">
          <div className="auth-divider">
            <span>OR 1-CLICK DEMO LOGIN (FOR JUDGES & EVALUATORS)</span>
          </div>

          <div className="auth-personas-grid">
            {DEMO_PERSONAS.map(p => (
              <button
                key={p.email}
                type="button"
                className="auth-persona-card"
                onClick={() => handlePersonaSelect(p)}
                title={`Log in as ${p.name} (${p.role})`}
              >
                <div className="persona-avatar">{p.avatar}</div>
                <div className="persona-info">
                  <div className="persona-name">{p.name}</div>
                  <div className="persona-role">{p.role}</div>
                  <div className="persona-badge">{p.badge}</div>
                </div>
                <div className="persona-arrow">→</div>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="auth-guest-btn"
            onClick={handleGuestAccess}
          >
            ⚖️ Continue as Anonymous Guest Judge (Read &amp; Execute Access)
          </button>
        </div>
      </div>
    </div>
  )
}

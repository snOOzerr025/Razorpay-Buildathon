import React, { useState, useEffect, useRef } from 'react'
import { RobotWorkstationCanvas } from './RobotWorkstationCanvas'

const DEMO_PERSONAS = [
  {
    name: 'Priya Sharma',
    email: 'priya.sharma@razorpay.demo',
    role: 'Lead Finance Controller',
    badge: 'Tier 3 Sign-Off Authority',
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

export function AuthView({ onLoginSuccess, onBackToLanding }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('priya.sharma@razorpay.demo')
  const [password, setPassword] = useState('demo1234')
  const [fullName, setFullName] = useState('')
  const [organization, setOrganization] = useState('')
  const [role, setRole] = useState('Finance Controller')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')

  // Interactive 3D typing state & simple submit animation
  const [isTyping, setIsTyping] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const typingTimeoutRef = useRef(null)

  const handleInputChange = (setter) => (e) => {
    setter(e.target.value)
    setIsTyping(true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, 700)
  }

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [])

  const executeLoginSequence = (sessionData) => {
    setIsSubmitting(true)
    // Instant, clean login with subtle feedback
    setTimeout(() => {
      localStorage.setItem('parity_user_session', JSON.stringify(sessionData))
      onLoginSuccess(sessionData)
    }, 200)
  }

  const handleAuthSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please provide both email and password.')
      return
    }

    if (isSignUp && !fullName) {
      setError('Please enter your full legal name.')
      return
    }

    const matchedPersona = DEMO_PERSONAS.find((p) => p.email === email)
    const userSession = {
      name: isSignUp ? fullName : (matchedPersona?.name || email.split('@')[0]),
      email,
      role: isSignUp ? role : (matchedPersona?.role || 'Reconciliation Controller'),
      org: isSignUp ? (organization || 'Merchant Treasury') : (matchedPersona?.org || 'Payment Operations'),
      avatar: isSignUp ? '👤' : (matchedPersona?.avatar || '👤'),
      token: 'dev_token_123',
      loggedInAt: new Date().toISOString(),
    }

    executeLoginSequence(userSession)
  }

  const handlePersonaSelect = (persona) => {
    setEmail(persona.email)
    setPassword('demo1234')
    setError('')

    const userSession = {
      name: persona.name,
      email: persona.email,
      role: persona.role,
      org: persona.org,
      avatar: persona.avatar,
      token: 'dev_token_123',
      loggedInAt: new Date().toISOString(),
    }

    executeLoginSequence(userSession)
  }

  const handleGuestAccess = () => {
    const guestSession = {
      name: 'Hackathon Panel Judge',
      email: 'judge.panel@razorpay.buildathon',
      role: 'Hackathon Lead Evaluator',
      org: 'Razorpay AI Buildathon 2026',
      avatar: '⚖️',
      token: 'dev_token_123',
      loggedInAt: new Date().toISOString(),
    }
    executeLoginSequence(guestSession)
  }

  return (
    <div className="auth-award-page">
      {/* Background Volumetric Atmospheric Glows */}
      <div className="auth-ambient-glow glow-top-honey" />
      <div className="auth-ambient-glow glow-bottom-matcha" />

      <div className="auth-split-layout">
        {/* ===================================================================
            LEFT HALF: 3D CYBER-RECON ROBOT (PURE 3D FRAME, NO TEXTS OR BARS)
            =================================================================== */}
        <div className="auth-visual-pane">
          <div className="visual-canvas-container">
            <RobotWorkstationCanvas isTyping={isTyping} />
          </div>
        </div>

        {/* ===================================================================
            RIGHT HALF: EDITORIAL AUTHENTICATION TERMINAL & OPTIONS
            =================================================================== */}
        <div className="auth-form-pane">
          <div className="auth-form-card">
            {/* Top Navigation & Return Link */}
            <div className="form-card-header">
              {onBackToLanding ? (
                <button
                  type="button"
                  className="auth-back-link"
                  onClick={onBackToLanding}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  <span>Story Mode</span>
                </button>
              ) : (
                <div />
              )}

              <div className="auth-status-pill">
                <span className="status-dot">●</span>
                <span>TERMINAL ENCRYPTED</span>
              </div>
            </div>

            {/* Editorial Title Header */}
            <div className="auth-title-block">
              <div className="auth-brand-eyebrow">
                <span>CHAPTER 01</span>
                <span className="eyebrow-divider" />
                <span style={{ color: 'var(--accent-gold)' }}>FINANCIAL GATEWAY</span>
              </div>

              <h1 className="auth-headline">
                Access Financial
                <br />
                <span className="serif-accent">Workstation.</span>
              </h1>

              <p className="auth-desc">
                Continuous-close three-way reconciliation console with deterministic zero-hallucination math.
              </p>
            </div>

            {/* Tab Switcher: Sign In vs Sign Up */}
            <div className="auth-segmented-control" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={!isSignUp}
                className={`auth-segment-btn ${!isSignUp ? 'active' : ''}`}
                onClick={() => {
                  setIsSignUp(false)
                  setError('')
                }}
              >
                <span>Operator Sign In</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isSignUp}
                className={`auth-segment-btn ${isSignUp ? 'active' : ''}`}
                onClick={() => {
                  setIsSignUp(true)
                  setError('')
                }}
              >
                <span>Provision Access</span>
              </button>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div className="auth-alert-box" role="alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Primary Form */}
            <form onSubmit={handleAuthSubmit} className="auth-styled-form">
              {isSignUp && (
                <>
                  <div className="form-field-group">
                    <label className="field-label" htmlFor="fullName">Legal Full Name</label>
                    <div className="input-with-icon">
                      <span className="input-icon">👤</span>
                      <input
                        id="fullName"
                        type="text"
                        className="styled-input"
                        placeholder="e.g. Priya Sharma"
                        value={fullName}
                        onChange={handleInputChange(setFullName)}
                        autoComplete="name"
                        disabled={isSubmitting}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-grid-two">
                    <div className="form-field-group">
                      <label className="field-label" htmlFor="orgName">Organization / Treasury</label>
                      <div className="input-with-icon">
                        <span className="input-icon">🏢</span>
                        <input
                          id="orgName"
                          type="text"
                          className="styled-input"
                          placeholder="e.g. Zomato Treasury"
                          value={organization}
                          onChange={handleInputChange(setOrganization)}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <div className="form-field-group">
                      <label className="field-label" htmlFor="userRole">System Authority Role</label>
                      <div className="input-with-icon">
                        <span className="input-icon">⚖️</span>
                        <select
                          id="userRole"
                          className="styled-input styled-select"
                          value={role}
                          onChange={handleInputChange(setRole)}
                          disabled={isSubmitting}
                        >
                          <option value="Finance Controller">Finance Controller</option>
                          <option value="Senior Auditor">Senior Auditor</option>
                          <option value="Treasury Lead">Treasury Lead</option>
                          <option value="Risk & Compliance">Risk &amp; Compliance</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Work Email */}
              <div className="form-field-group">
                <label className="field-label" htmlFor="authEmail">Work Email Address</label>
                <div className="input-with-icon">
                  <span className="input-icon">✉️</span>
                  <input
                    id="authEmail"
                    type="email"
                    className="styled-input"
                    placeholder="name@razorpay.demo"
                    value={email}
                    onChange={handleInputChange(setEmail)}
                    autoComplete="username"
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="form-field-group">
                <div className="field-label-row">
                  <label className="field-label" htmlFor="authPassword">Access Key / Password</label>
                  {!isSignUp && (
                    <span className="field-hint-pill">Demo Mode: Any password works</span>
                  )}
                </div>
                <div className="input-with-icon">
                  <span className="input-icon">🔑</span>
                  <input
                    id="authPassword"
                    type={showPassword ? 'text' : 'password'}
                    className="styled-input"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={handleInputChange(setPassword)}
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    disabled={isSubmitting}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex="-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '👁️' : '🔒'}
                  </button>
                </div>
              </div>

              {/* Remember Me & Recovery Options */}
              <div className="form-options-row">
                <label className="remember-me-checkbox">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isSubmitting}
                  />
                  <span className="custom-check-box" />
                  <span className="checkbox-text">Persist hardware session</span>
                </label>

                <a
                  href="#forgot"
                  className="forgot-link"
                  onClick={(e) => {
                    e.preventDefault()
                    setError('Demo environment: Please select one of the 1-Click Evaluation personas below.')
                  }}
                >
                  Forgot Key?
                </a>
              </div>

              {/* Simple Color Gradient Animated Login Button */}
              <button
                type="submit"
                className={`auth-action-button ${isSubmitting ? 'button-submitting' : ''}`}
                disabled={isSubmitting}
              >
                <span>
                  {isSubmitting
                    ? 'Signing in...'
                    : isSignUp
                    ? 'Provision Access & Launch Portal →'
                    : 'Sign In to Dashboard →'}
                </span>
              </button>
            </form>

            {/* 1-Click Instant Evaluation Personas (For Judges & Evaluators) */}
            <div className="auth-persona-eval-deck">
              <div className="eval-deck-divider">
                <span className="line" />
                <span className="eval-tag">1-CLICK HACKATHON EVALUATION PASS</span>
                <span className="line" />
              </div>

              <div className="persona-cards-list">
                {DEMO_PERSONAS.map((p) => (
                  <button
                    key={p.email}
                    type="button"
                    className="persona-card-item"
                    onClick={() => handlePersonaSelect(p)}
                    disabled={isSubmitting}
                    title={`Instant login as ${p.name}`}
                  >
                    <div className="persona-avatar-wrap">{p.avatar}</div>
                    <div className="persona-text-col">
                      <div className="persona-header-line">
                        <span className="name">{p.name}</span>
                        <span className="badge-tier">{p.badge}</span>
                      </div>
                      <div className="persona-org-role">
                        <span>{p.role}</span> • <span style={{ opacity: 0.7 }}>{p.org}</span>
                      </div>
                    </div>
                    <div className="persona-arrow-col">→</div>
                  </button>
                ))}
              </div>

              {/* Guest Judge Bypass */}
              <button
                type="button"
                className="guest-judge-pill-btn"
                onClick={handleGuestAccess}
                disabled={isSubmitting}
              >
                <span>⚖️</span>
                <span>Continue as Anonymous Guest Judge (Instant Full-Access)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

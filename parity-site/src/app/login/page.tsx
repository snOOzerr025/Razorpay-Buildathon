'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight, User, ShieldCheck, AlertCircle } from 'lucide-react'

// Buildathon demo: shared password is sent from the server via NEXT_PUBLIC_DEMO_PASSWORD
// (or falls back to "parity-demo" if not set). Production should swap this for a real
// OAuth/JWT flow — see security review note 2.
const DEMO_PASSWORD =
  process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? 'parity-demo'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleLogin(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setError(null)

    if (!email) {
      setError('Email is required.')
      return
    }
    if (password !== DEMO_PASSWORD) {
      setError('Invalid credentials. (Hint for the buildathon demo: see the password in the project README.)')
      return
    }

    setLoading(true)
    // Simulate a network round-trip. The real backend hit is done by every
    // /api/v1/* call afterwards with the bearer token from the .env on the
    // server (see P1-18).
    setTimeout(() => {
      localStorage.setItem(
        'parity_session',
        JSON.stringify({
          user: email.split('@')[0],
          role: 'Administrator',
          ts: Date.now(),
        }),
      )
      router.push('/dashboard')
    }, 400)
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 relative" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="max-w-md w-full p-10 text-center shadow-2xl relative z-10 flex flex-col rounded-xl border anim-stagger"
           style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

        <div className="mb-8 text-left">
          <h1 className="text-3xl font-display tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>
            System Login
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Authenticate to access the Parity Reconciliation Engine.
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5 text-left">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              Corporate Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border focus:outline-none transition-colors"
              style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              placeholder="controller@company.com"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'var(--text-secondary)' }}
              >
                Password
              </label>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Demo buildathon
              </span>
            </div>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border focus:outline-none transition-colors"
              style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 rounded-lg text-sm text-left"
              style={{
                backgroundColor: 'var(--danger-soft)',
                border: '1px solid var(--danger)',
                color: 'var(--danger-bright)',
              }}
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex items-center justify-center gap-2 w-full py-3 rounded-lg font-medium transition-opacity disabled:opacity-60"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--bg-base)',
            }}
          >
            {loading ? (
              'Authenticating…'
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Sign In
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-xs" style={{ color: 'var(--text-muted)' }}>
          Demo buildathon · No live data. Synthetic CSVs only.
        </p>
      </div>
    </main>
  )
}

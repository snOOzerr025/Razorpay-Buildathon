'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    
    setLoading(true)
    
    // Simulate network request
    setTimeout(() => {
      localStorage.setItem('parity_session', JSON.stringify({ 
        user: email.split('@')[0], 
        role: 'Administrator',
        ts: Date.now() 
      }))
      router.push('/dashboard')
    }, 800)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#050505] p-6 relative">
      <div className="max-w-md w-full bg-[#0a0a0a] p-10 text-center border border-white/10 shadow-2xl relative z-10 flex flex-col rounded-sm">
        
        <div className="mb-10 text-left">
          <h1 className="text-3xl font-display text-white mb-2 tracking-tight">System Login</h1>
          <p className="text-gray-400 text-sm">
            Enter your credentials to access the Parity Reconciliation Engine.
          </p>
        </div>
        
        <form onSubmit={handleLogin} className="flex flex-col gap-6 text-left">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
              Corporate Email
            </label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#050505] border border-white/10 text-white px-4 py-3 rounded-sm focus:outline-none focus:border-[#00E5FF] transition-colors"
              placeholder="controller@company.com"
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
              Password
            </label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#050505] border border-white/10 text-white px-4 py-3 rounded-sm focus:outline-none focus:border-[#00E5FF] transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-semibold uppercase tracking-widest py-4 hover:bg-gray-200 transition-colors mt-4 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </main>
  )
}

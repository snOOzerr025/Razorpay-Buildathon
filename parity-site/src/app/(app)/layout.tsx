'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Play, AlertCircle, History, List, Settings, LogOut, Sun, Moon } from 'lucide-react'
import LivingInvariant from '@/components/LivingInvariant'
import Chatbot from '@/components/Chatbot'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<string | null>(null)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const session = localStorage.getItem('parity_session')
    if (!session) {
      router.replace('/login')
    } else {
      try {
        const parsed = JSON.parse(session)
        setUser(parsed.user)
      } catch (e) {
        router.replace('/login')
      }
    }
    // Load saved theme preference
    const savedTheme = localStorage.getItem('parity_theme') as 'dark' | 'light' | null
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.setAttribute('data-theme', savedTheme)
    }
  }, [router])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('parity_theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  const handleSignOut = () => {
    localStorage.removeItem('parity_session')
    router.replace('/login')
  }

  if (!user) return null

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Live Run', href: '/run', icon: Play },
    { name: 'Exceptions', href: '/exceptions', icon: AlertCircle },
    { name: 'Run History', href: '/run/history', icon: History },
    { name: 'Audit Trail', href: '/audit', icon: List },
    { name: 'Settings', href: '/settings', icon: Settings, disabled: true },
  ]

  return (
    <div className="min-h-screen flex w-full" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Sidebar */}
      <aside
        className="w-[220px] flex flex-col shrink-0 sticky top-0 h-screen"
        style={{
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border)',
        }}
      >
        <div className="p-6" style={{ borderBottom: '1px solid var(--border)' }}>
          <Link href="/" className="font-display font-bold text-xl tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Parity
          </Link>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.disabled ? '#' : item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  item.disabled ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor: 'var(--accent-soft)',
                        color: 'var(--accent-primary)',
                        borderLeft: '3px solid var(--accent-primary)',
                      }
                    : {
                        color: 'var(--text-muted)',
                      }
                }
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Sign Out at bottom */}
        <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 rounded-lg w-full transition-colors hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header
          className="h-[64px] flex items-center justify-between px-8 shrink-0 sticky top-0 z-20"
          style={{
            backgroundColor: 'var(--bg-base)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <h1 className="font-display text-lg capitalize" style={{ color: 'var(--text-primary)' }}>
            {pathname.split('/').pop()?.replace('-', ' ') || 'App'}
          </h1>
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-sandy)',
              }}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User Badge */}
            <div
              className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <span
                className="w-2 h-2 rounded-full block"
                style={{ backgroundColor: 'var(--success)' }}
              />
              {user}
            </div>
          </div>
        </header>

        {/* Mini Living Invariant */}
        <div className="sticky top-[64px] z-10">
          <LivingInvariant mini={true} />
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-x-hidden p-8">
          {children}
        </div>

        {/* Chatbot */}
        <Chatbot />
      </main>
    </div>
  )
}

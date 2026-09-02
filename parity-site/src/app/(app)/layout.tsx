'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Play, AlertCircle, History, List, Settings, LogOut } from 'lucide-react'
import LivingInvariant from '@/components/LivingInvariant'
import Chatbot from '@/components/Chatbot'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<string | null>(null)

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
  }, [router])

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
    <div className="min-h-screen flex w-full bg-[#050505] text-white">
      {/* Sidebar */}
      <aside className="w-[220px] bg-[#0a0a0a] border-r border-white/10 flex flex-col shrink-0 sticky top-0 h-screen">
        <div className="p-6 border-b border-white/10">
          <Link href="/" className="font-display font-bold text-xl tracking-tight">Parity</Link>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <Link 
                key={item.name} 
                href={item.disabled ? '#' : item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  item.disabled 
                    ? 'opacity-40 cursor-not-allowed pointer-events-none' 
                    : isActive 
                      ? 'bg-white text-black' 
                      : 'hover:bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-[72px] border-b border-white/10 flex items-center justify-between px-8 shrink-0 bg-[#050505] sticky top-0 z-20">
          <h1 className="font-display text-xl capitalize text-white">
            {pathname.split('/').pop()?.replace('-', ' ') || 'App'}
          </h1>
          <div className="flex items-center gap-4">
            <div className="bg-[#0a0a0a] border border-white/10 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 text-white">
              <span className="w-2 h-2 rounded-full bg-[#00E5FF] block"></span>
              {user}
            </div>
            <button onClick={handleSignOut} className="text-gray-400 hover:text-white transition-colors" aria-label="Sign out">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Mini Living Invariant */}
        <div className="sticky top-[72px] z-10">
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

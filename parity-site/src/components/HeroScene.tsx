'use client'

import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import MagneticButton from './MagneticButton'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Layers, GitMerge } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

export default function HeroScene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  
  useEffect(() => {
    // Parallax text on scroll
    const ctx = gsap.context(() => {
      gsap.to('.hero-text', {
        y: -150,
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true
        }
      })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={containerRef} className="relative w-full h-screen bg-[#050505] overflow-hidden flex flex-col justify-center items-center" id="hero">
      
      {/* Background Gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      {/* HTML Overlay */}
      <div className="relative z-[10] w-full flex flex-col items-center justify-center px-6 pointer-events-none hero-text h-full mt-24">
        
        {/* Value Proposition Headline */}
        <div className="flex flex-col items-center justify-center mb-12">
          <div className="px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono tracking-widest uppercase mb-8 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Enterprise Grade
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold tracking-tighter text-center leading-[1.1] text-white max-w-5xl">
            Autonomous <span className="text-emerald-400">3-Way</span> Financial <br className="hidden md:block"/> Reconciliation Engine
          </h1>
        </div>

        {/* 3-Way Diagram Visual */}
        <div className="flex items-center justify-center gap-4 md:gap-12 mb-16 opacity-80">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-xl bg-[#18181b] border border-white/10 flex items-center justify-center shadow-lg">
              <Layers className="w-8 h-8 text-blue-400" />
            </div>
            <span className="text-xs font-mono text-gray-400 tracking-widest uppercase">Gateway</span>
          </div>
          
          <div className="flex flex-col items-center mt-8">
            <GitMerge className="w-8 h-8 text-emerald-500" />
            <div className="h-px w-16 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent mt-2"></div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-xl bg-[#18181b] border border-white/10 flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-8 h-8 text-amber-400" />
            </div>
            <span className="text-xs font-mono text-gray-400 tracking-widest uppercase">Bank</span>
          </div>

          <div className="flex flex-col items-center mt-8">
            <GitMerge className="w-8 h-8 text-emerald-500" />
            <div className="h-px w-16 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent mt-2"></div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-xl bg-[#18181b] border border-white/10 flex items-center justify-center shadow-lg">
              <DatabaseIcon className="w-8 h-8 text-purple-400" />
            </div>
            <span className="text-xs font-mono text-gray-400 tracking-widest uppercase">Ledger</span>
          </div>
        </div>
        
        {/* Sub-content positioned lower */}
        <div className="flex flex-col items-center z-[10]">
          <p className="max-w-2xl text-center text-sm md:text-base text-gray-400 mb-10 font-medium tracking-wide leading-relaxed">
            Eliminate manual spreadsheet matching. Automate millions of transactions across your payment gateway, bank settlements, and merchant ledger with a deterministic core and a human-in-the-loop AI fallback.
          </p>
          <div className="pointer-events-auto flex items-center gap-6">
            <MagneticButton>
              <div onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-xs md:text-sm tracking-widest uppercase font-semibold text-black bg-emerald-500 border border-emerald-400 px-8 py-4 hover:bg-emerald-400 transition-colors cursor-pointer rounded-md shadow-lg shadow-emerald-500/20">
                View Scorecard
              </div>
            </MagneticButton>
            <MagneticButton>
              <div onClick={() => router.push('/exceptions')} className="flex items-center gap-2 text-xs md:text-sm tracking-widest uppercase font-semibold text-white bg-transparent border border-white/20 px-8 py-4 hover:bg-white/5 transition-colors cursor-pointer rounded-md">
                Review Exceptions
              </div>
            </MagneticButton>
          </div>
        </div>
      </div>
    </section>
  )
}

function DatabaseIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </svg>
  )
}

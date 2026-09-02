'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function NavBar() {
  return (
    <motion.header 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 w-full z-[100] px-6 py-6 flex justify-between items-center pointer-events-none"
    >
      <div className="flex-1 flex items-center pointer-events-auto">
        <Link href="/" className="font-display font-bold text-xl tracking-tighter text-white">
          PARITY <span className="text-emerald-500 font-light">CONTROLLER</span>
        </Link>
      </div>
      
      <div className="flex-none flex justify-center items-center gap-8 pointer-events-auto bg-[#09090b]/80 backdrop-blur-xl border border-white/10 px-8 py-3 rounded-full shadow-2xl">
        <Link href="/dashboard" className="text-xs font-semibold tracking-widest text-gray-400 hover:text-white transition-colors">
          SCORECARD
        </Link>
        <div className="w-[1px] h-4 bg-white/10" />
        <Link href="/exceptions" className="text-xs font-semibold tracking-widest text-amber-500/80 hover:text-amber-400 transition-colors flex items-center gap-2">
          EXCEPTIONS
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
        </Link>
      </div>

      <div className="flex-1 flex justify-end pointer-events-auto">
      </div>
    </motion.header>
  )
}

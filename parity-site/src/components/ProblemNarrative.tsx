'use client'

import { motion } from 'framer-motion'

export default function ProblemNarrative() {
  return (
    <section id="problem" className="relative w-full py-32 bg-[#050505] border-y border-white/10">
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay pointer-events-none" />
      
      <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-sm border border-[#FF4400]/30 bg-[#FF4400]/10 text-[#FF4400] text-xs tracking-widest uppercase font-mono mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-[#FF4400] animate-pulse" />
          The Disconnect
        </motion.div>

        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-6xl font-display font-bold mb-8 text-white"
        >
          The Gap Between Gateway and Ledger
        </motion.h2>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-xl md:text-2xl text-gray-400 leading-relaxed font-light"
        >
          Traditional reconciliation fails when unstructured text from bank settlements meets the rigid requirements of a general ledger. 
          We built a three-way reconciliation engine that bridges this gap deterministically, turning uncertainty into verifiable financial truth.
        </motion.p>
      </div>
    </section>
  )
}

import React from 'react';
import { motion } from 'framer-motion';

export default function Hero() {
  const headline = "Reconciliation, proven — not promised.";
  const words = headline.split(" ");

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 * i },
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", damping: 20, stiffness: 100, duration: 0.5 },
    },
    hidden: {
      opacity: 0,
      y: 12,
    },
  };

  return (
    <section className="relative w-full min-h-[100svh] bg-void flex flex-col justify-center items-center overflow-hidden pt-20">
      {/* Grid Background */}
      <div 
        className="absolute inset-0 z-0 opacity-10 pointer-events-none"
        style={{ 
          backgroundImage: `linear-gradient(to right, var(--color-hairline) 1px, transparent 1px), linear-gradient(to bottom, var(--color-hairline) 1px, transparent 1px)`,
          backgroundSize: '4rem 4rem'
        }}
      >
        {/* Signal Dot Animation */}
        <motion.div
          animate={{ 
            x: ['0vw', '100vw', '50vw', '0vw'],
            y: ['0vh', '50vh', '100vh', '0vh'],
          }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          className="absolute w-2 h-2 bg-signal rounded-full shadow-[0_0_12px_4px_var(--color-signal)]"
        />
      </div>

      <div className="relative z-10 w-full max-w-[1280px] px-6 mx-auto flex flex-col items-center text-center">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.1 }}
          className="text-ink-dim text-sm uppercase tracking-widest font-semibold mb-6"
        >
          Razorpay AI Buildathon · AI Finance Controller Track
        </motion.div>

        <motion.h1 
          variants={container}
          initial="hidden"
          animate="visible"
          className="font-display font-semibold text-ink text-[clamp(48px,7vw,104px)] leading-[0.95] tracking-[-0.03em] max-w-[1000px] mb-8"
        >
          {words.map((word, idx) => (
            <motion.span variants={child} key={idx} className="inline-block mr-3">
              {word}
            </motion.span>
          ))}
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.8 }}
          className="font-body text-ink-dim text-[17px] leading-relaxed max-w-[640px] mb-12"
        >
          A three-way AI-assisted payment reconciliation engine mapping gateway transactions, bank settlements, and merchant ledgers with zero black boxes.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1 }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <button 
            onClick={() => document.getElementById('live-run')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-signal hover:brightness-110 text-white font-medium px-8 py-4 rounded hover:-translate-y-px transition-all active:translate-y-0 w-full sm:w-auto"
          >
            Run the live demo
          </button>
          <a 
            href="https://github.com/snOOzerr025/Razorpay-Buildathon"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-hairline text-ink hover:bg-surface font-medium px-8 py-4 rounded transition-colors w-full sm:w-auto"
          >
            View on GitHub
          </a>
        </motion.div>
      </div>

      {/* Bottom Stats Strip */}
      <div className="absolute bottom-0 w-full border-t border-hairline bg-void/80 backdrop-blur-sm z-20">
        <div className="max-w-[1280px] mx-auto px-6 py-4 flex justify-between overflow-x-auto gap-8 no-scrollbar">
           <div className="flex flex-col flex-shrink-0">
             <span className="font-mono text-ink text-[17px]">110,377</span>
             <span className="font-body text-ink-dim text-[13px] uppercase tracking-wider">Total Records</span>
           </div>
           <div className="flex flex-col flex-shrink-0">
             <span className="font-mono text-ink text-[17px]">72.29%</span>
             <span className="font-body text-ink-dim text-[13px] uppercase tracking-wider">Automated Match</span>
           </div>
           <div className="flex flex-col flex-shrink-0">
             <span className="font-mono text-ink text-[17px]">5 Passes</span>
             <span className="font-body text-ink-dim text-[13px] uppercase tracking-wider">Deterministic Layer</span>
           </div>
           <div className="flex flex-col flex-shrink-0">
             <span className="font-mono text-ink text-[17px]">100%</span>
             <span className="font-body text-ink-dim text-[13px] uppercase tracking-wider">FN Containment</span>
           </div>
        </div>
      </div>
    </section>
  );
}

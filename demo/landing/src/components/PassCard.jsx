import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PassCard({ passNum, title, count, percent, latency, resolveDelay, isRunning, onResolved }) {
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (isRunning) {
      setResolved(false);
      const timer = setTimeout(() => {
        setResolved(true);
        onResolved && onResolved(passNum);
      }, resolveDelay);
      return () => clearTimeout(timer);
    }
  }, [isRunning, resolveDelay, passNum, onResolved]);

  return (
    <div className="flex-1 min-w-[200px] bg-void border border-hairline rounded flex flex-col relative overflow-hidden">
      <AnimatePresence>
        {!resolved && isRunning && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 bg-void"
          >
            {/* Skeleton shimmer */}
            <motion.div
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
              className="w-full h-full bg-gradient-to-r from-transparent via-surface to-transparent opacity-50"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`p-5 flex flex-col h-full transition-opacity duration-500 ${!resolved && !isRunning ? 'opacity-0' : 'opacity-100'}`}>
        <div className="font-display text-[13px] text-ink-dim uppercase tracking-wider mb-6">
          Pass {passNum} · {title}
        </div>
        <div className="font-mono text-ink text-[clamp(24px,2.5vw,32px)] leading-none mb-2 tabular-nums">
          {new Intl.NumberFormat('en-US').format(count)}
        </div>
        <div className="font-mono text-ink-dim text-[13px] tabular-nums mb-4">
          {percent}% of total
        </div>
        <div className="mt-auto font-mono text-signal text-[13px] tabular-nums">
          {latency}ms
        </div>
      </div>
    </div>
  );
}

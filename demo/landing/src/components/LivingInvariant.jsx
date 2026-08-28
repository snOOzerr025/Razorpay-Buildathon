import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCountUp } from '../lib/useCountUp';

export default function LivingInvariant({ 
  processed = 110377, 
  matched = 79794, 
  exceptions = 30583, 
  isLiveRun = false, // If true, it runs its sequence when triggered
  hasRun = true // For the live run button trigger
}) {
  const ref = useRef(null);
  const [isBalanced, setIsBalanced] = useState(false);

  const countProcessed = useCountUp(ref, hasRun ? processed : 0, 0.9, 0);
  const countMatched = useCountUp(ref, hasRun ? matched : 0, 0.9, 0.2);
  const countExceptions = useCountUp(ref, hasRun ? exceptions : 0, 0.9, 0.35);

  // Check if invariant is satisfied
  const isFailed = (matched + exceptions !== processed) && hasRun;

  useEffect(() => {
    if (hasRun && countProcessed === processed && countMatched === matched && countExceptions === exceptions) {
      if (!isFailed) setIsBalanced(true);
    } else {
      setIsBalanced(false);
    }
  }, [countProcessed, countMatched, countExceptions, hasRun, processed, matched, exceptions, isFailed]);

  const formatNum = (num) => new Intl.NumberFormat('en-US').format(num);

  return (
    <div ref={ref} className="flex flex-col items-center justify-center font-mono">
      <div className="flex items-center gap-6 text-[clamp(24px,4vw,56px)] leading-none tabular-nums tracking-tight">
        <div className="flex flex-col items-center">
          <span>{formatNum(countProcessed)}</span>
          <span className="text-sm text-ink-dim font-body uppercase tracking-wider mt-2">processed</span>
        </div>

        <motion.div
          animate={isBalanced ? { scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 0.2 }}
          className={`relative flex items-center justify-center ${
            isFailed ? 'text-exception-amber' : 'text-signal'
          }`}
        >
          {isBalanced && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 1, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 bg-ledger-green blur-md z-[-1] rounded-full"
            />
          )}
          =
        </motion.div>

        <div className="flex flex-col items-center">
          <span>{formatNum(countMatched)}</span>
          <span className="text-sm text-ink-dim font-body uppercase tracking-wider mt-2">matched</span>
        </div>

        <div className="text-ink-dim">+</div>

        <div className="flex flex-col items-center">
          <span>{formatNum(countExceptions)}</span>
          <span className="text-sm text-ink-dim font-body uppercase tracking-wider mt-2">exceptions</span>
        </div>
      </div>
      
      {isFailed && (
        <div className="mt-4 text-sm text-exception-amber font-body">
          Invariant check failed — see exceptions.
        </div>
      )}
    </div>
  );
}

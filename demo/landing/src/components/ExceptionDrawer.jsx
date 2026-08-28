import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function ExceptionDrawer({ isOpen, onClose, data }) {
  const [showTypewriter, setShowTypewriter] = useState(true);
  const [typedText, setTypedText] = useState('');

  // Very basic typewriter effect
  useEffect(() => {
    if (isOpen && data && showTypewriter) {
      setTypedText('');
      let i = 0;
      const text = data.explanation;
      const interval = setInterval(() => {
        if (i < text.length) {
          setTypedText((prev) => prev + text.charAt(i));
          i++;
        } else {
          clearInterval(interval);
          setShowTypewriter(false); // Only run once per session for this data
        }
      }, 15); // fast typewriter
      return () => clearInterval(interval);
    } else if (isOpen && data && !showTypewriter) {
       setTypedText(data.explanation);
    }
  }, [isOpen, data, showTypewriter]);

  return (
    <AnimatePresence>
      {isOpen && data && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-[100]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.28, ease: 'easeOut' }}
            className="fixed top-0 right-0 w-full md:w-[380px] h-full bg-surface shadow-2xl z-[101] flex flex-col border-l border-hairline"
          >
            <div className="p-6 border-b border-hairline flex justify-between items-start">
              <div>
                <h3 className="font-display text-xl text-ink font-semibold mb-1">{data.category}</h3>
                <div className="font-mono text-ink-dim text-sm tabular-nums">
                  {new Intl.NumberFormat('en-US').format(data.count)} open records
                </div>
              </div>
              <button onClick={onClose} className="text-ink-dim hover:text-ink transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-exception-amber/10 text-exception-amber text-xs font-semibold px-3 py-2 rounded mb-6">
                Illustrative sample — sandbox environment excludes live model calls.
              </div>

              <div className="mb-6">
                <h4 className="font-body text-ink-dim text-sm uppercase tracking-wider mb-3">Sanitized Payload</h4>
                <div className="bg-void border border-hairline rounded p-4 overflow-x-auto">
                  <pre className="font-mono text-[13px] text-ink leading-relaxed">
                    <code>{JSON.stringify(data.payload, null, 2)}</code>
                  </pre>
                </div>
              </div>

              <div>
                <h4 className="font-body text-ink-dim text-sm uppercase tracking-wider mb-3">AI Resolution Draft</h4>
                <div className="font-body text-ink text-[15px] leading-relaxed">
                  {typedText}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

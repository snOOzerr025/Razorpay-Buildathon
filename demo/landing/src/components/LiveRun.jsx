import React, { useState } from 'react';
import LivingInvariant from './LivingInvariant';
import PassCard from './PassCard';

const PASSES = [
  { id: 1, title: 'EXACT', count: 32142, percent: 29.1, latency: 120.4, delay: 600 },
  { id: 2, title: 'TOLERANCE', count: 28401, percent: 25.7, latency: 245.2, delay: 1400 },
  { id: 3, title: 'REFUND LINKAGE', count: 9188, percent: 8.3, latency: 89.1, delay: 2000 },
  { id: 4, title: 'SUBSET-SUM', count: 10063, percent: 9.1, latency: 312.8, delay: 3200 },
  { id: 5, title: 'EXCEPTIONS', count: 30583, percent: 27.7, latency: 14.5, delay: 3800 }
];

export default function LiveRun() {
  const [runState, setRunState] = useState('idle'); // idle | running | resolved
  const [currentPass, setCurrentPass] = useState(1);

  const handleRun = () => {
    if (runState === 'running') return;
    setRunState('running');
    setCurrentPass(1);
  };

  const handlePassResolved = (passId) => {
    if (passId === 5) {
      setRunState('resolved');
    } else {
      setCurrentPass(passId + 1);
    }
  };

  return (
    <section id="live-run" className="bg-void w-full py-32 border-t border-hairline flex justify-center">
      <div className="w-full max-w-[1280px] px-6">
        <div className="bg-surface rounded-lg p-12 lg:p-24 flex flex-col items-center min-h-[600px]">
          
          {/* Living Invariant */}
          <div className={`transition-opacity duration-1000 ${runState === 'idle' ? 'opacity-60' : 'opacity-100'}`}>
            <LivingInvariant hasRun={runState === 'resolved'} />
          </div>

          {/* Controls */}
          <div className="mt-16 mb-24 h-[56px]">
            <button
              onClick={handleRun}
              disabled={runState === 'running'}
              className={`h-full px-12 rounded font-medium text-[17px] transition-all duration-300 relative overflow-hidden ${
                runState === 'running' 
                  ? 'bg-hairline text-ink cursor-default' 
                  : 'bg-signal text-white hover:brightness-110 active:translate-y-px'
              }`}
            >
              {runState === 'running' && (
                <div className="absolute bottom-0 left-0 h-[2px] bg-signal transition-all duration-300 ease-linear" style={{ width: `${(currentPass / 5) * 100}%` }} />
              )}
              {runState === 'idle' && 'Run Reconciliation'}
              {runState === 'running' && `Running Pass ${currentPass} of 5...`}
              {runState === 'resolved' && 'Run again'}
            </button>
          </div>

          {/* Pass Cards */}
          <div className={`w-full flex flex-col md:flex-row gap-4 transition-opacity duration-500 ${(runState === 'idle') ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            {PASSES.map((pass) => (
              <PassCard
                key={pass.id}
                passNum={pass.id}
                title={pass.title}
                count={pass.count}
                percent={pass.percent}
                latency={pass.latency}
                resolveDelay={pass.delay}
                isRunning={runState === 'running'}
                onResolved={handlePassResolved}
              />
            ))}
          </div>
          
          <div className={`mt-8 text-center max-w-[600px] font-body text-ink-dim text-[15px] italic transition-opacity duration-1000 ${runState === 'resolved' ? 'opacity-100' : 'opacity-0'}`}>
            "Pass 5 routes every unresolved record to exceptions for review — it's designed to match nothing on its own."
          </div>

        </div>
      </div>
    </section>
  );
}

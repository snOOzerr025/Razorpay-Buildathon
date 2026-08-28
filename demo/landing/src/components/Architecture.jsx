import React from 'react';

export default function Architecture() {
  return (
    <section id="architecture" className="bg-surface w-full py-32 border-t border-hairline flex justify-center">
      <div className="w-full max-w-[1280px] px-6">
        <h2 className="font-display text-[clamp(32px,4vw,56px)] leading-[1.1] tracking-[-0.02em] text-ink mb-16">
          Architecture
        </h2>

        <div className="bg-void border border-hairline rounded-lg p-12 overflow-x-auto">
          <div className="min-w-[800px] flex items-center justify-between font-mono text-[13px] text-ink-dim tracking-wider uppercase">
            
            {/* Ingestion Layer */}
            <div className="flex flex-col gap-6">
              <div className="border border-hairline px-6 py-4 rounded text-center">Gateway Transactions</div>
              <div className="border border-hairline px-6 py-4 rounded text-center">Bank Settlement Files</div>
              <div className="border border-hairline px-6 py-4 rounded text-center">Merchant Ledger</div>
            </div>

            {/* Arrow */}
            <div className="flex-1 h-px bg-hairline mx-6 relative">
               <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 border-t border-r border-hairline rotate-45"></div>
            </div>

            {/* Matching Engine */}
            <div className="border border-signal text-signal px-8 py-12 rounded flex flex-col items-center bg-signal/5">
              <div className="mb-4 font-display font-semibold">5-Pass Matching Engine</div>
              <ul className="text-left list-disc list-inside opacity-80">
                <li>Exact Match</li>
                <li>Tolerance Normalization</li>
                <li>Refund Linkage</li>
                <li>Subset-Sum Batching</li>
                <li>Exception Routing</li>
              </ul>
            </div>

            {/* Arrows Branching */}
            <div className="flex-1 h-[200px] mx-6 relative">
               {/* Top branch */}
               <div className="absolute top-1/4 left-0 w-full h-px bg-hairline">
                 <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 border-t border-r border-hairline rotate-45"></div>
               </div>
               {/* Bottom branch */}
               <div className="absolute bottom-1/4 left-0 w-full h-px bg-hairline">
                 <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 border-t border-r border-hairline rotate-45"></div>
               </div>
               {/* Vertical connector */}
               <div className="absolute left-0 top-1/4 bottom-1/4 w-px bg-hairline"></div>
            </div>

            {/* Output Layer */}
            <div className="flex flex-col gap-12 justify-between h-[200px]">
              <div className="border border-hairline px-6 py-4 rounded flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-ledger-green"></div>
                Matched / Resolved
              </div>
              <div className="border border-hairline px-6 py-4 rounded flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-exception-amber"></div>
                Exception Queue
                <span className="ml-4 text-xs opacity-50">→ AI Explanation Layer</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}

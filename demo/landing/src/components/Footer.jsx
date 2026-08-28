import React from 'react';
import LivingInvariant from './LivingInvariant';

export default function Footer() {
  return (
    <footer className="bg-surface w-full pt-[120px] relative border-t border-hairline pb-20">
      <div className="w-full max-w-[1280px] px-6 mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
        
        <div className="flex flex-col">
          <span className="font-display font-semibold text-ink text-2xl tracking-tight mb-2">
            Razorpay Recon
          </span>
          <span className="font-body text-ink-dim text-[15px]">
            Built for the Razorpay AI Buildathon, 2026.
          </span>
        </div>

        <div className="flex flex-col items-start md:items-end">
           <a 
            href="https://github.com/snOOzerr025/Razorpay-Buildathon"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink hover:text-signal transition-colors font-body text-[15px] underline underline-offset-4 decoration-hairline hover:decoration-signal"
          >
            GitHub Repository
          </a>
        </div>

      </div>

      <div className="w-full max-w-[1280px] px-6 mx-auto mt-24 flex justify-between font-mono text-[12px] text-ink-dim">
        <span>snOOzerr025/Razorpay-Buildathon</span>
        <span>August 2026</span>
      </div>

      {/* Fixed Mini Invariant Ticker at bottom */}
      <div className="fixed bottom-0 left-0 right-0 h-10 bg-void border-t border-hairline z-50 flex items-center justify-center">
        <div className="scale-[0.5] origin-center -translate-y-2">
           <LivingInvariant isLiveRun={true} hasRun={true} />
        </div>
      </div>
    </footer>
  );
}

import React, { useEffect, useState } from 'react';

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Trigger blur/dark background when scrolled past 90vh
      if (window.scrollY > window.innerHeight * 0.9) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 h-[72px] z-50 flex items-center justify-between px-6 transition-all duration-300 ${
        scrolled ? 'bg-void/85 backdrop-blur-md border-b border-hairline' : 'bg-transparent'
      }`}
    >
      <div className="flex items-center">
        <span className="font-display font-semibold text-ink text-xl tracking-tight">
          Razorpay Recon
        </span>
      </div>

      <div className="hidden md:flex items-center gap-8">
        <a href="#overview" className="text-sm text-ink-dim hover:text-signal transition-colors relative group">
          Overview
          <span className="absolute -bottom-1 left-0 w-0 h-px bg-signal transition-all duration-150 group-hover:w-full"></span>
        </a>
        <a href="#live-run" className="text-sm text-ink hover:text-signal transition-colors relative group">
          Live Run
          <span className="absolute -bottom-1 left-0 w-0 h-px bg-signal transition-all duration-150 group-hover:w-full"></span>
        </a>
        <a href="#exceptions" className="text-sm text-ink-dim hover:text-signal transition-colors relative group">
          Exceptions
          <span className="absolute -bottom-1 left-0 w-0 h-px bg-signal transition-all duration-150 group-hover:w-full"></span>
        </a>
        <a href="#architecture" className="text-sm text-ink-dim hover:text-signal transition-colors relative group">
          Architecture
          <span className="absolute -bottom-1 left-0 w-0 h-px bg-signal transition-all duration-150 group-hover:w-full"></span>
        </a>
        <a href="#github" className="text-sm text-ink-dim hover:text-signal transition-colors relative group">
          GitHub
          <span className="absolute -bottom-1 left-0 w-0 h-px bg-signal transition-all duration-150 group-hover:w-full"></span>
        </a>
      </div>

      <div>
        <button 
          onClick={() => document.getElementById('live-run')?.scrollIntoView({ behavior: 'smooth' })}
          className="bg-signal hover:brightness-110 text-white text-sm font-medium px-5 py-2.5 rounded hover:-translate-y-px transition-all active:translate-y-0"
        >
          Run Reconciliation
        </button>
      </div>
    </nav>
  );
}

import Link from 'next/link'
import MagneticButton from './MagneticButton'

export default function Footer() {
  return (
    <footer className="w-full bg-[#0a0a0a] border-t border-white/10 relative z-10 mt-24">
      {/* Massive CTA Section */}
      <div className="max-w-7xl mx-auto px-6 py-32 flex flex-col items-center text-center">
        <h2 className="text-5xl md:text-7xl font-display font-black text-white tracking-tighter mb-8 max-w-4xl">
          STOP GUESSING. <br />
          <span className="text-[#00E5FF]">START RECONCILING.</span>
        </h2>
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mb-12 font-mono">
          Join the next generation of financial controllers using deterministic AI to eliminate manual reconciliation.
        </p>
        <MagneticButton>
          <Link href="/login" className="px-10 py-5 bg-white text-black font-semibold uppercase tracking-widest text-sm hover:bg-gray-200 transition-colors rounded-sm inline-block">
            Access The Dashboard
          </Link>
        </MagneticButton>
      </div>

      {/* Standard SaaS Footer Links */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="font-display font-bold text-xl tracking-tighter text-white block mb-4">
              PARITY <span className="text-[#00E5FF] font-light">RECON</span>
            </Link>
            <p className="text-gray-500 text-xs font-mono">
              The deterministic three-way reconciliation engine for modern enterprise finance. Built for the Razorpay AI Buildathon.
            </p>
          </div>
          
          <div>
            <h4 className="text-white font-semibold uppercase tracking-widest text-xs mb-6">Product</h4>
            <ul className="flex flex-col gap-4 text-sm text-gray-400">
              <li><Link href="/dashboard" className="hover:text-[#00E5FF] transition-colors">Dashboard</Link></li>
              <li><Link href="/run" className="hover:text-[#00E5FF] transition-colors">Live Run</Link></li>
              <li><Link href="/exceptions" className="hover:text-[#00E5FF] transition-colors">Exception Queue</Link></li>
              <li><Link href="/audit" className="hover:text-[#00E5FF] transition-colors">Audit Trail</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold uppercase tracking-widest text-xs mb-6">Resources</h4>
            <ul className="flex flex-col gap-4 text-sm text-gray-400">
              <li><a href="#" className="hover:text-[#00E5FF] transition-colors">API Documentation</a></li>
              <li><a href="#" className="hover:text-[#00E5FF] transition-colors">Integration Guides</a></li>
              <li><a href="#" className="hover:text-[#00E5FF] transition-colors">Security Whitepaper</a></li>
              <li><a href="#" className="hover:text-[#00E5FF] transition-colors">System Status</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold uppercase tracking-widest text-xs mb-6">Company</h4>
            <ul className="flex flex-col gap-4 text-sm text-gray-400">
              <li><a href="#" className="hover:text-[#00E5FF] transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-[#00E5FF] transition-colors">Contact Sales</a></li>
              <li><a href="#" className="hover:text-[#00E5FF] transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#00E5FF] transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Copyright */}
      <div className="bg-[#050505] py-6 text-center border-t border-white/5">
        <p className="text-gray-600 text-xs font-mono">
          &copy; {new Date().getFullYear()} Parity Recon. All rights reserved. Razorpay AI Buildathon Submission.
        </p>
      </div>
    </footer>
  )
}

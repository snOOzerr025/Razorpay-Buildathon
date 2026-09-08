import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { ArrowRight, Database, FileSpreadsheet, Activity } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center w-full" style={{ backgroundColor: 'var(--bg-base)' }}>
      <NavBar />
      
      <div className="flex-1 w-full max-w-5xl mx-auto px-6 py-24 flex flex-col justify-center gap-12">
        
        {/* Header / Intro */}
        <div className="flex flex-col gap-6 max-w-2xl anim-stagger">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono tracking-widest uppercase"
               style={{ borderColor: 'var(--border-accent)', color: 'var(--accent-primary)', backgroundColor: 'var(--accent-soft)' }}>
            <Activity className="w-4 h-4" />
            Deterministic Matcher
          </div>
          <h1 className="text-5xl lg:text-6xl font-light tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Financial Reconciliation Engine
          </h1>
          <p className="text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            A precision-first 3-way matching engine for gateway transactions, bank settlements, and merchant ledger entries. Designed for real-world datasets with complex split-batch logic and probabilistic exception routing.
          </p>
        </div>

        {/* How it works / Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 anim-stagger" style={{ animationDelay: '0.2s' }}>
          
          <div className="p-6 rounded-xl flex flex-col gap-4 border transition-colors"
               style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" 
                 style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-medium text-lg" style={{ color: 'var(--text-primary)' }}>1. Data Ingestion</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Provide the raw Gateway Transactions and Bank Settlement CSVs. The engine automatically sanitizes and normalizes the incoming data.
            </p>
          </div>

          <div className="p-6 rounded-xl flex flex-col gap-4 border transition-colors"
               style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" 
                 style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-medium text-lg" style={{ color: 'var(--text-primary)' }}>2. Execution Pipeline</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              The 5-pass deterministic engine evaluates exact matches, tolerance bounds, refunds, and bounded subset-sums.
            </p>
          </div>

          <div className="p-6 rounded-xl flex flex-col gap-4 border transition-colors"
               style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" 
                 style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
              <ArrowRight className="w-5 h-5" />
            </div>
            <h3 className="font-medium text-lg" style={{ color: 'var(--text-primary)' }}>3. Output & Review</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Matched records bypass human touch. Residuals are routed to the Exception Queue with an AI-generated explanation for review.
            </p>
          </div>

        </div>

        {/* CTA */}
        <div className="anim-stagger flex items-center gap-4 pt-6" style={{ animationDelay: '0.3s' }}>
          <Link
            href="/run"
            className="px-8 py-4 font-medium rounded-lg flex items-center gap-3 transition-colors shadow-lg"
            style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}
          >
            Launch Engine
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/dashboard"
            className="px-8 py-4 font-medium rounded-lg flex items-center gap-3 border transition-colors"
            style={{ backgroundColor: 'transparent', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            View Dashboard
          </Link>
        </div>

      </div>

      <Footer />
    </main>
  );
}

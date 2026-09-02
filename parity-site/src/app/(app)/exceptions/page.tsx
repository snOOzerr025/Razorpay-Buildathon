'use client'

import { useState } from 'react'
import { mockExceptions } from '@/lib/mock-data'
import { Check, X, ShieldAlert, FileText, ArrowRight, Activity, Zap, CheckCircle2 } from 'lucide-react'

export default function ExceptionsPage() {
  const [exceptions, setExceptions] = useState(mockExceptions)

  const handleAction = (id: string, action: 'approve' | 'reject') => {
    setExceptions(prev => prev.filter(e => e.id !== id))
    // In a real app, this would trigger an API call to post the compensating entry or escalate.
  }

  if (exceptions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-32 text-center">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-light text-white mb-2">Queue Cleared</h2>
        <p className="text-gray-400">All exceptions have been reviewed and resolved.</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light text-white mb-2 tracking-tight flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-amber-500" />
            Human-in-the-Loop Review
          </h1>
          <p className="text-gray-400 text-sm">
            {exceptions.length} actionable exceptions requiring manual verification before posting.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {exceptions.map(exc => (
          <ExceptionCard key={exc.id} exc={exc} onAction={handleAction} />
        ))}
      </div>
    </div>
  )
}

function ExceptionCard({ exc, onAction }: { exc: any, onAction: (id: string, action: 'approve' | 'reject') => void }) {
  return (
    <div className="bg-[#09090b] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="bg-[#18181b] border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono text-gray-300 font-medium">EXCEPTION #{exc.id}</span>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium tracking-wide uppercase">
            {exc.aiExplanation.match_decision}
          </span>
        </div>
        <div className="text-gray-500 text-sm font-mono">{new Date(exc.date).toLocaleString()}</div>
      </div>

      <div className="p-6">
        {/* Discrepancy View */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Gateway Transaction
            </h3>
            <div className="bg-[#18181b] rounded-lg p-4 font-mono text-sm border border-white/5">
              <div className="flex justify-between mb-2"><span className="text-gray-500">ID:</span> <span className="text-gray-200">{exc.payload.gateway_transaction.id}</span></div>
              <div className="flex justify-between mb-2"><span className="text-gray-500">Date:</span> <span className="text-gray-200">{new Date(exc.payload.gateway_transaction.date).toLocaleDateString()}</span></div>
              <div className="flex justify-between mb-2"><span className="text-gray-500">Vendor Ref:</span> <span className="text-gray-200 truncate ml-4">{exc.payload.gateway_transaction.vendor_reference}</span></div>
              <div className="flex justify-between mt-4 pt-4 border-t border-white/5"><span className="text-gray-500">Gross Amount:</span> <span className="text-white font-bold">₹{exc.payload.gateway_transaction.amount}</span></div>
            </div>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Bank Settlement (Candidate)
            </h3>
            <div className="bg-[#18181b] rounded-lg p-4 font-mono text-sm border border-white/5">
              <div className="flex justify-between mb-2"><span className="text-gray-500">ID:</span> <span className="text-gray-200">{exc.payload.bank_settlement.id}</span></div>
              <div className="flex justify-between mb-2"><span className="text-gray-500">Date:</span> <span className="text-gray-200">{new Date(exc.payload.bank_settlement.date).toLocaleDateString()}</span></div>
              <div className="flex justify-between mb-2"><span className="text-gray-500">Narration:</span> <span className="text-gray-200 truncate ml-4" title={exc.payload.bank_settlement.narration}>{exc.payload.bank_settlement.narration}</span></div>
              <div className="flex justify-between mt-4 pt-4 border-t border-white/5"><span className="text-gray-500">Net Settled:</span> <span className="text-white font-bold">₹{exc.payload.bank_settlement.amount}</span></div>
            </div>
          </div>
        </div>

        {/* AI Analysis */}
        <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-5 mb-8">
          <h3 className="text-blue-400 font-medium mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" /> AI Investigator Analysis
          </h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li><strong className="text-gray-400 font-medium">Root Cause:</strong> {exc.aiExplanation.root_cause}</li>
            <li><strong className="text-gray-400 font-medium">Reasoning:</strong> {exc.aiExplanation.explanation}</li>
            <li><strong className="text-gray-400 font-medium">Semantic Confidence:</strong> {(exc.aiExplanation.semantic_confidence * 100).toFixed(1)}%</li>
            <li>
              <strong className="text-gray-400 font-medium">Equation Verifier:</strong> 
              {exc.aiExplanation.math_verified ? (
                <span className="text-emerald-400 ml-2 inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Passed (Math balances exactly)</span>
              ) : (
                <span className="text-red-400 ml-2">Failed (Math does not balance)</span>
              )}
            </li>
          </ul>
        </div>

        {/* Compensating Entry Recommendation */}
        {exc.aiExplanation.compensating_entry && (exc.aiExplanation.compensating_entry.debit.length > 0 || exc.aiExplanation.compensating_entry.credit.length > 0) && (
          <div className="mb-8">
            <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Proposed Compensating Journal Entry</h3>
            <div className="bg-[#18181b] border border-white/5 rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-gray-500 border-b border-white/5">
                    <th className="pb-2 font-medium">Account</th>
                    <th className="pb-2 font-medium text-right">Debit</th>
                    <th className="pb-2 font-medium text-right">Credit</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  {exc.aiExplanation.compensating_entry.debit.map((d: any, i: number) => (
                    <tr key={`d-${i}`}>
                      <td className="py-2 pl-4">{d.account}</td>
                      <td className="py-2 text-right">₹{d.amount}</td>
                      <td className="py-2 text-right"></td>
                    </tr>
                  ))}
                  {exc.aiExplanation.compensating_entry.credit.map((c: any, i: number) => (
                    <tr key={`c-${i}`}>
                      <td className="py-2 pl-12">{c.account}</td>
                      <td className="py-2 text-right"></td>
                      <td className="py-2 text-right">₹{c.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-white/5 pt-6">
          <div className="text-sm text-gray-400">
            <span className="text-gray-500">Agent Recommendation:</span> {exc.aiExplanation.agent_recommendation}
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onAction(exc.id, 'reject')}
              className="px-5 py-2.5 rounded-md border border-white/10 hover:bg-white/5 text-gray-300 font-medium transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" /> Reject / Manual Audit
            </button>
            <button 
              onClick={() => onAction(exc.id, 'approve')}
              className="px-5 py-2.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-medium transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" /> Approve & Post Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

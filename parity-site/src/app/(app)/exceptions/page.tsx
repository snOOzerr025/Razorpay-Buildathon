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
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{ backgroundColor: 'var(--success-soft)' }}>
          <CheckCircle2 className="w-10 h-10" style={{ color: 'var(--success)' }} />
        </div>
        <h2 className="text-2xl font-light mb-2" style={{ color: 'var(--text-primary)' }}>Queue Cleared</h2>
        <p style={{ color: 'var(--text-muted)' }}>All exceptions have been reviewed and resolved.</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between anim-stagger">
        <div>
          <h1 className="text-3xl font-light mb-2 tracking-tight flex items-center gap-3"
            style={{ color: 'var(--text-primary)' }}>
            <ShieldAlert className="w-8 h-8" style={{ color: 'var(--danger-bright)' }} />
            Human-in-the-Loop Review
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {exceptions.length} actionable exceptions requiring manual verification before posting.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {exceptions.map((exc, i) => (
          <div key={exc.id} className="anim-stagger" style={{ animationDelay: `${i * 0.1}s` }}>
            <ExceptionCard exc={exc} onAction={handleAction} isFirst={i === 0} />
          </div>
        ))}
      </div>
    </div>
  )
}

function ExceptionCard({ exc, onAction, isFirst }: { exc: any, onAction: (id: string, action: 'approve' | 'reject') => void, isFirst: boolean }) {
  return (
    <div
      className={`rounded-xl overflow-hidden card-hover ${isFirst ? 'exception-pulse' : ''}`}
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-elevated)',
      }}
    >
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between"
        style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <span className="font-mono font-medium" style={{ color: 'var(--text-secondary)' }}>
            EXCEPTION #{exc.id}
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide uppercase"
            style={{
              backgroundColor: 'var(--danger-soft)',
              border: '1px solid var(--danger)',
              color: 'var(--danger-bright)',
            }}>
            {exc.aiExplanation.match_decision}
          </span>
        </div>
        <div className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
          {new Date(exc.date).toLocaleString()}
        </div>
      </div>

      <div className="p-6">
        {/* Discrepancy View */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-xs uppercase tracking-widest mb-3 flex items-center gap-2"
              style={{ color: 'var(--text-muted)' }}>
              <FileText className="w-4 h-4" /> Gateway Transaction
            </h3>
            <div className="rounded-lg p-4 font-mono text-sm"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div className="flex justify-between mb-2">
                <span style={{ color: 'var(--text-muted)' }}>ID:</span>
                <span style={{ color: 'var(--text-secondary)' }}>{exc.payload.gateway_transaction.id}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span style={{ color: 'var(--text-muted)' }}>Date:</span>
                <span style={{ color: 'var(--text-secondary)' }}>{new Date(exc.payload.gateway_transaction.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span style={{ color: 'var(--text-muted)' }}>Vendor Ref:</span>
                <span className="truncate ml-4" style={{ color: 'var(--text-secondary)' }}>{exc.payload.gateway_transaction.vendor_reference}</span>
              </div>
              <div className="flex justify-between mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Gross Amount:</span>
                <span className="font-bold" style={{ color: 'var(--text-sandy)' }}>₹{exc.payload.gateway_transaction.amount}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-widest mb-3 flex items-center gap-2"
              style={{ color: 'var(--text-muted)' }}>
              <Activity className="w-4 h-4" /> Bank Settlement (Candidate)
            </h3>
            <div className="rounded-lg p-4 font-mono text-sm"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div className="flex justify-between mb-2">
                <span style={{ color: 'var(--text-muted)' }}>ID:</span>
                <span style={{ color: 'var(--text-secondary)' }}>{exc.payload.bank_settlement.id}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span style={{ color: 'var(--text-muted)' }}>Date:</span>
                <span style={{ color: 'var(--text-secondary)' }}>{new Date(exc.payload.bank_settlement.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span style={{ color: 'var(--text-muted)' }}>Narration:</span>
                <span className="truncate ml-4" style={{ color: 'var(--text-secondary)' }} title={exc.payload.bank_settlement.narration}>
                  {exc.payload.bank_settlement.narration}
                </span>
              </div>
              <div className="flex justify-between mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Net Settled:</span>
                <span className="font-bold" style={{ color: 'var(--text-sandy)' }}>₹{exc.payload.bank_settlement.amount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Analysis */}
        <div className="rounded-lg p-5 mb-8"
          style={{ backgroundColor: 'var(--info-soft)', border: '1px solid var(--info)' }}>
          <h3 className="font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--info)' }}>
            <Zap className="w-4 h-4" /> AI Investigator Analysis
          </h3>
          <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <li><strong style={{ color: 'var(--text-muted)' }}>Root Cause:</strong> {exc.aiExplanation.root_cause}</li>
            <li><strong style={{ color: 'var(--text-muted)' }}>Reasoning:</strong> {exc.aiExplanation.explanation}</li>
            <li><strong style={{ color: 'var(--text-muted)' }}>Semantic Confidence:</strong> {(exc.aiExplanation.semantic_confidence * 100).toFixed(1)}%</li>
            <li>
              <strong style={{ color: 'var(--text-muted)' }}>Equation Verifier:</strong>
              {exc.aiExplanation.math_verified ? (
                <span className="ml-2 inline-flex items-center gap-1" style={{ color: 'var(--success)' }}>
                  <CheckCircle2 className="w-3 h-3"/> Passed (Math balances exactly)
                </span>
              ) : (
                <span className="ml-2" style={{ color: 'var(--danger-bright)' }}>Failed (Math does not balance)</span>
              )}
            </li>
          </ul>
        </div>

        {/* Compensating Entry Recommendation */}
        {exc.aiExplanation.compensating_entry && (exc.aiExplanation.compensating_entry.debit.length > 0 || exc.aiExplanation.compensating_entry.credit.length > 0) && (
          <div className="mb-8">
            <h3 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
              Proposed Compensating Journal Entry
            </h3>
            <div className="rounded-lg p-4 font-mono text-sm overflow-x-auto"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <table className="w-full text-left">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="pb-2 font-medium" style={{ color: 'var(--text-muted)' }}>Account</th>
                    <th className="pb-2 font-medium text-right" style={{ color: 'var(--text-muted)' }}>Debit</th>
                    <th className="pb-2 font-medium text-right" style={{ color: 'var(--text-muted)' }}>Credit</th>
                  </tr>
                </thead>
                <tbody style={{ color: 'var(--text-secondary)' }}>
                  {exc.aiExplanation.compensating_entry.debit.map((d: any, i: number) => (
                    <tr key={`d-${i}`}>
                      <td className="py-2 pl-4">{d.account}</td>
                      <td className="py-2 text-right" style={{ color: 'var(--text-sandy)' }}>₹{d.amount}</td>
                      <td className="py-2 text-right"></td>
                    </tr>
                  ))}
                  {exc.aiExplanation.compensating_entry.credit.map((c: any, i: number) => (
                    <tr key={`c-${i}`}>
                      <td className="py-2 pl-12">{c.account}</td>
                      <td className="py-2 text-right"></td>
                      <td className="py-2 text-right" style={{ color: 'var(--text-sandy)' }}>₹{c.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-6" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Agent Recommendation:</span> {exc.aiExplanation.agent_recommendation}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onAction(exc.id, 'reject')}
              className="px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors"
              style={{
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                backgroundColor: 'transparent',
              }}
            >
              <X className="w-4 h-4" /> Reject / Manual Audit
            </button>
            <button
              onClick={() => onAction(exc.id, 'approve')}
              className="px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors"
              style={{
                backgroundColor: 'var(--success)',
                color: '#fff',
              }}
            >
              <Check className="w-4 h-4" /> Approve & Post Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

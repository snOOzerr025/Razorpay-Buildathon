import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import ExceptionDrawer from './ExceptionDrawer';

const EXCEPTION_DATA = [
  {
    id: 'e1',
    category: 'missing_settlement',
    count: 14205,
    netValue: 428500.00,
    payload: { txn_id: 'pay_Lkj98x', amount: 500.00, gateway_status: 'captured', settlement_status: null },
    explanation: "Gateway reports transaction captured on T-1, but no corresponding settlement row exists in the daily bank file. Probable T+2 delay. Recommended action: Route to auto-retry queue for next 48h."
  },
  {
    id: 'e2',
    category: 'fee_mismatch',
    count: 8192,
    netValue: 1245.50,
    payload: { txn_id: 'pay_Mno12y', gateway_fee: 10.00, bank_fee: 10.50, diff: -0.50 },
    explanation: "Bank deducted higher fee than gateway schedule. Common artifact of cross-border currency conversion margins applied post-authorization. Threshold acceptable. Recommended action: Post balancing entry to FX_LOSS."
  },
  {
    id: 'e3',
    category: 'transaction_error',
    count: 218,
    netValue: 98000.00,
    payload: { txn_id: 'pay_Pqr34z', error_code: 'BAD_REQUEST', state: 'failed' },
    explanation: "Hard failure during payment capture. Amount was likely debited from customer but not recognized by gateway. High risk of chargeback. Recommended action: Escalate to Level 2 manual review."
  }
];

export default function ExceptionTable() {
  const [selectedException, setSelectedException] = useState(null);

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  const formatCount = (val) => new Intl.NumberFormat('en-US').format(val);

  return (
    <section id="exceptions" className="bg-void w-full py-32 border-t border-hairline flex justify-center">
      <div className="w-full max-w-[1280px] px-6">
        <h2 className="font-display text-[clamp(32px,4vw,56px)] leading-[1.1] tracking-[-0.02em] text-ink mb-12">
          Exception Queue
        </h2>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-hairline">
                <th className="py-4 px-4 font-body text-ink-dim uppercase tracking-wider text-xs font-semibold w-1/3">Category</th>
                <th className="py-4 px-4 font-body text-ink-dim uppercase tracking-wider text-xs font-semibold w-1/4">Count</th>
                <th className="py-4 px-4 font-body text-ink-dim uppercase tracking-wider text-xs font-semibold text-right w-1/3">Net Value</th>
                <th className="py-4 px-4 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {EXCEPTION_DATA.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-ink-dim font-body">
                    No open items in this category. Every record here is accounted for.
                  </td>
                </tr>
              ) : (
                EXCEPTION_DATA.map((row) => (
                  <tr 
                    key={row.id} 
                    onClick={() => setSelectedException(row)}
                    className="border-b border-hairline hover:bg-surface/50 cursor-pointer transition-colors group"
                  >
                    <td className="py-6 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded text-xs font-mono font-medium ${
                        row.category === 'transaction_error' 
                          ? 'bg-exception-red/10 text-exception-red'
                          : 'bg-exception-amber/10 text-exception-amber'
                      }`}>
                        {row.category}
                      </span>
                    </td>
                    <td className="py-6 px-4 font-mono text-ink text-[15px] tabular-nums">
                      {formatCount(row.count)}
                    </td>
                    <td className="py-6 px-4 font-mono text-ink text-[15px] tabular-nums text-right">
                      {formatCurrency(row.netValue)}
                    </td>
                    <td className="py-6 px-4 text-right text-ink-dim group-hover:text-signal transition-colors">
                      <ChevronRight size={20} className="inline" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ExceptionDrawer 
        isOpen={!!selectedException} 
        onClose={() => setSelectedException(null)} 
        data={selectedException} 
      />
    </section>
  );
}

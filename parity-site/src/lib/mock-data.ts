export type ExceptionCategory = 'Typo / Semantic Drift' | 'Bank-initiated' | 'Ambiguous Roll-up' | 'Timing difference' | 'Transaction error';
export type ExceptionStatus = 'Open' | 'Reviewed' | 'Escalated' | 'Posted';

export interface Exception {
  id: string;
  category: ExceptionCategory;
  amount: string;
  status: ExceptionStatus;
  date: string;
  payload: any;
  aiExplanation: {
    semantic_confidence: number;
    match_decision: string;
    explanation: string;
    root_cause?: string;
    agent_recommendation?: string;
    math_verified?: boolean;
    compensating_entry?: {
      debit: { account: string, amount: string }[];
      credit: { account: string, amount: string }[];
    }
  };
}

export const mockExceptions: Exception[] = [
  {
    id: "EX-042",
    category: "Bank-initiated",
    amount: "24410.00",
    status: "Open",
    date: "2026-08-28T09:15:00Z",
    payload: {
      gateway_transaction: {
        id: "TXN_88492",
        amount: "25000.00",
        date: "2026-08-27T14:30:00Z",
        vendor_reference: "Acme Corp Services"
      },
      bank_settlement: {
        id: "BK_99321",
        amount: "24410.00",
        date: "2026-08-28T09:15:00Z",
        narration: "NEFT/ACME/SETTLEMENT"
      }
    },
    aiExplanation: {
      semantic_confidence: 0.94,
      match_decision: "Tier 3: HITL Review Required",
      root_cause: "Standard 2.0% MDR fee (₹500) + 18% GST (₹90)",
      explanation: "Amount Variance: -₹590.00. The AI investigator hypothesizes this is a standard fee deduction. The deterministic equation verifier passed: Gross (25000) - Fee (500) - Tax (90) == Bank Net (24410).",
      agent_recommendation: "Match as settlement with ₹590 fee adjustment. Post compensating entry to Payment Processing Fees.",
      math_verified: true,
      compensating_entry: {
        debit: [
          { account: "5120 (Payment Processing Fees)", amount: "500.00" },
          { account: "5125 (Input GST on Fees)", amount: "90.00" }
        ],
        credit: [
          { account: "1020 (Bank Clearing Account)", amount: "590.00" }
        ]
      }
    }
  },
  {
    id: "EX-089",
    category: "Typo / Semantic Drift",
    amount: "1450.00",
    status: "Open",
    date: "2026-08-28T10:15:00Z",
    payload: {
      gateway_transaction: {
        id: "TXN_29910",
        amount: "1450.00",
        date: "2026-08-27T14:30:00Z",
        vendor_reference: "AWS Cloud Services India"
      },
      bank_settlement: {
        id: "BK_99321",
        amount: "1450.00",
        date: "2026-08-28T09:15:00Z",
        narration: "NEFT/AMAZON WEB SVS IND/AWS9302"
      }
    },
    aiExplanation: {
      semantic_confidence: 0.98,
      match_decision: "Tier 2: HOTL Eligible",
      root_cause: "Semantic match on Vendor Name abbreviation",
      explanation: "High confidence semantic match. The bank settlement narration 'AMAZON WEB SVS IND' is a known abbreviation for 'AWS Cloud Services India'.",
      agent_recommendation: "Approve 1:1 match. No variance detected.",
      math_verified: true,
      compensating_entry: {
        debit: [],
        credit: []
      }
    }
  },
  {
    id: "EX-112",
    category: "Timing difference",
    amount: "8500.00",
    status: "Open",
    date: "2026-08-29T11:00:00Z",
    payload: {
      gateway_transaction: {
        id: "TXN_44921",
        amount: "8500.00",
        date: "2026-08-25T16:45:00Z",
        vendor_reference: "Weekend Sale Promo"
      },
      bank_settlement: {
        id: "BK_33912",
        amount: "8500.00",
        date: "2026-08-29T11:00:00Z",
        narration: "UPI/SETTLE/WKND"
      }
    },
    aiExplanation: {
      semantic_confidence: 0.88,
      match_decision: "Tier 3: HITL Review Required",
      root_cause: "T+4 Settlement Delay (Weekend/Holiday)",
      explanation: "Amount matches exactly, but settlement occurred on T+4 instead of T+1. The transaction date (Aug 25) was a Friday, and settlement occurred Tuesday.",
      agent_recommendation: "Approve 1:1 match. Acknowledge timing delay.",
      math_verified: true,
      compensating_entry: {
        debit: [],
        credit: []
      }
    }
  }
];

export const mockRuns: any[] = [];
export const progressiveRunData = {
  events: []
};

# AI Semantic Layer — Exception Explanation Samples

*This document demonstrates the exact inputs provided to the LLM (acting as the semantic AI layer) for records that the deterministic matching engine routes to the exception queue, alongside the AI-generated human-readable explanations required for Tier-3 (HITL) manual approval.*

---

## 1. Typo / Semantic Drift (Fellegi-Sunter Candidate)

**Scenario:** The deterministic engine (Pass 1 & 2) rejected a match because the vendor name from the bank remittance string significantly drifted from the merchant ledger's expected name, failing exact string matching.

### **LLM Input (Sanitized Payload)**
```json
{
  "context": "Evaluate candidate match for exception routing.",
  "gateway_transaction": {
    "id": "tx_29910",
    "amount": "1450.00",
    "date": "2026-08-27T14:30:00Z",
    "vendor_reference": "AWS Cloud Services India"
  },
  "bank_settlement": {
    "id": "bk_99321",
    "amount": "1450.00",
    "date": "2026-08-28T09:15:00Z",
    "narration": "NEFT/AMAZON WEB SVS IND/AWS9302"
  }
}
```

### **LLM Output (Explanation Draft for HITL Dashboard)**
```json
{
  "semantic_confidence": 0.94,
  "match_decision": "Draft for HITL Review",
  "explanation": "High confidence semantic match. The bank settlement narration 'AMAZON WEB SVS IND' is a known abbreviation for 'AWS Cloud Services India'. The exact net amount (INR 1450.00) matches precisely, and the settlement occurred on T+1, which aligns with expected timing logic. Recommended action: Approve match."
}
```

---

## 2. Bank-Initiated Deduction

**Scenario:** A bank statement contains a debit that does not correspond to any known gateway transaction.

### **LLM Input (Sanitized Payload)**
```json
{
  "context": "Categorize unmatched bank settlement.",
  "bank_settlement": {
    "id": "bk_99405",
    "amount": "-250.00",
    "date": "2026-08-28T11:00:00Z",
    "narration": "MONTHLY ACC MAINT CHG"
  }
}
```

### **LLM Output (Explanation Draft for HITL Dashboard)**
```json
{
  "semantic_confidence": 0.98,
  "match_decision": "Categorize as Bank-Initiated Exception",
  "explanation": "This record has no corresponding gateway transaction because it is a bank-initiated deduction. The narration 'MONTHLY ACC MAINT CHG' semantically maps to standard account maintenance fees. Recommended action: Post as an operational expense via a compensating journal entry, do not attempt to reconcile against gateway captures."
}
```

---

## 3. Ambiguous Roll-up (Pass 4 State-Cap Abort)

**Scenario:** Pass 4 hit its 50,000 DP state-cap because the bank batched too many identical gateway transactions together, making it mathematically ambiguous to deterministically map which specific gateway records belong to this exact batch.

### **LLM Input (Sanitized Payload)**
```json
{
  "context": "Provide explanation for Pass 4 bounded abort.",
  "bank_settlement": {
    "id": "bk_99500",
    "amount": "45000.00",
    "date": "2026-08-28T16:00:00Z",
    "narration": "RAZORPAY SETTLEMENT BATCH 882"
  },
  "unmatched_gateway_count": 894,
  "gateway_average_amount": "50.00"
}
```

### **LLM Output (Explanation Draft for HITL Dashboard)**
```json
{
  "semantic_confidence": 1.0,
  "match_decision": "Exception - Ambiguous Roll-up",
  "explanation": "The matching engine successfully verified that this bank batch (INR 45,000.00) is a subset sum of the 894 pending gateway transactions, but halted deterministic linking because there are multiple valid groupings (exceeding the 50,000 state safety cap). The ambiguity arises from hundreds of identical INR 50.00 transactions. Recommended action: Wait for the subsequent bank batch to arrive to isolate the remaining pool, or approve block-level reconciliation rather than record-level linkage."
}
```

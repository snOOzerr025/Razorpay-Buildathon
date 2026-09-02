import { STATS } from './stats';

export interface QAPair {
  question: string;
  answer: string | (() => string);
}

export const knowledgeBase: QAPair[] = [
  {
    question: "What's our current match rate?",
    answer: () => `The current automated match rate is ${STATS.automatedMatchRate}% across ${STATS.recordsProcessed.toLocaleString()} records processed.`
  },
  {
    question: "Why is Pass 5 at 0%?",
    answer: "Pass 5 is the AI & Exception Routing pass. It shows 0% because it intentionally routes ambiguous matches to the exception queue for Tier-3 (HITL) review rather than forcing a deterministic match. It's designed to surface uncertainty, not resolve it blindly."
  },
  {
    question: "Explain Pass 4",
    answer: "Pass 4 is the Roll-up pass. It uses a subset-sum algorithm to identify cases where many gateway transactions were batched into a single bank credit. Without this pass, every batched settlement would incorrectly trigger an exception."
  },
  {
    question: "What happens when I approve a match?",
    answer: "When you approve a match, the engine posts a compensating journal entry to the ledger and writes an immutable record to the Audit Trail. We never destructively update or delete posted ledger rows."
  },
  {
    question: "What does HITL mean?",
    answer: "HITL stands for Human-in-the-Loop. It is our Tier-3 risk gate, requiring explicit human approval before any database write occurs for complex or ambiguous matches."
  },
  {
    question: "What is a compensating entry?",
    answer: "A compensating entry is a new ledger row created to correct or adjust a balance, rather than modifying an existing committed row. This ensures the ledger remains append-only and fully auditable."
  }
];

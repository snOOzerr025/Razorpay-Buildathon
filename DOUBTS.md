# DOUBTS.md — Q&A Journal

This is different from `interview.md`: that file is prep material *for the panel*. This one is for
you — a record of what you actually got stuck on, asked about, and how it got resolved, in your own
words where possible. The point is fluency: after enough entries, you should be able to explain any
of these out loud without looking at this file. If you can't, that's the entry to revisit before
the interview, not skip.

Format: **What I asked / got stuck on → What happened → What I actually understand now.** Keep the
third field honest and in first person — "I now get that..." not a copy of an explanation. If you
still don't fully get something after the fix, say so — an open doubt marked honestly is more
useful later than a resolved one you don't actually understand.

---

### Doubt 1 — Is it safe to describe error recovery as "rolling back the database"?
**What happened**: The reconciliation spec (both my original blueprint and the deeper Gemini
research pass) described SHIELDA's recovery stage as "rolling back database state" without
qualification. Flagged this as ambiguous rather than accepting it as written.
**Resolution**: There are two different things both loosely called rollback — an uncommitted
transaction can be rolled back safely (standard, reversible), but an already-posted financial
record can never be destructively edited; it needs a compensating entry that references the
original instead, so the audit trail stays intact.
**What I actually understand now**: `[fill in your own words after you've built the compensating-entries table and actually hit this case in code]`

### Doubt 2 — Does a 2-pass matcher (exact + tolerance) actually cover a payment gateway's real cases?
**What happened**: The original blueprint had 2 deterministic passes. Cross-checked against a
second, independent research pass and against the actual domain (Razorpay settles in *batches*,
and refunds/chargebacks are separate transaction records).
**Resolution**: Added Pass 3 (refund/reversal linkage) and Pass 4 (split/roll-up, subset-sum
matching for batched settlements) — without Pass 4 specifically, every normal batched settlement
would show up as a false exception, which would make a working system look broken in the demo.
**What I actually understand now**: `[fill in once you've implemented Pass 4 and seen it work against real batch data]`

### Doubt 3 — `[next real doubt goes here]`
**What happened**:
**Resolution**:
**What I actually understand now**:

---

## How to use this well
- Add an entry the moment something confuses you or breaks — not at the end of the day from memory.
- Revisit entries a few days later and try explaining them out loud before checking what you wrote.
- The "what I actually understand now" field is the one that matters for the interview — an entry
  with that field left blank is a sign you resolved the *symptom* but not the *concept*, which is
  exactly the kind of gap a panel follow-up question will find.

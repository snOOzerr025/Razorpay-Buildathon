"""
src.matching — Deterministic 5-pass reconciliation engine.

Module layout
-------------
types.py        — Shared dataclasses / enums (MatchResult, MatchTier, etc.)
passes/
  pass1.py      — Exact match (HOOTL)
  pass2.py      — Tolerance-aware net-amount match (HOOTL)
  pass3.py      — Refund / reversal linkage (HOTL)
  pass4.py      — Split / roll-up subset-sum (HOTL)
  pass5.py      — Route residuals to exception queue
engine.py       — Orchestrator: runs passes in order, feeds unmatched forward

Public API
----------
    from src.matching.engine import run_matching_pass
"""

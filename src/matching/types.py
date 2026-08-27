"""
Shared types for the deterministic matching engine.

Every pass produces ``MatchCandidate`` objects.  The engine assembles them
into ``MatchResult`` rows and writes those to the ``matches`` and
``match_members`` tables, plus a mandatory ``audit_log`` row.

Design notes
------------
* ``confidence_score`` is ``None`` for all deterministic passes (1–4).
  The field only carries a value for Fellegi-Sunter / semantic results.
  Do NOT fabricate a numeric score for exact or tolerance matches —
  that would misrepresent the nature of the decision (AGENTS.md rule 1).

* ``tier`` follows the table in docs/04_MATCHING_ENGINE_SPEC.md §5 exactly:
  - Pass 1 / Pass 2 → HOOTL (auto-posts immediately)
  - Pass 3 / Pass 4 → HOTL  (auto-prepared, override window)
  - Probabilistic / semantic → HOTL or HITL (score-dependent)
  - Below threshold / unresolved → HITL (stays in exception queue)

* ``match_explanation`` is always a structured dict, never a free-form
  string.  Its schema is defined in docs/03_DATA_MODEL.md §6.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from enum import Enum
from typing import Any


class MatchPass(str, Enum):
    PASS1_EXACT         = "pass1_exact"
    PASS2_TOLERANCE     = "pass2_tolerance"
    PASS3_REFUND        = "pass3_refund"
    PASS4_SPLIT         = "pass4_split"
    FELLEGI_SUNTER      = "fellegi_sunter"
    SEMANTIC_EMBEDDING  = "semantic_embedding"


class MatchTier(str, Enum):
    HOOTL = "hootl"   # Hands-Off-On-The-Loop: auto-posts + logs, no human needed
    HOTL  = "hotl"    # Hands-On-The-Loop: auto-prepared, override window
    HITL  = "hitl"    # Human-In-The-Loop: explicit approval required


class RecordType(str, Enum):
    CANONICAL_TRANSACTION = "canonical_transaction"
    BANK_SETTLEMENT       = "bank_settlement"
    MERCHANT_LEDGER       = "merchant_ledger"


class ExceptionCategory(str, Enum):
    TIMING_DIFFERENCE  = "timing_difference"
    TRANSACTION_ERROR  = "transaction_error"
    BANK_INITIATED     = "bank_initiated"
    UNRESOLVED         = "unresolved"


@dataclass
class MatchMember:
    """One side of a match — a reference to a specific record."""
    record_type: RecordType
    record_id: int


@dataclass
class MatchCandidate:
    """
    A proposed match produced by one deterministic pass.

    Not yet written to the DB — the engine validates and persists these.

    Attributes
    ----------
    matched_pass:
        Which pass produced this candidate.
    tier:
        Approval tier (HOOTL / HOTL / HITL).
    members:
        The records that form this match group (at least 2).
    explanation:
        Structured dict conforming to docs/03_DATA_MODEL.md §6.
        Must always be present — never an empty dict.
    confidence_score:
        None for deterministic passes.  Decimal in [0,1] for probabilistic.
    """
    matched_pass: MatchPass
    tier: MatchTier
    members: list[MatchMember]
    explanation: dict[str, Any]
    confidence_score: Decimal | None = None

    def __post_init__(self) -> None:
        if len(self.members) < 2:
            raise ValueError(
                f"MatchCandidate must have at least 2 members, got {len(self.members)}"
            )
        if not self.explanation:
            raise ValueError("MatchCandidate.explanation must not be empty")
        if self.confidence_score is not None:
            if not (Decimal("0") <= self.confidence_score <= Decimal("1")):
                raise ValueError(
                    f"confidence_score must be in [0,1], got {self.confidence_score}"
                )


@dataclass
class UnmatchedRecord:
    """
    A record that survived all applicable passes without a match.

    Handed to Pass 5 for classification and exception-queue insertion.
    """
    record_type: RecordType
    record_id: int
    dollar_value: Decimal          # amount for risk-tiering in the exception queue
    suggested_category: ExceptionCategory = ExceptionCategory.UNRESOLVED


@dataclass
class PassResult:
    """
    Output of one matching pass.

    Attributes
    ----------
    pass_name:
        Which pass produced this result.
    candidates:
        Proposed matches to be written to the DB.
    unmatched_gateway_ids:
        gateway canonical_transaction ids still unmatched after this pass.
    unmatched_bank_ids:
        bank_settlement ids still unmatched after this pass.
    unmatched_ledger_ids:
        merchant_ledger_entry ids still unmatched after this pass.
    stats:
        Arbitrary key-value stats for the dashboard / reporting template
        (docs/07 §4).  Must include at least ``matched_count``.
    """
    pass_name: MatchPass
    candidates: list[MatchCandidate] = field(default_factory=list)
    unmatched_gateway_ids: set[int] = field(default_factory=set)
    unmatched_bank_ids: set[int] = field(default_factory=set)
    unmatched_ledger_ids: set[int] = field(default_factory=set)
    stats: dict[str, Any] = field(default_factory=dict)

    @property
    def matched_count(self) -> int:
        return len(self.candidates)

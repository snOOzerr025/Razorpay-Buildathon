"""
AI Investigation Layer (Role 1, 2, 3 Loop)

Role 1: Compute hard facts deterministically.
Role 2: AI Investigator (Rule-based heuristic default, OpenAI optional).
Role 3: Verifier (Deterministically re-checks AI claims).
"""

import json
import logging
import os
from dataclasses import dataclass, asdict
from decimal import Decimal
from typing import Any, Literal
from datetime import date

from src.matching.probabilistic.sanitize import sanitize_text

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

@dataclass
class HardFacts:
    amount_diff: str
    date_diff: int
    reference_similarity: float
    fee_equation_result: str
    settlement_window_status: str

@dataclass
class InvestigationResult:
    likely_explanation: str
    evidence: list[str]
    confidence: Literal["HIGH", "MEDIUM", "LOW"]
    action: Literal["RESOLVE", "NEEDS_REVIEW", "UNRESOLVED"]
    claimed_equation: str

@dataclass
class VerificationResult:
    passed: bool
    equation_check: str
    final_action: Literal["RESOLVE", "NEEDS_REVIEW", "UNRESOLVED"]


# ---------------------------------------------------------------------------
# Role 1: Hard Facts Computation (Deterministic)
# ---------------------------------------------------------------------------

def compute_hard_facts(gw: dict, bank: dict) -> HardFacts:
    """Compute mathematical boundaries and facts for an exception pair."""
    try:
        gw_net = Decimal(str(gw.get("expected_net_amount") or gw.get("gross_amount", "0")))
    except Exception:
        gw_net = Decimal("0")

    try:
        bank_net = Decimal(str(bank.get("net_amount", "0")))
    except Exception:
        bank_net = Decimal("0")

    amount_diff = str((bank_net - gw_net).quantize(Decimal("0.01")))

    gw_date = _to_date(gw.get("transaction_ts", "2000-01-01"))
    bank_date = _to_date(bank.get("value_date", "2000-01-01"))
    date_diff = (bank_date - gw_date).days

    if 0 <= date_diff <= 3:
        settlement_window = "WITHIN_WINDOW"
    elif date_diff > 3:
        settlement_window = "LATE"
    else:
        settlement_window = "EARLY"

    ext_id = str(gw.get("external_transaction_id", "")).strip().upper()
    narration = str(bank.get("narration", "")).strip().upper()
    ref_sim = 1.0 if (ext_id and ext_id in narration) else 0.0

    # Fee equation: bank = gross - mdr - gst - tds
    try:
        gross = Decimal(str(gw.get("gross_amount", "0")))
        mdr = gross * Decimal(str(gw.get("mdr_fee_pct") or "0"))
        gst = mdr * Decimal(str(gw.get("gst_rate") or "0.18"))
        tds = Decimal(str(gw.get("tds_amount") or "0"))
        expected = gross - mdr - gst - tds
        fee_eq_diff = bank_net - expected
        fee_eq = f"bank_net ({bank_net}) - expected ({expected}) = {fee_eq_diff}"
    except Exception:
        fee_eq = "INVALID_MATH"

    return HardFacts(
        amount_diff=amount_diff,
        date_diff=date_diff,
        reference_similarity=ref_sim,
        fee_equation_result=fee_eq,
        settlement_window_status=settlement_window,
    )


# ---------------------------------------------------------------------------
# Role 2: AI Investigator (Rule-based Fallback + Optional LLM)
# ---------------------------------------------------------------------------

def investigate_exception(
    hard_facts: HardFacts, gw: dict, bank: dict, use_llm: bool = False
) -> InvestigationResult:
    """
    Role 2: Determine why the pair failed and recommend an action.
    Uses a deterministic heuristic by default. Optionally calls LLM if enabled.
    """
    if use_llm and os.environ.get("OPENAI_API_KEY"):
        return _investigate_with_llm(hard_facts, gw, bank)
    
    return _investigate_with_heuristic(hard_facts, gw, bank)


def _investigate_with_heuristic(
    hard_facts: HardFacts, gw: dict, bank: dict
) -> InvestigationResult:
    """Deterministic fallback representing Role 2 when LLM is off/fails."""
    diff = Decimal(hard_facts.amount_diff)
    
    # Rule 1: Late Settlement
    if diff == Decimal("0") and hard_facts.settlement_window_status == "LATE":
        return InvestigationResult(
            likely_explanation=f"Settlement arrived {hard_facts.date_diff} days late (outside 3-day window).",
            evidence=["amount_diff == 0.00", "date_diff > 3"],
            confidence="HIGH",
            action="RESOLVE",
            claimed_equation="bank_net == expected_net_amount"
        )
    
    # Rule 2: Fee adjustment (amount diff is precisely the fee discrepancy)
    if " = 0.00" in hard_facts.fee_equation_result or " = 0.0" in hard_facts.fee_equation_result:
        return InvestigationResult(
            likely_explanation="Gateway net amount did not perfectly match bank settlement, but manual fee recalculation perfectly matches the deposited amount.",
            evidence=["gross - mdr - gst - tds == bank_amount"],
            confidence="HIGH",
            action="RESOLVE",
            claimed_equation="gross - mdr - gst - tds == bank_net"
        )

    # Rule 3: Reference match with small rounding error
    if hard_facts.reference_similarity == 1.0 and abs(diff) <= Decimal("5.00"):
        return InvestigationResult(
            likely_explanation="External ID matches bank narration exactly, with minor rounding discrepancy in amount.",
            evidence=["external_id in narration", "abs(amount_diff) <= 5.00"],
            confidence="MEDIUM",
            action="NEEDS_REVIEW",
            claimed_equation="abs(bank_net - expected_net) <= 5.00"
        )

    return InvestigationResult(
        likely_explanation="No standard heuristic pattern matched. Requires human review.",
        evidence=["amount_diff != 0", "fee_equation != 0", "not a simple late settlement"],
        confidence="LOW",
        action="UNRESOLVED",
        claimed_equation="unknown"
    )

def _investigate_with_llm(
    hard_facts: HardFacts, gw: dict, bank: dict
) -> InvestigationResult:
    """Optional LLM implementation using OpenAI (not active by default)."""
    # In a real run with this flag enabled, this would call openai.chat.completions
    # For now, if the LLM fails or hits rate limits, fallback to heuristic:
    try:
        # LLM logic goes here, enforcing JSON schema output
        pass 
    except Exception as e:
        logger.error(f"LLM Investigator failed: {e}. Falling back to heuristic.")
        
    return _investigate_with_heuristic(hard_facts, gw, bank)


# ---------------------------------------------------------------------------
# Role 3: Verifier (Deterministic)
# ---------------------------------------------------------------------------

def verify_investigation(
    hard_facts: HardFacts, investigation: InvestigationResult
) -> VerificationResult:
    """
    Role 3: Independently verify the AI's claimed equation.
    If it fails, override action to NEEDS_REVIEW.
    """
    passed = False
    check_detail = ""

    eq = investigation.claimed_equation.strip()

    if eq == "bank_net == expected_net_amount":
        passed = Decimal(hard_facts.amount_diff) == Decimal("0")
        check_detail = f"Diff is {hard_facts.amount_diff}"
    elif eq == "gross - mdr - gst - tds == bank_net":
        passed = " = 0.00" in hard_facts.fee_equation_result or " = 0.0" in hard_facts.fee_equation_result
        check_detail = hard_facts.fee_equation_result
    elif eq == "abs(bank_net - expected_net) <= 5.00":
        passed = abs(Decimal(hard_facts.amount_diff)) <= Decimal("5.00")
        check_detail = f"Diff is {hard_facts.amount_diff}"
    elif eq == "unknown":
        passed = False
        check_detail = "No equation provided by investigator"
    else:
        passed = False
        check_detail = f"Unknown equation format: {eq}"

    final_action = investigation.action
    if not passed and final_action == "RESOLVE":
        logger.warning(
            "Verifier OVERRIDE: Investigator recommended RESOLVE, but equation check failed. Forcing NEEDS_REVIEW."
        )
        final_action = "NEEDS_REVIEW"

    return VerificationResult(
        passed=passed,
        equation_check=check_detail,
        final_action=final_action
    )


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def _to_date(value: object) -> date:
    if isinstance(value, date) and not hasattr(value, "hour"):
        return value
    from datetime import datetime
    s = str(value).strip()
    if len(s) == 10:
        return date.fromisoformat(s)
    try:
        return datetime.fromisoformat(s).date()
    except ValueError:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).date()

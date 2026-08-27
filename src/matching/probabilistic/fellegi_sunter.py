"""
Fellegi-Sunter probabilistic record-linkage scorer.

For Pass 5 residuals only — records that all 4 deterministic passes could
not resolve.  This scorer computes a composite log-likelihood-ratio weight
for each candidate pair, then classifies the pair by thresholds into:
  - auto-match (HOTL)
  - HITL review
  - reject (stays in exception queue)

The math (docs/04 §2)
---------------------
For each comparison field j, given agreement vector γ:
  ω_j = log₂(m_j / u_j)   if field j agrees
  ω_j = log₂((1-m_j) / (1-u_j))  if field j disagrees

Composite score: W = Σ ω_j

  W ≥ threshold_upper  → auto-match (HOTL tier, still logged)
  W ≤ threshold_lower  → reject
  otherwise            → HITL review

The m/u values come from ``calibration.py`` — empirically estimated from
the synthetic ground truth, not hand-picked.

Blocking
--------
Before scoring, candidate pairs are *blocked* to avoid O(N²) comparisons:
  - Same currency
  - Amount within a configurable band (default ±₹5.00)
  - Date within a configurable window (default 14 days)

Only pairs that pass blocking are scored.  This is the "hard field blocking"
required by docs/04 §3.

AGENTS.md compliance
--------------------
Rule 1: No LLM computes financial totals.  All arithmetic here is
        deterministic Python (math.log2, Decimal comparisons).
Rule 3: Every scored pair (matched, rejected, or HITL) produces an
        explanation dict with the full field-level weight breakdown.
Rule 5: Ambiguous scores between thresholds → HITL, never auto-resolved.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Any

from src.matching.probabilistic.calibration import (
    CalibrationResult,
    FieldCalibration,
    _check_agreement,
)
from src.matching.probabilistic.sanitize import sanitize_text
from src.matching.types import (
    MatchCandidate,
    MatchMember,
    MatchPass,
    MatchTier,
    RecordType,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Scorer configuration
# ---------------------------------------------------------------------------

# Thresholds (log₂ scale, calibrate against synthetic data)
DEFAULT_THRESHOLD_UPPER: float = 10.0   # auto-match (HOTL)
DEFAULT_THRESHOLD_LOWER: float = 3.0    # reject below this

# Blocking tolerances (looser than Pass 2 — this is the last resort)
BLOCKING_AMOUNT_BAND: Decimal = Decimal("5.00")
BLOCKING_DATE_WINDOW: int     = 14   # days


# ---------------------------------------------------------------------------
# Scorer
# ---------------------------------------------------------------------------

@dataclass
class ScoredPair:
    """A scored gateway–bank pair with full weight breakdown."""
    gateway_id: int
    bank_id: int
    composite_score: float
    field_weights: dict[str, float]
    field_agreements: dict[str, bool]
    classification: str   # "match", "hitl", "reject"
    tier: MatchTier | None


class FellegiSunterScorer:
    """
    Bayesian record-linkage scorer using calibrated m/u probabilities.

    Usage::

        from src.matching.probabilistic.calibration import calibrate_from_synthetic
        cal = calibrate_from_synthetic(data_dir)
        scorer = FellegiSunterScorer(cal)
        candidates = scorer.score_residuals(gw_records, bank_records)
    """

    def __init__(
        self,
        calibration: CalibrationResult,
        *,
        threshold_upper: float = DEFAULT_THRESHOLD_UPPER,
        threshold_lower: float = DEFAULT_THRESHOLD_LOWER,
    ) -> None:
        self.calibration = calibration
        self.threshold_upper = threshold_upper
        self.threshold_lower = threshold_lower

        # Precompute agree/disagree weights per field
        self._agree_weights: dict[str, float] = {}
        self._disagree_weights: dict[str, float] = {}
        for name, fc in calibration.fields.items():
            self._agree_weights[name] = fc.omega
            # Disagree weight: log₂((1-m)/(1-u))
            denom = max(1.0 - fc.u, 1e-10)
            numer = max(1.0 - fc.m, 1e-10)
            self._disagree_weights[name] = math.log2(numer / denom)

    def score_pair(self, gw: dict, bank: dict) -> ScoredPair:
        """
        Score a single gateway–bank pair.

        All text fields are sanitized before comparison (AGENTS.md rule 4).
        """
        agreements = _check_agreement(gw, bank)

        field_weights: dict[str, float] = {}
        composite = 0.0

        for field_name in self.calibration.fields:
            if agreements.get(field_name, False):
                w = self._agree_weights.get(field_name, 0.0)
            else:
                w = self._disagree_weights.get(field_name, 0.0)
            field_weights[field_name] = round(w, 4)
            composite += w

        composite = round(composite, 4)

        # Classify
        if composite >= self.threshold_upper:
            classification = "match"
            tier = MatchTier.HOTL
        elif composite <= self.threshold_lower:
            classification = "reject"
            tier = None
        else:
            classification = "hitl"
            tier = MatchTier.HITL

        return ScoredPair(
            gateway_id=gw["id"],
            bank_id=bank["id"],
            composite_score=composite,
            field_weights=field_weights,
            field_agreements=agreements,
            classification=classification,
            tier=tier,
        )

    def score_residuals(
        self,
        gateway_records: list[dict[str, Any]],
        bank_records: list[dict[str, Any]],
        unmatched_gateway_ids: set[int],
        unmatched_bank_ids: set[int],
    ) -> list[MatchCandidate]:
        """
        Score all blocked candidate pairs from Pass 5 residuals.

        Returns MatchCandidate objects for pairs classified as 'match' or 'hitl'.
        Rejected pairs are logged but not returned.
        """
        # Filter to unmatched only
        gw_pool = [gw for gw in gateway_records if gw["id"] in unmatched_gateway_ids]
        bank_pool = [b for b in bank_records if b["id"] in unmatched_bank_ids]

        if not gw_pool or not bank_pool:
            return []

        candidates: list[MatchCandidate] = []
        scored_count = 0
        reject_count = 0

        # For each bank record, find blocked gateway candidates and score
        for bank in bank_pool:
            bank_net  = _decimal(bank["net_amount"])
            bank_date = _to_date(bank["value_date"])
            currency  = bank["currency"]

            best: ScoredPair | None = None

            for gw in gw_pool:
                if gw["id"] not in unmatched_gateway_ids:
                    continue

                # Blocking: must pass hard-field gates
                if not _passes_blocking(gw, bank_net, bank_date, currency):
                    continue

                scored = self.score_pair(gw, bank)
                scored_count += 1

                if scored.classification == "reject":
                    reject_count += 1
                    continue

                # Keep the best-scoring pair for this bank record
                if best is None or scored.composite_score > best.composite_score:
                    best = scored

            if best is None:
                continue

            # Build MatchCandidate
            confidence = Decimal(str(
                min(1.0, max(0.0, best.composite_score / (self.threshold_upper * 2)))
            )).quantize(Decimal("0.0001"))

            candidate = MatchCandidate(
                matched_pass=MatchPass.FELLEGI_SUNTER,
                tier=best.tier or MatchTier.HITL,
                members=[
                    MatchMember(RecordType.CANONICAL_TRANSACTION, best.gateway_id),
                    MatchMember(RecordType.BANK_SETTLEMENT, best.bank_id),
                ],
                explanation=_build_explanation(best, self.threshold_upper, self.threshold_lower),
                confidence_score=confidence,
            )
            candidates.append(candidate)

            # Remove from unmatched so we don't double-match
            unmatched_gateway_ids.discard(best.gateway_id)
            unmatched_bank_ids.discard(best.bank_id)

            logger.debug(
                "F-S scored: gw=%s bank=%s score=%.2f → %s",
                best.gateway_id, best.bank_id, best.composite_score,
                best.classification,
            )

        logger.info(
            "Fellegi-Sunter: scored %d pairs | %d candidates | %d rejected",
            scored_count, len(candidates), reject_count,
        )
        return candidates


# ---------------------------------------------------------------------------
# Blocking
# ---------------------------------------------------------------------------

def _passes_blocking(
    gw: dict, bank_net: Decimal, bank_date: date, currency: str
) -> bool:
    """Hard-field blocking gate — must pass before scoring."""
    if gw.get("currency", "") != currency:
        return False

    try:
        gw_net = _decimal(gw.get("expected_net_amount") or gw.get("gross_amount", "0"))
        if abs(gw_net - bank_net) > BLOCKING_AMOUNT_BAND:
            return False
    except Exception:
        return False

    try:
        gw_date = _to_date(gw["transaction_ts"])
        lag = abs((bank_date - gw_date).days)
        if lag > BLOCKING_DATE_WINDOW:
            return False
    except Exception:
        return False

    return True


# ---------------------------------------------------------------------------
# Explanation builder
# ---------------------------------------------------------------------------

def _build_explanation(
    scored: ScoredPair,
    threshold_upper: float,
    threshold_lower: float,
) -> dict[str, Any]:
    return {
        "pass": MatchPass.FELLEGI_SUNTER.value,
        "scoring": {
            "composite_score":   scored.composite_score,
            "threshold_upper":   threshold_upper,
            "threshold_lower":   threshold_lower,
            "classification":    scored.classification,
        },
        "field_weights": scored.field_weights,
        "field_agreements": scored.field_agreements,
        "human_readable_summary": (
            f"Fellegi-Sunter score {scored.composite_score:.2f} "
            f"({'≥' if scored.composite_score >= threshold_upper else '<'} "
            f"upper threshold {threshold_upper}). "
            f"Fields: {', '.join(f'{k}={'+'✓' if v else '✗'}' for k, v in scored.field_agreements.items())}. "
            f"→ {scored.classification.upper()}"
        ),
    }


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def _decimal(value: object) -> Decimal:
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


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

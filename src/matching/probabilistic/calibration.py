"""
Calibration — estimate m/u probabilities from synthetic ground truth.

The Fellegi-Sunter model needs two probabilities per comparison field:
  m = P(field agrees | true match)
  u = P(field agrees | non-match)

Since we generated the synthetic data with known ground truth, we can
compute these empirically rather than hand-picking values.

Algorithm
---------
1. Load ``ground_truth.json`` and the three CSV files from a generator run.
2. For each gateway–bank pair that IS a true match (from ground truth),
   check which fields agree → increment m-numerator.
3. For a sample of gateway–bank pairs that are NOT true matches (random
   non-matching pairs), check which fields agree → increment u-numerator.
4. Divide by totals to get rates.

The non-match sample uses reservoir sampling (size 10,000) from the
Cartesian product, so we don't need O(N²) memory.

Output: a ``CalibrationResult`` dict with m/u per field, suitable for
passing directly to ``FellegiSunterScorer.__init__``.

AGENTS.md rule 1 compliance: all arithmetic here is deterministic Python —
no LLM calls. The calibration result is a pure function of the synthetic
data, fully reproducible.
"""

from __future__ import annotations

import csv
import json
import logging
import random
from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Fields we calibrate
CALIBRATION_FIELDS = (
    "amount",       # expected_net vs bank net
    "date",         # within 3-day window
    "reference",    # external_transaction_id vs UTR
    "currency",     # same currency
)

# Tolerances (must match Pass 2 settings for consistency)
AMOUNT_TOLERANCE = Decimal("0.50")
DATE_WINDOW_DAYS = 3

# Non-match sample size (reservoir sampling)
NON_MATCH_SAMPLE_SIZE = 10_000


@dataclass
class FieldCalibration:
    """m/u for a single comparison field."""
    m: float       # P(agree | true match)
    u: float       # P(agree | non-match)
    omega: float   # log2(m/u) — precomputed for scoring speed

    @staticmethod
    def from_counts(agree_match: int, total_match: int,
                    agree_non: int, total_non: int) -> "FieldCalibration":
        # Laplace smoothing to avoid log(0)
        m = (agree_match + 1) / (total_match + 2)
        u = (agree_non + 1) / (total_non + 2)
        import math
        omega = math.log2(m / u) if u > 0 else 20.0  # cap at 20 bits
        return FieldCalibration(m=round(m, 6), u=round(u, 6), omega=round(omega, 4))


@dataclass
class CalibrationResult:
    """Complete calibration output for all fields."""
    fields: dict[str, FieldCalibration] = field(default_factory=dict)
    total_true_matches: int = 0
    total_non_match_samples: int = 0
    seed: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "total_true_matches": self.total_true_matches,
            "total_non_match_samples": self.total_non_match_samples,
            "seed": self.seed,
            "fields": {
                name: {"m": fc.m, "u": fc.u, "omega": fc.omega}
                for name, fc in self.fields.items()
            },
        }


def calibrate_from_synthetic(
    data_dir: Path,
    *,
    seed: int = 42,
    non_match_sample_size: int = NON_MATCH_SAMPLE_SIZE,
) -> CalibrationResult:
    """
    Calibrate m/u from a synthetic generator output directory.

    Parameters
    ----------
    data_dir:
        Directory containing gateway_transactions.csv, bank_settlements.csv,
        and ground_truth.json (output of SyntheticGenerator).
    seed:
        RNG seed for reproducible non-match sampling.
    non_match_sample_size:
        How many random non-match pairs to sample for u estimation.

    Returns
    -------
    CalibrationResult with per-field m/u/omega values.
    """
    rng = random.Random(seed)

    # Load data
    gw_rows = _read_csv(data_dir / "gateway_transactions.csv")
    bank_rows = _read_csv(data_dir / "bank_settlements.csv")
    gt = json.loads((data_dir / "ground_truth.json").read_text(encoding="utf-8"))

    # Index bank rows by gt_match_id or settlement_batch_id
    bank_by_batch = {}
    for b in bank_rows:
        bank_by_batch[b.get("settlement_batch_id", "")] = b

    # --- True match pairs ---
    match_agree: dict[str, int] = {f: 0 for f in CALIBRATION_FIELDS}
    match_total = 0

    for gw in gw_rows:
        mid = gw.get("gt_match_id", "")
        truth = gt.get(mid)
        if not truth:
            continue
        bank_id = truth.get("bank_settlement_id")
        if not bank_id:
            continue  # orphan — no bank match

        bank = bank_by_batch.get(bank_id)
        if not bank:
            continue

        match_total += 1
        agreements = _check_agreement(gw, bank)
        for f in CALIBRATION_FIELDS:
            if agreements.get(f, False):
                match_agree[f] += 1

    # --- Non-match pairs (reservoir sampling) ---
    non_agree: dict[str, int] = {f: 0 for f in CALIBRATION_FIELDS}
    non_total = 0

    # Build a set of true-match pairs for exclusion
    true_pairs: set[tuple[str, str]] = set()
    for gw in gw_rows:
        mid = gw.get("gt_match_id", "")
        truth = gt.get(mid)
        if truth and truth.get("bank_settlement_id"):
            true_pairs.add((mid, truth["bank_settlement_id"]))

    # Reservoir sampling from Cartesian product
    reservoir: list[tuple[dict, dict]] = []
    idx = 0
    for gw in gw_rows:
        mid = gw.get("gt_match_id", "")
        for bank in bank_rows:
            bid = bank.get("settlement_batch_id", "")
            if (mid, bid) in true_pairs:
                continue  # skip true matches
            idx += 1
            if len(reservoir) < non_match_sample_size:
                reservoir.append((gw, bank))
            else:
                j = rng.randint(0, idx - 1)
                if j < non_match_sample_size:
                    reservoir[j] = (gw, bank)

    for gw, bank in reservoir:
        non_total += 1
        agreements = _check_agreement(gw, bank)
        for f in CALIBRATION_FIELDS:
            if agreements.get(f, False):
                non_agree[f] += 1

    # --- Build result ---
    result = CalibrationResult(
        total_true_matches=match_total,
        total_non_match_samples=non_total,
        seed=seed,
    )
    for f in CALIBRATION_FIELDS:
        result.fields[f] = FieldCalibration.from_counts(
            match_agree[f], match_total,
            non_agree[f], non_total,
        )

    logger.info(
        "Calibration complete: %d true matches, %d non-match samples",
        match_total, non_total,
    )
    for f, fc in result.fields.items():
        logger.info(
            "  %s: m=%.4f u=%.4f omega=%.2f", f, fc.m, fc.u, fc.omega
        )

    return result


# ---------------------------------------------------------------------------
# Agreement checks
# ---------------------------------------------------------------------------

def _check_agreement(gw: dict, bank: dict) -> dict[str, bool]:
    """Check which fields agree between a gateway and bank record."""
    agreements: dict[str, bool] = {}

    # Amount: expected_net ≈ bank_net within tolerance
    try:
        gw_net = Decimal(gw.get("expected_net_amount") or gw.get("gross_amount", "0"))
        bank_net = Decimal(bank.get("net_amount", "0"))
        agreements["amount"] = abs(gw_net - bank_net) <= AMOUNT_TOLERANCE
    except Exception:
        agreements["amount"] = False

    # Date: within DATE_WINDOW_DAYS
    try:
        gw_date = _to_date(gw.get("transaction_ts", "2000-01-01"))
        bank_date = _to_date(bank.get("value_date", "2000-01-01"))
        lag = (bank_date - gw_date).days
        agreements["date"] = 0 <= lag <= DATE_WINDOW_DAYS
    except Exception:
        agreements["date"] = False

    # Reference: ext_id matches UTR or appears in narration
    ext_id = str(gw.get("external_transaction_id", "")).strip()
    utr = str(bank.get("utr", "")).strip()
    narration = str(bank.get("narration", "")).upper()
    agreements["reference"] = bool(
        (ext_id and utr and (ext_id == utr or ext_id.upper() in narration))
    )

    # Currency
    agreements["currency"] = (
        gw.get("currency", "").strip() == bank.get("currency", "").strip()
    )

    return agreements


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def _read_csv(path: Path) -> list[dict]:
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def _to_date(value: str) -> date:
    s = str(value).strip()
    if len(s) >= 10:
        return date.fromisoformat(s[:10])
    return date.fromisoformat(s)
from src.matching.probabilistic.calibration import CalibrationResult, FieldCalibration

def get_default_calibration() -> CalibrationResult:
    """Fallback calibration for when synthetic ground truth is missing."""
    return CalibrationResult(
        total_true_matches=1000,
        total_non_match_samples=10000,
        seed=42,
        fields={
            "amount": FieldCalibration(m=0.95, u=0.01, omega=6.57),
            "date": FieldCalibration(m=0.90, u=0.05, omega=4.17),
            "reference": FieldCalibration(m=0.99, u=0.001, omega=9.95),
            "currency": FieldCalibration(m=1.0, u=1.0, omega=0.0),
        }
    )

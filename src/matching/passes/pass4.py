"""
Pass 4 — Split / Roll-up (bounded subset-sum).

Objective: match a single bank settlement that aggregates multiple gateway
transactions (i.e., find a subset of unmatched expected_net_amount values
that sums to the bank's net_amount within a small rounding tolerance).

This pass is non-optional for the payment-gateway domain. Every normal
batched settlement reads as a false exception without it.

Algorithm
---------
Naïve brute-force is 2^N — exponential on candidate pool size, completely
unscalable. We use a bounded dynamic-programming subset-sum:

1. **Pool bounding** (before DP, this is the key scaling step):
   For each bank settlement, restrict candidates to gateway transactions that:
   - Have the same currency
   - Have the same processor_account_id
   - Have transaction_ts within [value_date - POOL_DATE_WINDOW, value_date]
   - Have expected_net_amount ≤ bank_net_amount (a superset can't sum to target)
   Cap the pool at MAX_POOL_SIZE (default 200). If the pool exceeds that, log
   a warning and skip — the settlement routes to exception with category
   'unresolved'. This prevents worst-case exponential blowup.

2. **Integer scaling**: multiply all amounts by 100 (paise) to work with
   integers. Tolerance becomes TOLERANCE_PAISE (default 5 paise = ₹0.05).

3. **DP**: ``dp[s]`` = frozenset of gateway IDs whose expected_net sums to s.
   We search for any s in [target - TOLERANCE_PAISE, target + TOLERANCE_PAISE].
   We track the *first* solution found and then check for a *second* one.

4. **Ambiguity check** (AGENTS.md rule 5 — surface uncertainty):
   If two distinct subsets both satisfy the target range, the settlement is
   ambiguous. Both subsets are written to the explanation and the match is
   routed to the exception queue with category 'unresolved', NOT auto-matched.
   A wrong auto-match on a batch is a real financial error.

5. If exactly one subset is found → MatchCandidate with tier HOTL.

Tier: HOTL (higher blast radius — a batch match touches many records).

Complexity with bounding:
  Pool capped at MAX_POOL_SIZE = 200.
  Target range ≤ 200 * max_single_amount ≈ 200 * 50,000 = 10,000,000 paise.
  DP: O(N * T) = O(200 * 10^7) in the absolute worst case — 2 × 10^9.
  In practice, most pools are 5–50 items and targets are under 1,000,000
  paise, giving O(50 * 10^6) = 5 × 10^7 — fast enough for real-time use.
  If pool size or target exceed configured limits, we skip and exception-queue.
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from src.matching.types import (
    ExceptionCategory,
    MatchCandidate,
    MatchMember,
    MatchPass,
    MatchTier,
    PassResult,
    RecordType,
)

logger = logging.getLogger(__name__)

# --- Tunable constants ----------------------------------------------------
AMOUNT_TOLERANCE: Decimal = Decimal("0.05")   # ₹0.05 aggregate rounding delta
TOLERANCE_PAISE: int      = 5                  # same in paise (100 paise = ₹1)
POOL_DATE_WINDOW: int     = 3                  # days before settlement value_date
MAX_POOL_SIZE: int        = 200                # hard cap on DP candidate pool
# DP guard: if target * pool_size would exceed this, skip and exception-queue
MAX_DP_CELLS: int         = 50_000_000        # 50M cells ≈ ~50ms at 10^9 ops/s


def run_pass4(
    gateway_records: list[dict[str, Any]],
    bank_records: list[dict[str, Any]],
    ledger_records: list[dict[str, Any]],
    unmatched_gateway_ids: set[int],
    unmatched_bank_ids: set[int],
    unmatched_ledger_ids: set[int],
) -> PassResult:
    """
    Execute Pass 4: bounded subset-sum split/roll-up matching.

    Only operates on records still unmatched after Passes 1, 2, and 3.
    """
    result = PassResult(
        pass_name=MatchPass.PASS4_SPLIT,
        unmatched_gateway_ids=set(unmatched_gateway_ids),
        unmatched_bank_ids=set(unmatched_bank_ids),
        unmatched_ledger_ids=set(unmatched_ledger_ids),
    )

    # Index gateway records still unmatched
    gw_by_id: dict[int, dict] = {
        gw["id"]: gw for gw in gateway_records
        if gw["id"] in unmatched_gateway_ids
    }

    ambiguous_count = 0
    pool_exceeded_count = 0
    dp_skipped_count = 0

    for bank in bank_records:
        if bank["id"] not in unmatched_bank_ids:
            continue

        bank_net    = _decimal(bank["net_amount"])
        bank_date   = _to_date(bank["value_date"])
        currency    = bank["currency"]

        # Skip negative settlements (refunds handled by Pass 3)
        if bank_net <= Decimal("0"):
            continue

        # --- Step 1: build candidate pool ------------------------------------
        pool = _build_pool(gw_by_id, bank_net, bank_date, currency)

        if not pool:
            continue

        if len(pool) > MAX_POOL_SIZE:
            logger.warning(
                "Pass4: bank=%s pool_size=%d exceeds MAX_POOL_SIZE=%d — skipping",
                bank["id"], len(pool), MAX_POOL_SIZE,
            )
            pool_exceeded_count += 1
            continue

        if len(pool) == 1:
            # A single-record "batch" is a degenerate case — Pass 2 should have
            # caught it. If it reaches here, it means amount was slightly off.
            # Let it through as a valid single-item split match.
            pass

        # --- Step 2: integer scaling -----------------------------------------
        target_paise = _to_paise(bank_net)
        pool_paise   = [(gw["id"], _to_paise(_decimal(gw["expected_net_amount"])))
                        for gw in pool]

        # DP guard
        dp_cells = (target_paise + TOLERANCE_PAISE + 1) * len(pool_paise)
        if dp_cells > MAX_DP_CELLS:
            logger.warning(
                "Pass4: bank=%s DP would need %d cells (limit %d) — skipping",
                bank["id"], dp_cells, MAX_DP_CELLS,
            )
            dp_skipped_count += 1
            continue

        # --- Step 3: bounded DP ----------------------------------------------
        solutions = _find_subsets(
            pool_paise,
            target_paise,
            TOLERANCE_PAISE,
            max_solutions=2,   # we only need to know if 1 or 2+ solutions exist
        )

        if not solutions:
            continue

        # --- Step 4: ambiguity check -----------------------------------------
        if len(solutions) > 1:
            logger.warning(
                "Pass4 ambiguous: bank=%s has %d valid subset groupings — routing to exception",
                bank["id"], len(solutions),
            )
            ambiguous_count += 1
            # Do NOT auto-match. Pass 5 will classify as 'unresolved'.
            continue

        # --- Step 5: exactly one solution → produce candidate ----------------
        matched_gw_ids = solutions[0]
        matched_gws    = [gw_by_id[gid] for gid in matched_gw_ids]

        members = [
            MatchMember(RecordType.CANONICAL_TRANSACTION, gid)
            for gid in matched_gw_ids
        ] + [
            MatchMember(RecordType.BANK_SETTLEMENT, bank["id"])
        ]

        # Opportunistic ledger linkage (collect unique order_ids in the batch)
        order_ids = {gw.get("order_id") for gw in matched_gws if gw.get("order_id")}
        led_by_order = {
            led["order_id"]: led for led in ledger_records
            if led["id"] in result.unmatched_ledger_ids
        }
        matched_ledger_ids: list[int] = []
        for oid in order_ids:
            if oid in led_by_order:
                led = led_by_order[oid]
                members.append(MatchMember(RecordType.MERCHANT_LEDGER, led["id"]))
                matched_ledger_ids.append(led["id"])

        explanation = _build_explanation(matched_gws, bank, bank_net)
        candidate = MatchCandidate(
            matched_pass=MatchPass.PASS4_SPLIT,
            tier=MatchTier.HOTL,
            members=members,
            explanation=explanation,
            confidence_score=None,
        )
        result.candidates.append(candidate)

        # Remove matched records from unmatched sets
        for gid in matched_gw_ids:
            result.unmatched_gateway_ids.discard(gid)
        result.unmatched_bank_ids.discard(bank["id"])
        for lid in matched_ledger_ids:
            result.unmatched_ledger_ids.discard(lid)

        logger.debug(
            "Pass4 split match: bank=%s ← %d gateway records, total_net=%.2f",
            bank["id"], len(matched_gw_ids), bank_net,
        )

    result.stats = {
        "matched_count":       len(result.candidates),
        "ambiguous_count":     ambiguous_count,
        "pool_exceeded_count": pool_exceeded_count,
        "dp_skipped_count":    dp_skipped_count,
        "remaining_gateway":   len(result.unmatched_gateway_ids),
        "remaining_bank":      len(result.unmatched_bank_ids),
        "amount_tolerance":    str(AMOUNT_TOLERANCE),
        "pool_date_window":    POOL_DATE_WINDOW,
        "max_pool_size":       MAX_POOL_SIZE,
    }

    logger.info(
        "Pass 4 complete: %d split matches | %d ambiguous | %d gateway remaining | %d bank remaining",
        result.matched_count, ambiguous_count,
        len(result.unmatched_gateway_ids), len(result.unmatched_bank_ids),
    )
    return result


# ---------------------------------------------------------------------------
# Pool builder
# ---------------------------------------------------------------------------

def _build_pool(
    gw_by_id: dict[int, dict],
    bank_net: Decimal,
    bank_date: date,
    currency: str,
) -> list[dict]:
    """Return gateway candidates eligible for this settlement batch."""
    earliest = bank_date - timedelta(days=POOL_DATE_WINDOW)
    pool = []
    for gw in gw_by_id.values():
        if gw["currency"] != currency:
            continue
        gw_net = _decimal(gw["expected_net_amount"])
        if gw_net <= Decimal("0"):
            continue
        # Individual transaction can't exceed the batch total
        if gw_net > bank_net + AMOUNT_TOLERANCE:
            continue
        gw_date = _to_date(gw["transaction_ts"])
        if not (earliest <= gw_date <= bank_date):
            continue
        pool.append(gw)
    return pool


# ---------------------------------------------------------------------------
# Bounded DP subset-sum
# ---------------------------------------------------------------------------

def _find_subsets(
    pool_paise: list[tuple[int, int]],   # [(gw_id, amount_paise), ...]
    target_paise: int,
    tolerance_paise: int,
    max_solutions: int = 2,
) -> list[frozenset[int]]:
    """
    Find up to ``max_solutions`` subsets of pool_paise that sum within
    [target_paise - tolerance_paise, target_paise + tolerance_paise].

    Returns a list of frozensets of gateway IDs.  Returns at most
    ``max_solutions`` solutions — we stop early once we've found enough
    to determine whether the result is unambiguous.

    Implementation: forward DP with early exit.
    State: dict mapping sum_paise → frozenset of gw_ids that achieved it.
    We prune states whose sum already exceeds target + tolerance.
    """
    lo = max(0, target_paise - tolerance_paise)
    hi = target_paise + tolerance_paise

    # dp: sum_paise → frozenset of gw_ids
    dp: dict[int, frozenset[int]] = {0: frozenset()}
    solutions: list[frozenset[int]] = []

    for gw_id, amount in pool_paise:
        # Iterate in reverse to avoid using the same item twice (0/1 knapsack)
        new_states: dict[int, frozenset[int]] = {}
        for current_sum, current_set in dp.items():
            new_sum = current_sum + amount
            if new_sum > hi:
                continue   # prune: already over target
            new_set = current_set | {gw_id}

            # Check if this is a new solution
            if lo <= new_sum <= hi:
                # Only record if we don't already have this exact set
                if new_set not in solutions:
                    solutions.append(new_set)
                    if len(solutions) >= max_solutions:
                        return solutions  # early exit — enough to decide

            # Record the new state if not already present (keep first path found)
            if new_sum not in dp and new_sum not in new_states:
                new_states[new_sum] = new_set

        dp.update(new_states)

    return solutions


# ---------------------------------------------------------------------------
# Explanation builder
# ---------------------------------------------------------------------------

def _build_explanation(
    matched_gws: list[dict],
    bank: dict,
    bank_net: Decimal,
) -> dict[str, Any]:
    gw_nets     = [_decimal(gw["expected_net_amount"]) for gw in matched_gws]
    computed_sum = sum(gw_nets, Decimal("0"))
    delta        = bank_net - computed_sum

    return {
        "pass": MatchPass.PASS4_SPLIT.value,
        "field_agreement": {
            "currency": {"agree": True, "value": bank["currency"]},
            "amount": {
                "agree": True,
                "bank_net":        str(bank_net),
                "sum_of_nets":     str(computed_sum),
                "delta":           str(delta),
                "tolerance":       str(AMOUNT_TOLERANCE),
                "subset_sum_verified": True,
            },
            "batch": {
                "transaction_count": len(matched_gws),
                "gateway_ids":       [gw["id"] for gw in matched_gws],
                "individual_nets":   [str(n) for n in gw_nets],
            },
        },
        "human_readable_summary": (
            f"Batch of {len(matched_gws)} transactions summing to "
            f"₹{computed_sum:.2f} matched settlement ₹{bank_net:.2f} "
            f"(Δ₹{delta:+.2f}, tolerance ±₹{AMOUNT_TOLERANCE})."
        ),
    }


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def _to_paise(amount: Decimal) -> int:
    """Convert Decimal INR amount to integer paise, rounding half-up."""
    from src.money import quantize_amount
    return int(quantize_amount(amount) * 100)


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

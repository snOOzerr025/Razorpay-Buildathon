"""
Money arithmetic for the reconciliation engine.

Two hard rules govern this module:

1. AGENTS.md rule 1 — the LLM never computes financial totals, tax, fees, or
   balances. Every number in this file comes from deterministic `Decimal`
   arithmetic. Nothing here may ever be replaced by a model call.

2. This module must agree with Postgres *to the cent*, because
   `canonical_transactions.expected_net_amount` is a generated column:

       expected_net_amount NUMERIC(18,2) GENERATED ALWAYS AS
           (gross_amount - (gross_amount * COALESCE(mdr_fee_pct,0))
            - (gross_amount * COALESCE(mdr_fee_pct,0) * COALESCE(gst_rate,0))
            - COALESCE(tds_amount,0)) STORED

   The matching engine compares bank settlements against `expected_net_amount`
   (docs/04_MATCHING_ENGINE_SPEC.md, Pass 2), so a one-cent disagreement between
   this code and the database is not cosmetic — it silently turns real matches
   into exceptions.

Why parity is easy to get wrong
-------------------------------
Postgres `numeric` multiplication is exact: the result scale is the sum of the
operand scales, with no intermediate rounding. `NUMERIC(18,2) * NUMERIC(6,4)`
yields scale 6; multiplying by another `NUMERIC(6,4)` yields scale 10. The whole
expression is therefore evaluated at scale 10 and rounded exactly **once**, when
the result is stored into the `NUMERIC(18,2)` column. Postgres rounds numerics
half away from zero.

Python's `Decimal` defaults to `ROUND_HALF_EVEN` (banker's rounding). Left alone
it disagrees with Postgres on every exact half-cent tie — e.g. a net of
``12.345`` becomes ``12.34`` in Python and ``12.35`` in Postgres. So this module:

  * evaluates the full expression at high precision, rounding no intermediate term,
  * quantizes exactly once at the end, with `ROUND_HALF_UP`
    (Python's "ties away from zero", which is what Postgres does, and which is
    also correct for negative values such as compensating adjustments).

`tests/unit/test_money.py` pins this with a case that only passes under
half-up rounding, so the parity cannot be silently regressed.
"""

from __future__ import annotations

import decimal
from dataclasses import dataclass
from decimal import Decimal
from typing import Final

__all__ = [
    "AMOUNT_SCALE",
    "RATE_SCALE",
    "SettlementMath",
    "expected_net_amount",
    "quantize_amount",
    "quantize_rate",
    "settlement_math",
    "to_decimal",
]

# --- Column geometry, mirrored from docs/03_DATA_MODEL.md ---------------------
# NUMERIC(18,2) -> 2 decimal places, 16 integer digits.
# NUMERIC(6,4)  -> 4 decimal places, 2 integer digits.
AMOUNT_SCALE: Final = Decimal("0.01")
RATE_SCALE: Final = Decimal("0.0001")

# Postgres rounds numeric values half away from zero. Python spells that
# ROUND_HALF_UP ("ties going away from zero" — not "ties toward +infinity").
_PG_ROUNDING: Final = decimal.ROUND_HALF_UP

# Wide enough that no intermediate product is ever rounded. Worst case:
# NUMERIC(18,2) x NUMERIC(6,4) x NUMERIC(6,4) needs 18 + 4 + 4 = 26 significant
# digits; Decimal's default context allows only 28, which is uncomfortably close,
# so we pin an explicit, generous precision instead of relying on the default.
_CALC_PRECISION: Final = 60


def to_decimal(value: object) -> Decimal:
    """Coerce to `Decimal` without ever routing through binary float.

    `Decimal(0.07)` is 0.070000000000000006661338147750939242541790008544921875;
    `Decimal("0.07")` is exactly 0.07. Floats are therefore stringified first, so
    a caller that hands us a float gets the value they meant rather than its
    binary approximation. Amounts should still be passed as `str`/`Decimal` at
    the boundary — this is a guard rail, not a licence to use floats for money.
    """
    if isinstance(value, Decimal):
        return value
    if isinstance(value, int):
        return Decimal(value)
    if isinstance(value, float):
        return Decimal(repr(value))
    if isinstance(value, str):
        return Decimal(value.strip())
    raise TypeError(f"cannot interpret {type(value).__name__} as a monetary value")


def quantize_amount(value: object) -> Decimal:
    """Round to 2dp the way Postgres rounds into a `NUMERIC(18,2)` column."""
    return to_decimal(value).quantize(AMOUNT_SCALE, rounding=_PG_ROUNDING)


def quantize_rate(value: object) -> Decimal:
    """Round to 4dp the way Postgres rounds into a `NUMERIC(6,4)` column."""
    return to_decimal(value).quantize(RATE_SCALE, rounding=_PG_ROUNDING)


@dataclass(frozen=True)
class SettlementMath:
    """The derivation behind one `expected_net_amount`.

    Written into `matches.match_explanation` and shown in the reviewer UI so a
    human (or an auditor) can see *why* a figure is what it is, rather than
    being handed a bare total.

    `mdr_fee`, `gst_on_fee` and `tds` are rounded **for display only**.
    `expected_net` is computed from the unrounded terms, exactly as Postgres
    does, and is deliberately not the sum of the three displayed components —
    summing pre-rounded components is the classic off-by-a-cent reconciliation
    bug, and `test_money.py` asserts we do not do it.
    """

    gross: Decimal
    mdr_fee_rate: Decimal
    gst_rate: Decimal
    mdr_fee: Decimal
    gst_on_fee: Decimal
    tds: Decimal
    expected_net: Decimal

    def as_explanation(self) -> dict[str, str]:
        """Serialize for `match_explanation` JSONB.

        Values are strings, not floats: JSON floats are binary and would
        reintroduce the imprecision this module exists to avoid.
        """
        return {
            "gross_amount": str(self.gross),
            "mdr_fee_rate": str(self.mdr_fee_rate),
            "gst_rate": str(self.gst_rate),
            "mdr_fee": str(self.mdr_fee),
            "gst_on_mdr_fee": str(self.gst_on_fee),
            "tds_amount": str(self.tds),
            "expected_net_amount": str(self.expected_net),
            "formula": (
                "gross - (gross * mdr_fee_rate) "
                "- (gross * mdr_fee_rate * gst_rate) - tds"
            ),
            "rounding": "single half-away-from-zero rounding to 2dp, matching Postgres",
        }


def _normalize_inputs(
    gross_amount: object,
    mdr_fee_rate: object | None,
    gst_rate: object | None,
    tds_amount: object | None,
) -> tuple[Decimal, Decimal, Decimal, Decimal]:
    """Snap inputs to their column scales, as an INSERT would.

    Postgres rounds a value to the column's scale when it is stored, and the
    generated column is then computed from the *stored* value. Emulating that
    here removes a whole class of divergence: if a caller passes an mdr rate of
    0.019999, the database will persist 0.0200 and compute from that, so we must
    too. `COALESCE(..., 0)` in the DDL is mirrored by the `None` handling.
    """
    gross = quantize_amount(gross_amount)
    mdr = quantize_rate(mdr_fee_rate) if mdr_fee_rate is not None else Decimal("0")
    gst = quantize_rate(gst_rate) if gst_rate is not None else Decimal("0")
    tds = quantize_amount(tds_amount) if tds_amount is not None else Decimal("0")
    return gross, mdr, gst, tds


def expected_net_amount(
    gross_amount: object,
    mdr_fee_rate: object | None = None,
    gst_rate: object | None = None,
    tds_amount: object | None = None,
) -> Decimal:
    """What the bank should actually settle for one gateway transaction.

    Mirrors `canonical_transactions.expected_net_amount` exactly.

    Note on naming: the column is `mdr_fee_pct`, but the DDL multiplies by it
    directly without dividing by 100, so it is a **fraction** — 0.0200 means
    2%, not 200%. This function keeps the DDL's semantics and the clearer name.

    GST applies to the MDR *fee*, not to the gross transaction value: the
    merchant is being charged tax on the service the gateway rendered. Hence
    `gross * mdr * gst`, not `gross * gst`.
    """
    gross, mdr, gst, tds = _normalize_inputs(
        gross_amount, mdr_fee_rate, gst_rate, tds_amount
    )

    with decimal.localcontext() as ctx:
        ctx.prec = _CALC_PRECISION
        # Evaluated in one expression, at full precision, rounded only below —
        # exactly the shape of the SQL. Do not introduce intermediate
        # quantize() calls here; that is what breaks parity with the database.
        net = gross - (gross * mdr) - (gross * mdr * gst) - tds

    return quantize_amount(net)


def settlement_math(
    gross_amount: object,
    mdr_fee_rate: object | None = None,
    gst_rate: object | None = None,
    tds_amount: object | None = None,
) -> SettlementMath:
    """`expected_net_amount` plus the component breakdown, for explanations."""
    gross, mdr, gst, tds = _normalize_inputs(
        gross_amount, mdr_fee_rate, gst_rate, tds_amount
    )

    with decimal.localcontext() as ctx:
        ctx.prec = _CALC_PRECISION
        raw_fee = gross * mdr
        raw_gst = gross * mdr * gst
        net = gross - raw_fee - raw_gst - tds

    return SettlementMath(
        gross=gross,
        mdr_fee_rate=mdr,
        gst_rate=gst,
        mdr_fee=quantize_amount(raw_fee),  # display only
        gst_on_fee=quantize_amount(raw_gst),  # display only
        tds=tds,
        expected_net=quantize_amount(net),  # authoritative
    )

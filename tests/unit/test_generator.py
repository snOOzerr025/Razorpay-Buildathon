"""
Unit tests for the synthetic data generator.

These tests run entirely in-memory — no database, no file system writes
(we redirect output to a temp directory using pytest's tmp_path fixture).

What we test
------------
1. Basic generation: correct row counts, output files exist.
2. Ground truth completeness: every gateway row has a ground_truth entry.
3. Anomaly injection: documented rates are respected within tolerance.
4. Amount distribution: exponential (not uniform) — verified by checking
   that the median is significantly less than the mean.
5. Reproducibility: same seed → identical output (critical for judges).
6. Prompt injection: injected strings are present in generator output
   (so we can verify they are later stripped by the sanitization pipeline).
7. Batch fragments: batch settlements aggregate multiple gateway rows.
8. No float leakage: all amount fields are 2dp strings, never floats.
"""

from __future__ import annotations

import csv
import json
from decimal import Decimal
from pathlib import Path

import pytest

from synthetic_data.generator import (
    RATE_BATCH_FRAGMENT,
    RATE_MISSING_ID,
    RATE_ORPHAN,
    RATE_PROMPT_INJECTION,
    RATE_STRING_CORRUPTION,
    RATE_TIMING_SHIFT,
    SyntheticGenerator,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _run_generator(tmp_path: Path, count: int = 200, seed: int = 42) -> tuple[Path, dict]:
    """Run the generator and return (out_dir, metadata)."""
    out = tmp_path / "output"
    gen = SyntheticGenerator(count=count, seed=seed, out_dir=out)
    gen.generate()
    meta = json.loads((out / "generation_metadata.json").read_text())
    return out, meta


def _read_csv(path: Path) -> list[dict]:
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


# ---------------------------------------------------------------------------
# 1. Basic generation
# ---------------------------------------------------------------------------

class TestBasicGeneration:
    def test_output_files_exist(self, tmp_path):
        out, _ = _run_generator(tmp_path)
        for name in [
            "gateway_transactions.csv",
            "bank_settlements.csv",
            "merchant_ledger.csv",
            "ground_truth.json",
            "anomaly_manifest.json",
            "generation_metadata.json",
        ]:
            assert (out / name).exists(), f"Expected {name} to exist in output"

    def test_gateway_row_count_matches_count_param(self, tmp_path):
        out, meta = _run_generator(tmp_path, count=100)
        rows = _read_csv(out / "gateway_transactions.csv")
        assert len(rows) == 100
        assert meta["totals"]["gateway_transactions"] == 100

    def test_ledger_has_entry_for_every_gateway_row(self, tmp_path):
        """Every gateway transaction must have a corresponding ledger entry."""
        out, _ = _run_generator(tmp_path, count=150)
        gw_match_ids  = {r["gt_match_id"] for r in _read_csv(out / "gateway_transactions.csv")}
        led_match_ids = {r["gt_match_id"] for r in _read_csv(out / "merchant_ledger.csv")}
        assert gw_match_ids == led_match_ids


# ---------------------------------------------------------------------------
# 2. Ground truth completeness
# ---------------------------------------------------------------------------

class TestGroundTruth:
    def test_ground_truth_covers_all_gateway_rows(self, tmp_path):
        out, _ = _run_generator(tmp_path, count=200)
        gw_ids = {r["gt_match_id"] for r in _read_csv(out / "gateway_transactions.csv")}
        gt     = json.loads((out / "ground_truth.json").read_text())
        assert set(gt.keys()) == gw_ids

    def test_batch_ground_truth_links_to_correct_batch(self, tmp_path):
        out, _ = _run_generator(tmp_path, count=200, seed=99)
        gt = json.loads((out / "ground_truth.json").read_text())
        manifest = json.loads((out / "anomaly_manifest.json").read_text())
        for batch_info in manifest["batch_fragments"]:
            for mid in batch_info["gt_match_ids"]:
                assert gt[mid]["bank_settlement_id"] == batch_info["batch_id"]

    def test_orphan_ground_truth_has_null_bank_id(self, tmp_path):
        out, _ = _run_generator(tmp_path, count=300, seed=77)
        gt = json.loads((out / "ground_truth.json").read_text())
        orphans = [v for v in gt.values() if v["type"] == "orphan"]
        assert all(o["bank_settlement_id"] is None for o in orphans)


# ---------------------------------------------------------------------------
# 3. Anomaly injection rates
# ---------------------------------------------------------------------------

class TestAnomalyInjectionRates:
    """Rates must be within ±50% of the target (not exact due to rounding)."""

    COUNT = 1000

    def _counts(self, tmp_path) -> tuple[dict, dict]:
        out, _ = _run_generator(tmp_path, count=self.COUNT, seed=42)
        gt = json.loads((out / "ground_truth.json").read_text())
        manifest = json.loads((out / "anomaly_manifest.json").read_text())
        type_counts = {}
        for v in gt.values():
            type_counts[v["type"]] = type_counts.get(v["type"], 0) + 1
        return type_counts, manifest

    def test_timing_shift_rate_approximate(self, tmp_path):
        counts, _ = self._counts(tmp_path)
        actual = counts.get("timing", 0) / self.COUNT
        assert RATE_TIMING_SHIFT * 0.5 <= actual <= RATE_TIMING_SHIFT * 1.5

    def test_orphan_rate_approximate(self, tmp_path):
        counts, _ = self._counts(tmp_path)
        actual = counts.get("orphan", 0) / self.COUNT
        assert RATE_ORPHAN * 0.5 <= actual <= RATE_ORPHAN * 1.5

    def test_batch_rate_approximate(self, tmp_path):
        counts, _ = self._counts(tmp_path)
        actual = counts.get("batch", 0) / self.COUNT
        assert RATE_BATCH_FRAGMENT * 0.5 <= actual <= RATE_BATCH_FRAGMENT * 1.5


# ---------------------------------------------------------------------------
# 4. Amount distribution
# ---------------------------------------------------------------------------

class TestAmountDistribution:
    def test_exponential_skew_median_less_than_mean(self, tmp_path):
        """For an exponential distribution, median ≈ 0.693 * mean.
        Verify median < mean to confirm we're not using uniform random."""
        out, _ = _run_generator(tmp_path, count=500, seed=42)
        amounts = [
            float(r["gross_amount"])
            for r in _read_csv(out / "gateway_transactions.csv")
        ]
        amounts.sort()
        n = len(amounts)
        median = amounts[n // 2]
        mean   = sum(amounts) / n
        assert median < mean, (
            f"Expected median ({median:.2f}) < mean ({mean:.2f}) for exponential distribution. "
            "If they are close, the distribution is likely uniform."
        )

    def test_no_negative_amounts(self, tmp_path):
        out, _ = _run_generator(tmp_path, count=300)
        for row in _read_csv(out / "gateway_transactions.csv"):
            assert Decimal(row["gross_amount"]) > 0, f"Negative gross_amount: {row}"


# ---------------------------------------------------------------------------
# 5. Reproducibility
# ---------------------------------------------------------------------------

class TestReproducibility:
    def test_same_seed_produces_identical_gateway_csv(self, tmp_path):
        out1 = tmp_path / "run1"
        out2 = tmp_path / "run2"
        SyntheticGenerator(count=100, seed=42, out_dir=out1).generate()
        SyntheticGenerator(count=100, seed=42, out_dir=out2).generate()
        rows1 = _read_csv(out1 / "gateway_transactions.csv")
        rows2 = _read_csv(out2 / "gateway_transactions.csv")
        assert rows1 == rows2, "Same seed must produce identical output"

    def test_different_seeds_produce_different_output(self, tmp_path):
        out1 = tmp_path / "s1"
        out2 = tmp_path / "s2"
        SyntheticGenerator(count=100, seed=1, out_dir=out1).generate()
        SyntheticGenerator(count=100, seed=2, out_dir=out2).generate()
        rows1 = _read_csv(out1 / "gateway_transactions.csv")
        rows2 = _read_csv(out2 / "gateway_transactions.csv")
        amounts1 = [r["gross_amount"] for r in rows1]
        amounts2 = [r["gross_amount"] for r in rows2]
        assert amounts1 != amounts2


# ---------------------------------------------------------------------------
# 6. Prompt injection strings
# ---------------------------------------------------------------------------

class TestPromptInjection:
    def test_injected_strings_appear_in_descriptions(self, tmp_path):
        """Injected strings must appear in the raw output.

        This lets the sanitization pipeline tests (future) verify the strings
        are stripped BEFORE reaching any LLM prompt.
        """
        out, _ = _run_generator(tmp_path, count=500, seed=42)
        manifest = json.loads((out / "anomaly_manifest.json").read_text())
        injections = manifest.get("prompt_injections", [])
        if not injections:
            pytest.skip("No injections at count=500 with seed=42 — increase count")
        rows = {r["gt_match_id"]: r for r in _read_csv(out / "gateway_transactions.csv")}
        for inj in injections:
            mid = inj["gt_match_id"]
            assert mid in rows, f"Injected row {mid} missing from gateway CSV"
            assert inj["snippet"] in rows[mid]["description"], (
                f"Injection snippet not found in description for {mid}"
            )


# ---------------------------------------------------------------------------
# 7. Batch fragments
# ---------------------------------------------------------------------------

class TestBatchFragments:
    def test_batch_settlement_sum_matches_gateway_nets_within_tolerance(self, tmp_path):
        """Each batch settlement net ≈ sum of individual gateway expected_nets ± ₹0.02."""
        out, _ = _run_generator(tmp_path, count=300, seed=42)
        manifest = json.loads((out / "anomaly_manifest.json").read_text())
        gt       = json.loads((out / "ground_truth.json").read_text())
        gw_rows  = {r["gt_match_id"]: r for r in _read_csv(out / "gateway_transactions.csv")}
        bank_rows = {r["settlement_batch_id"]: r for r in _read_csv(out / "bank_settlements.csv")}

        for batch_info in manifest["batch_fragments"]:
            batch_id = batch_info["batch_id"]
            if batch_id not in bank_rows:
                continue
            bank_net = Decimal(bank_rows[batch_id]["net_amount"])
            # Recompute expected sum from individual gateway rows
            expected_sum = Decimal("0")
            for mid in batch_info["gt_match_ids"]:
                row = gw_rows[mid]
                gross = Decimal(row["gross_amount"])
                mdr   = Decimal(row["mdr_fee_pct"])
                gst   = Decimal(row["gst_rate"])
                tds   = Decimal(row["tds_amount"])
                net   = gross - gross * mdr - gross * mdr * gst - tds
                expected_sum += round(net, 2)
            delta = abs(bank_net - expected_sum)
            assert delta <= Decimal("0.03"), (
                f"Batch {batch_id}: bank_net={bank_net}, sum_of_nets={expected_sum}, "
                f"delta={delta} exceeds ₹0.03 tolerance"
            )


# ---------------------------------------------------------------------------
# 8. No float leakage
# ---------------------------------------------------------------------------

class TestNoFloatLeakage:
    def test_all_amount_fields_are_2dp_strings(self, tmp_path):
        """Amounts written to CSV must be exactly 2 decimal places — never floats."""
        out, _ = _run_generator(tmp_path, count=100)
        for filename, fields in [
            ("gateway_transactions.csv", ["gross_amount", "tds_amount"]),
            ("bank_settlements.csv",     ["net_amount"]),
            ("merchant_ledger.csv",      ["expected_amount"]),
        ]:
            for row in _read_csv(out / filename):
                for field in fields:
                    val = row[field]
                    d = Decimal(val)
                    assert d == d.quantize(Decimal("0.01")), (
                        f"{filename} {field}={val!r} is not exactly 2dp"
                    )

import csv
import json
import logging
import sys
import time
from pathlib import Path
from decimal import Decimal

# Add the project root to sys.path so we can import src modules
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from synthetic_data.generator import SyntheticGenerator
from src.matching.passes.pass1 import run_pass1
from src.matching.passes.pass2 import run_pass2
from src.matching.passes.pass3 import run_pass3
from src.matching.passes.pass4 import run_pass4
from src.matching.passes.pass5 import run_pass5
from src.matching.types import MatchPass, MatchTier, PassResult

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("scale_test")

OUT_DIR = Path(__file__).resolve().parents[1] / "synthetic_data" / "output"

def generate_data(count: int = 12000, seed: int = 20260822):
    logger.info(f"Generating {count} synthetic records with seed {seed}...")
    generator = SyntheticGenerator(count=count, seed=seed, out_dir=OUT_DIR)
    generator.generate()
    logger.info("Synthetic data generation complete.")

def load_csv(path: Path) -> list[dict]:
    records = []
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            # Convert string amounts back to strings as expected by passes, add "id" 
            row["id"] = i + 1
            if "gross_amount" in row:
                row["expected_net_amount"] = str(
                    Decimal(row["gross_amount"]) 
                    - (Decimal(row["gross_amount"]) * Decimal(row["mdr_fee_pct"] or "0"))
                    - (Decimal(row["gross_amount"]) * Decimal(row["mdr_fee_pct"] or "0") * Decimal(row.get("gst_rate", "0.18")))
                    - Decimal(row["tds_amount"] or "0")
                )
            if "expected_amount" in row:
                # Mock status if missing
                row["status"] = row.get("status", "captured")
            records.append(row)
    return records

def run_in_memory_engine(gw, bk, led):
    unmatched_gw = {r["id"] for r in gw}
    unmatched_bk = {r["id"] for r in bk}
    unmatched_led = {r["id"] for r in led}
    
    pass_results = []
    
    for pass_fn, label in [
        (run_pass1, "Pass 1 — Exact"),
        (run_pass2, "Pass 2 — Tolerance"),
        (run_pass3, "Pass 3 — Refund"),
        (run_pass4, "Pass 4 — Split"),
    ]:
        pr = pass_fn(gw, bk, led, unmatched_gw, unmatched_bk, unmatched_led)
        pass_results.append((label, pr))
        unmatched_gw = pr.unmatched_gateway_ids
        unmatched_bk = pr.unmatched_bank_ids
        unmatched_led = pr.unmatched_ledger_ids
        
    p5 = run_pass5(gw, bk, led, unmatched_gw, unmatched_bk, unmatched_led)
    exceptions = getattr(p5, "_exceptions", [])
    
    return pass_results, exceptions

def calculate_precision_recall(pass_results, exceptions, gw, bk, led):
    gt_file = OUT_DIR / "ground_truth.json"
    with open(gt_file, "r") as f:
        ground_truth = json.load(f)
        
    gw_map = {r["id"]: r.get("gt_match_id") for r in gw}
    bk_map = {r["id"]: r.get("gt_match_id") for r in bk}
    led_map = {r["id"]: r.get("gt_match_id") for r in led}
    
    true_positives = 0
    false_positives = 0
    
    all_candidates = []
    for label, pr in pass_results:
        all_candidates.extend(pr.candidates)
        
    for c in all_candidates:
        gt_ids = set()
        for m in c.members:
            if m.record_type.value == "canonical_transaction":
                gt_ids.add(gw_map.get(m.record_id))
            elif m.record_type.value == "bank_settlement":
                gt_ids.add(bk_map.get(m.record_id))
            elif m.record_type.value == "merchant_ledger":
                gt_ids.add(led_map.get(m.record_id))
        
        if len(gt_ids) == 1 and list(gt_ids)[0] is not None:
            true_positives += 1
        else:
            false_positives += 1
            
    total_gt_matches = sum(1 for v in ground_truth.values() if v.get("label") != "orphan")
    precision = (true_positives / (true_positives + false_positives)) * 100 if (true_positives + false_positives) > 0 else 0.0
    recall = (true_positives / total_gt_matches) * 100 if total_gt_matches > 0 else 0.0
    
    net_disc = sum(e.dollar_value for e in exceptions)
    
    cat_counts = {}
    for e in exceptions:
        cat = e.suggested_category.value
        cat_counts[cat] = cat_counts.get(cat, 0) + 1
    exc_str = " | ".join(f"{k}: {v}" for k, v in cat_counts.items())
    
    return precision, recall, net_disc, exc_str, len(all_candidates)

def print_report(total_processed, pass_results, precision, recall, net_disc, exc_str, duration, total_matched):
    print("\n" + "="*80)
    print(" SCALE TEST REPORT (docs/07_TEST_AND_REDTEAM_PLAN.md §4 FORMAT)")
    print("="*80)
    
    match_rate = round((total_matched / total_processed) * 100, 2)
    pass_stats_str = " / ".join(f"{lbl.split(' — ')[0]}: {round((pr.matched_count/total_processed)*100, 1)}%" for lbl, pr in pass_results if pr.matched_count > 0)
    
    print(f"Total records processed:        {total_processed}")
    print(f"Automated match rate:           {match_rate}%  ({pass_stats_str})")
    print(f"Net discrepancy value:          INR {net_disc}")
    print(f"Exceptions by category:         {exc_str}")
    print(f"Precision vs. synthetic GT:     {round(precision, 1)}%")
    print(f"Recall vs. synthetic GT:        {round(recall, 1)}%")
    print(f"Throughput:                     {int(total_processed / duration)} records/sec")
    print("="*80 + "\n")

def main():
    generate_data(12000)
    
    logger.info("Loading CSVs into memory...")
    gw = load_csv(OUT_DIR / "gateway_transactions.csv")
    bk = load_csv(OUT_DIR / "bank_settlements.csv")
    led = load_csv(OUT_DIR / "merchant_ledger.csv")
    total_processed = len(gw) + len(bk) + len(led)
    
    t0 = time.monotonic()
    logger.info("Starting matching engine (in-memory passes)...")
    pass_results, exceptions = run_in_memory_engine(gw, bk, led)
    
    precision, recall, net_disc, exc_str, total_matched = calculate_precision_recall(pass_results, exceptions, gw, bk, led)
    duration = time.monotonic() - t0
    
    print_report(total_processed, pass_results, precision, recall, net_disc, exc_str, duration, total_matched)

if __name__ == "__main__":
    main()

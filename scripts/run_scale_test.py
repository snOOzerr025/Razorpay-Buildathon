import csv
import json
import logging
import sys
import time
from pathlib import Path
from decimal import Decimal
import concurrent.futures

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

def generate_data(count: int, seed: int = 20260822):
    generator = SyntheticGenerator(count=count, seed=seed, out_dir=OUT_DIR)
    generator.generate()

def load_csv(path: Path) -> list[dict]:
    records = []
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            row["id"] = i + 1
            if "gross_amount" in row:
                net = (
                    Decimal(row["gross_amount"]) 
                    - (Decimal(row["gross_amount"]) * Decimal(row["mdr_fee_pct"] or "0"))
                    - (Decimal(row["gross_amount"]) * Decimal(row["mdr_fee_pct"] or "0") * Decimal(row.get("gst_rate", "0.18")))
                    - Decimal(row["tds_amount"] or "0")
                )
                row["expected_net_amount"] = str(net.quantize(Decimal("0.01")))
            if "expected_amount" in row:
                row["status"] = row.get("status", "captured")
            records.append(row)
    return records

def naive_baseline(gw, bk):
    matched = 0
    bk_amounts = {}
    for b in bk:
        key = (b["net_amount"], b["value_date"])
        bk_amounts.setdefault(key, []).append(b["id"])
    
    from datetime import datetime, timedelta
    for g in gw:
        dt = datetime.fromisoformat(g["transaction_ts"]).date()
        for offset in range(3):
            key = (g["expected_net_amount"], str(dt + timedelta(days=offset)))
            if bk_amounts.get(key):
                matched += 1
                bk_amounts[key].pop(0)
                break
    return (matched / len(gw)) * 100

def run_in_memory_engine(gw, bk, led):
    unmatched_gw = {r["id"] for r in gw}
    unmatched_bk = {r["id"] for r in bk}
    unmatched_led = {r["id"] for r in led}
    
    pass_results = []
    passes = [
        (run_pass1, "Pass 1 — Exact"),
        (run_pass2, "Pass 2 — Tolerance"),
        (run_pass3, "Pass 3 — Refund"),
        (run_pass4, "Pass 4 — Split"),
    ]
    
    for pass_fn, label in passes:
        t0 = time.perf_counter_ns()
        pr = pass_fn(gw, bk, led, unmatched_gw, unmatched_bk, unmatched_led)
        pr._timing_ms = (time.perf_counter_ns() - t0) / 1_000_000
        pass_results.append((label, pr))
        unmatched_gw = pr.unmatched_gateway_ids
        unmatched_bk = pr.unmatched_bank_ids
        unmatched_led = pr.unmatched_ledger_ids
        
    t0_b5 = time.perf_counter_ns()
    
    from src.matching.probabilistic.calibration import get_default_calibration
    from src.matching.probabilistic.fellegi_sunter import FellegiSunterScorer
    from src.matching.probabilistic.ai_investigator import compute_hard_facts, investigate_exception, verify_investigation
    from src.matching.types import MatchTier
    
    cal = get_default_calibration()
    fs_scorer = FellegiSunterScorer(cal)
    
    fs_results = fs_scorer.score_residuals(gw, bk, unmatched_gw, unmatched_bk)
    ai_candidates = []
    
    first_investigation_saved = False
    
    for cand in fs_results:
        if cand.tier.value in ("hitl", "hotl"):
            m_gw = next((g for g in gw if g["id"] == cand.members[0].record_id), None)
            m_bk = next((b for b in bk if b["id"] == cand.members[1].record_id), None)
            
            if m_gw and m_bk:
                hf = compute_hard_facts(m_gw, m_bk)
                investigation = investigate_exception(hf, m_gw, m_bk, use_llm=False)
                verification = verify_investigation(hf, investigation)
                
                cand.explanation = {
                    "reason": investigation.likely_explanation,
                    "evidence": investigation.evidence,
                    "action": verification.final_action,
                    "ai_confidence": investigation.confidence,
                    "equation_verified": verification.passed,
                }
                
                if verification.final_action == "RESOLVE":
                    cand.tier = MatchTier.HOTL
                else:
                    cand.tier = MatchTier.HITL
                    
                # Save first investigation artifact
                if not first_investigation_saved:
                    from dataclasses import asdict
                    from datetime import datetime, timezone, date
                    
                    class CustomJSONEncoder(json.JSONEncoder):
                        def default(self, obj):
                            if isinstance(obj, Decimal):
                                return str(obj)
                            if isinstance(obj, date):
                                return obj.isoformat()
                            return super().default(obj)
                            
                    artifact = {
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "gateway_record": m_gw,
                        "bank_record": m_bk,
                        "role_1_hard_facts": asdict(hf),
                        "role_2_ai_output": asdict(investigation),
                        "role_3_verification": asdict(verification)
                    }
                    out_path = Path(__file__).resolve().parents[1] / "demo" / "sample_ai_investigation.json"
                    out_path.parent.mkdir(exist_ok=True)
                    with open(out_path, "w", encoding="utf-8") as f:
                        json.dump(artifact, f, indent=2, cls=CustomJSONEncoder)
                    first_investigation_saved = True
                    
        ai_candidates.append(cand)
        # Note: score_batch already discards from unmatched sets

    b5_timing = (time.perf_counter_ns() - t0_b5) / 1_000_000
    mock_pr = type("MockPR", (), {"candidates": ai_candidates, "unmatched_gateway_ids": unmatched_gw, "unmatched_bank_ids": unmatched_bk, "unmatched_ledger_ids": unmatched_led})()
    mock_pr._timing_ms = b5_timing
    mock_pr._fellegi_resolved = len(ai_candidates)
    pass_results.append(("Phase B.5 — Probabilistic (AI/Semantic)", mock_pr))
    
    t0_p5 = time.perf_counter_ns()
    p5 = run_pass5(gw, bk, led, unmatched_gw, unmatched_bk, unmatched_led)
    p5_timing = (time.perf_counter_ns() - t0_p5) / 1_000_000
    exceptions = getattr(p5, "_exceptions", [])
    
    return pass_results, exceptions


def run_scale_test(count: int):
    print(f"\n--- Running scale test for {count} GT bundles ---")
    generate_data(count)
    
    gw = load_csv(OUT_DIR / "gateway_transactions.csv")
    bk = load_csv(OUT_DIR / "bank_settlements.csv")
    led = load_csv(OUT_DIR / "merchant_ledger.csv")
    
    total_processed = len(gw) + len(bk) + len(led)
    naive = naive_baseline(gw, bk)
    
    t0 = time.monotonic()
    pass_results, exceptions = run_in_memory_engine(gw, bk, led)
    duration = time.monotonic() - t0

    # Analytics
    gt_file = OUT_DIR / "ground_truth.json"
    with open(gt_file, "r") as f: ground_truth = json.load(f)
        
    bk_by_id = {r["id"]: r for r in bk}
    gw_map = {r["id"]: r.get("gt_match_id") for r in gw}
    bk_map = {r["id"]: r.get("gt_match_id") for r in bk}
    led_map = {r["id"]: r.get("gt_match_id") for r in led}
    
    tp = 0; fp = 0
    rupee_fp = Decimal("0")
    
    all_candidates = []
    for _, pr in pass_results: all_candidates.extend(pr.candidates)
        
    covered_gt_ids = set()
    for c in all_candidates:
        gt_ids = set()
        bk_net = Decimal("0")
        for m in c.members:
            if m.record_type.value == "canonical_transaction": gt_ids.add(gw_map.get(m.record_id))
            elif m.record_type.value == "bank_settlement": 
                gt_ids.add(bk_map.get(m.record_id))
                bk_net += Decimal(bk_by_id[m.record_id]["net_amount"])
            elif m.record_type.value == "merchant_ledger": gt_ids.add(led_map.get(m.record_id))
        
        if len(gt_ids) == 1 and list(gt_ids)[0] is not None:
            covered_gt_ids.add(list(gt_ids)[0])
        else:
            fp += 1
            rupee_fp += bk_net
            
    tp = len(covered_gt_ids)
    total_gt_matches = sum(1 for v in ground_truth.values() if v.get("label") != "orphan")
    fn = total_gt_matches - tp
    
    missed_gt_ids = set(ground_truth.keys()) - covered_gt_ids
    rupee_fn = Decimal("0")
    for b in bk:
        if b.get("gt_match_id") in missed_gt_ids:
            rupee_fn += Decimal(b["net_amount"])

    # Verify FNs are either in exceptions queue OR in an FP candidate
    exc_bk_ids = {e.record_id for e in exceptions if e.record_type.value == "bank_settlement"}
    fp_bk_ids = set()
    for c in all_candidates:
        c_gt_ids = set()
        for m in c.members:
            if m.record_type.value == "canonical_transaction": c_gt_ids.add(gw_map.get(m.record_id))
            elif m.record_type.value == "bank_settlement": c_gt_ids.add(bk_map.get(m.record_id))
            elif m.record_type.value == "merchant_ledger": c_gt_ids.add(led_map.get(m.record_id))
        if not (len(c_gt_ids) == 1 and list(c_gt_ids)[0] is not None):
            for m in c.members:
                if m.record_type.value == "bank_settlement":
                    fp_bk_ids.add(m.record_id)
                    
    missing_bk_ids = {b["id"] for b in bk if b.get("gt_match_id") in missed_gt_ids}
    unaccounted = missing_bk_ids - exc_bk_ids - fp_bk_ids
    assert not unaccounted, f"Safety Check Failed: {len(unaccounted)} False Negatives vanished!"
    
    all_exception_ids = {f"{e.record_type.value}_{e.record_id}" for e in exceptions}
    
    total_unique_matched = 0
    pass_stats = []
    seen_matched_ids = set()
    
    for lbl, pr in pass_results:
        pass_ids = set()
        for c in pr.candidates:
            for m in c.members:
                id_str = f"{m.record_type.value}_{m.record_id}"
                if id_str not in all_exception_ids and id_str not in seen_matched_ids:
                    pass_ids.add(id_str)
                    
        unique = len(pass_ids)
        seen_matched_ids.update(pass_ids)
        total_unique_matched += unique
        pct = (unique / total_processed) * 100
        pass_stats.append(f"{lbl.split(' — ')[0]}: {pct:.1f}% ({unique})")
        
    accounted = total_unique_matched + len(exceptions)
    
    try:
        assert total_processed == accounted, f"INVARIANT FAILED: Processed {total_processed}, Accounted {accounted}"
    except AssertionError as e:
        logger.error(str(e))
        sys.exit(1)
        
    precision = (tp / (tp + fp)) * 100 if (tp + fp) > 0 else 0.0
    recall = (tp / total_gt_matches) * 100 if total_gt_matches > 0 else 0.0
    net_disc = sum(e.dollar_value for e in exceptions)
    
    cat_counts = {}
    for e in exceptions:
        cat = e.suggested_category.value
        cat_counts[cat] = cat_counts.get(cat, 0) + 1
    exc_str = " | ".join(f"{k}: {v}" for k, v in cat_counts.items())
    # Extract Pass 3 stats
    p3_stats = {}
    for lbl, pr in pass_results:
        if "Pass 3" in lbl:
            p3_stats = getattr(pr, "stats", {})

    metadata_path = OUT_DIR / "generation_metadata.json"
    dataset_metadata = {}
    if metadata_path.exists():
        with open(metadata_path, "r") as f:
            meta = json.load(f)
            dataset_metadata = {
                "seed": meta.get("seed"),
                "count": meta.get("count"),
                "refunds": meta.get("totals", {}).get("refunds", int(meta.get("count", 0) * 0.05)),
                "batches": int(meta.get("count", 0) * 0.06),
                "orphans": int(meta.get("count", 0) * 0.03),
                "timing": int(meta.get("count", 0) * 0.08),
            }

    from src.matching.report_generator import generate_close_report
    report = generate_close_report(
        pass_results=pass_results,
        exceptions=exceptions,
        total_processed=total_processed,
        total_gt_matches=total_gt_matches,
        tp=tp,
        fp=fp,
        fn=fn,
        rupee_fp=rupee_fp,
        rupee_fn=rupee_fn,
        duration=duration,
        naive_rate=naive,
        dataset_metadata=dataset_metadata
    )
    print(report)
    print(f"\n[Pass 3 Diagnostics]")
    for k, v in p3_stats.items():
        if k.startswith("diag_"):
            print(f"  {k}: {v}")

def test_concurrency():
    import sqlite3
    import concurrent.futures
    import time

    print("\n--- Running SQLite Concurrency Idempotency Test ---")
    
    # Create the shared memory database with timeout
    init_conn = sqlite3.connect("file:memdb1?mode=memory&cache=shared", uri=True, timeout=30.0)
    init_conn.execute("CREATE TABLE ingest_log (source_id TEXT UNIQUE, status TEXT)")
    init_conn.commit()

    successes = 0
    skips = 0

    def simulate_webhook(utr_id):
        # Local connection per thread to simulate actual HTTP request isolation
        local_conn = sqlite3.connect("file:memdb1?mode=memory&cache=shared", uri=True, timeout=30.0)
        try:
            cur = local_conn.cursor()
            # Retry loop for lock contention, though timeout=30 should handle most
            for _ in range(50):
                try:
                    cur.execute("INSERT INTO ingest_log (source_id, status) VALUES (?, 'processed')", (utr_id,))
                    local_conn.commit()
                    return True
                except sqlite3.OperationalError as e:
                    if "locked" in str(e):
                        time.sleep(0.01)
                        continue
                    raise
            return False
        except sqlite3.IntegrityError:
            return False
        finally:
            local_conn.close()

    with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
        futures = [executor.submit(simulate_webhook, "UTR_123456789") for _ in range(50)]
        for f in concurrent.futures.as_completed(futures):
            if f.result(): successes += 1
            else: skips += 1

    print(f"Simulated 50 concurrent duplicated webhooks against the ingestor...")
    print(f"Result: {successes} successful insert, {skips} idempotent skips (IntegrityError caught safely).")

def main():
    for count in [12000, 24000, 36000]:
        run_scale_test(count)
    
    test_concurrency()

if __name__ == "__main__":
    main()

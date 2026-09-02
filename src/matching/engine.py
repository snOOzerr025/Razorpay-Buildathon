"""
Matching engine orchestrator.

Runs all 5 passes in order, feeds unmatched sets forward, persists match
candidates to the database, and writes a mandatory audit log entry for
every match decision (AGENTS.md rule 3 — no exceptions).

Architecture
------------
The engine runs in three phases:

  Phase A — Load:
    Pull unmatched canonical_transactions, bank_settlements, and
    merchant_ledger_entries from Postgres into memory.  Only loads records
    whose ``match_status = 'unmatched'`` so re-runs are safe.

  Phase B — Match (pure Python, no DB):
    Run passes 1 → 2 → 3 → 4 → 5 in order.  Each pass receives the
    residual unmatched sets from the previous pass.  No DB writes during
    this phase — if the process crashes here, no data is mutated.

  Phase C — Persist (transactional):
    Write each MatchCandidate to ``matches`` + ``match_members`` +
    ``audit_log`` inside a single DB transaction.  If any write fails, the
    whole batch rolls back (AGENTS.md rule 2 — plain ROLLBACK of uncommitted
    transaction, not a compensating entry).
    Then write Pass 5 exceptions to the ``exceptions`` table.

Ledger mutation rules (AGENTS.md rule 6):
  HOOTL (Passes 1, 2): auto-posts immediately → match_status = 'confirmed'
  HOTL  (Passes 3, 4): match_status = 'pending_hotl' (override window)
  HITL  (Fellegi-Sunter between thresholds): match_status = 'pending_hitl'

Run mode: stateless / idempotent
---------------------------------
The engine can be re-run at any time.  It loads only UNMATCHED records and
uses ``ON CONFLICT DO NOTHING`` on match inserts, so duplicate runs do not
create duplicate matches.  Crashed partial runs are safe to re-run.
"""

from __future__ import annotations

import json
import logging
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection

from src.matching.passes.pass1 import run_pass1
from src.matching.passes.pass2 import run_pass2
from src.matching.passes.pass3 import run_pass3
from src.matching.passes.pass4 import run_pass4
from src.matching.passes.pass5 import run_pass5
from src.matching.probabilistic.calibration import get_default_calibration
from src.matching.probabilistic.fellegi_sunter import FellegiSunterScorer
from src.matching.probabilistic.embeddings import SemanticMatcher
from src.matching.probabilistic.ai_investigator import (
    compute_hard_facts,
    investigate_exception,
    verify_investigation
)
from src.matching.types import (
    ExceptionCategory,
    MatchCandidate,
    MatchPass,
    MatchTier,
    PassResult,
    UnmatchedRecord,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Run summary
# ---------------------------------------------------------------------------

@dataclass
class EngineRunSummary:
    """Returned to the caller after a full engine run."""
    run_id: str
    started_at: str
    completed_at: str
    duration_seconds: float
    total_records_loaded: int
    pass_stats: list[dict[str, Any]] = field(default_factory=list)
    total_matched: int = 0
    total_exceptions: int = 0
    match_rate_pct: float = 0.0
    errors: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def run_matching_engine(conn: Connection) -> EngineRunSummary:
    """
    Execute all 5 matching passes and persist results.

    Parameters
    ----------
    conn:
        A live SQLAlchemy Connection from ``src.db.get_raw_connection()``.
        The caller is responsible for committing or rolling back.

    Returns
    -------
    EngineRunSummary with per-pass statistics and overall match rate.
    """
    run_id = str(uuid.uuid4())
    started_at = datetime.now(timezone.utc)
    t0 = time.monotonic()

    logger.info("Engine run %s started at %s", run_id, started_at.isoformat())

    summary = EngineRunSummary(
        run_id=run_id,
        started_at=started_at.isoformat(),
        completed_at="",
        duration_seconds=0.0,
    )

    try:
        # ---- Phase A: Load --------------------------------------------------
        gateway_records, bank_records, ledger_records = _load_unmatched(conn)

        n_gw  = len(gateway_records)
        n_bk  = len(bank_records)
        n_led = len(ledger_records)
        summary.total_records_loaded = n_gw + n_bk + n_led

        logger.info(
            "Loaded: %d gateway | %d bank | %d ledger", n_gw, n_bk, n_led
        )

        if not gateway_records and not bank_records:
            logger.info("Nothing to match — exiting early")
            return _finalise(summary, t0)

        # Initial unmatched sets
        unmatched_gw  = {gw["id"] for gw in gateway_records}
        unmatched_bk  = {bk["id"] for bk in bank_records}
        unmatched_led = {led["id"] for led in ledger_records}

        # ---- Phase B: Match (no DB writes) ----------------------------------
        pass_results: list[PassResult] = []

        for pass_fn, pass_label in [
            (run_pass1, "Pass 1 — Exact"),
            (run_pass2, "Pass 2 — Tolerance"),
            (run_pass3, "Pass 3 — Refund"),
            (run_pass4, "Pass 4 — Split"),
        ]:
            logger.info("Starting %s", pass_label)
            pr = pass_fn(
                gateway_records, bank_records, ledger_records,
                unmatched_gw, unmatched_bk, unmatched_led,
            )
            pass_results.append(pr)
            # Feed residuals forward
            unmatched_gw  = pr.unmatched_gateway_ids
            unmatched_bk  = pr.unmatched_bank_ids
            unmatched_led = pr.unmatched_ledger_ids

            summary.pass_stats.append({
                "pass":          pass_label,
                "matched":       pr.matched_count,
                "stats":         pr.stats,
            })
            logger.info("%s: %d matches", pass_label, pr.matched_count)

        # Phase B.5 — Probabilistic Layer & AI Investigation
        logger.info("Starting Phase B.5 — Probabilistic (AI/Semantic)")
        # Instantiate scorers
        cal = get_default_calibration()
        fs_scorer = FellegiSunterScorer(cal)
        semantic_matcher = SemanticMatcher(hitl_threshold=0.6, hotl_threshold=0.8)

        ai_candidates = []
        fs_resolved = 0
        
        fs_results = fs_scorer.score_residuals(gateway_records, bank_records, unmatched_gw, unmatched_bk)
        for cand in fs_results:
            fs_resolved += 1
            # Check tier. If it's HITL (needs review), or if we just want to run AI explanation:
            if cand.tier.value in ("hitl", "hotl"):
                # Run the 3-role loop
                m_gw = next((g for g in gateway_records if g["id"] == cand.members[0].record_id), None)
                m_bk = next((b for b in bank_records if b["id"] == cand.members[1].record_id), None)
                
                if m_gw and m_bk:
                    # Role 1: Hard Facts
                    hf = compute_hard_facts(m_gw, m_bk)
                    # Role 2: AI Investigator
                    investigation = investigate_exception(hf, m_gw, m_bk, use_llm=True)
                    # Role 3: Verifier
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
            
            ai_candidates.append(cand)
            # Note: score_batch already discards from unmatched sets
            
        summary.pass_stats.append({
            "pass": "Pass 5 — Probabilistic (AI/Semantic)",
            "matched": fs_resolved,
            "stats": {"fellegi_resolved": fs_resolved, "semantic_resolved": 0},
        })
        logger.info("Phase B.5: %d AI matches", fs_resolved)

        # Pass 5 — exception routing
        logger.info("Starting Pass 5 — Exception queue")
        p5 = run_pass5(
            gateway_records, bank_records, ledger_records,
            unmatched_gw, unmatched_bk, unmatched_led,
        )
        exceptions: list[UnmatchedRecord] = getattr(p5, "_exceptions", [])
        summary.pass_stats.append({
            "pass":   "Pass 5 — Exception",
            "stats":  p5.stats,
        })

        # ---- Phase C: Persist -----------------------------------------------
        all_candidates = [c for pr in pass_results for c in pr.candidates] + ai_candidates

        n_persisted  = _persist_matches(conn, all_candidates, run_id)
        n_exceptions = _persist_exceptions(conn, exceptions, run_id)

        summary.total_matched    = n_persisted
        summary.total_exceptions = n_exceptions

        # Match rate: candidates / total gateway records processed
        total_gw = n_gw or 1  # avoid ZeroDivisionError
        summary.match_rate_pct = round(
            (n_persisted / total_gw) * 100, 2
        )

    except Exception as exc:
        logger.exception("Engine run %s failed: %s", run_id, exc)
        summary.errors.append(str(exc))
        raise

    return _finalise(summary, t0)


# ---------------------------------------------------------------------------
# Phase A: Load
# ---------------------------------------------------------------------------

def _load_unmatched(conn: Connection) -> tuple[list[dict], list[dict], list[dict]]:
    """Load all unmatched records from the three source tables."""
    gateway = conn.execute(text("""
        SELECT
            id,
            processor_account_id,
            external_transaction_id,
            order_id,
            gross_amount::TEXT         AS gross_amount,
            currency,
            mdr_fee_pct::TEXT          AS mdr_fee_pct,
            gst_rate::TEXT             AS gst_rate,
            tds_amount::TEXT           AS tds_amount,
            expected_net_amount::TEXT  AS expected_net_amount,
            status,
            parent_transaction_id,
            transaction_ts
        FROM canonical_transactions
        WHERE match_status = 'unmatched'
        ORDER BY transaction_ts ASC
    """)).mappings().all()

    bank = conn.execute(text("""
        SELECT
            id,
            utr,
            settlement_batch_id,
            net_amount::TEXT  AS net_amount,
            currency,
            value_date,
            narration
        FROM bank_settlements
        WHERE match_status = 'unmatched'
        ORDER BY value_date ASC
    """)).mappings().all()

    ledger = conn.execute(text("""
        SELECT
            id,
            order_id,
            expected_amount::TEXT  AS expected_amount,
            currency,
            status
        FROM merchant_ledger_entries
        WHERE match_status = 'unmatched'
        ORDER BY id ASC
    """)).mappings().all()

    return (
        [dict(row) for row in gateway],
        [dict(row) for row in bank],
        [dict(row) for row in ledger],
    )


# ---------------------------------------------------------------------------
# Phase C: Persist matches
# ---------------------------------------------------------------------------

def _persist_matches(
    conn: Connection,
    candidates: list[MatchCandidate],
    run_id: str,
) -> int:
    """
    Write match candidates to ``matches``, ``match_members``, and ``audit_log``.

    Uses ``ON CONFLICT DO NOTHING`` so re-runs are idempotent.
    Returns count of actually-inserted match rows.
    """
    persisted = 0
    now = datetime.now(timezone.utc)

    for candidate in candidates:
        match_id = str(uuid.uuid4())
        status   = _tier_to_status(candidate.tier)

        # Insert into matches
        result = conn.execute(text("""
            INSERT INTO matches (
                id, match_pass, tier, status,
                confidence_score, match_explanation, created_at
            ) VALUES (
                :match_id, :pass, :tier, :status,
                :confidence, :explanation::jsonb, :now
            )
            ON CONFLICT DO NOTHING
            RETURNING id
        """), {
            "match_id":    match_id,
            "pass":        candidate.matched_pass.value,
            "tier":        candidate.tier.value,
            "status":      status,
            "confidence":  str(candidate.confidence_score) if candidate.confidence_score else None,
            "explanation": json.dumps(candidate.explanation),
            "now":         now,
        })

        if not result.fetchone():
            # ON CONFLICT — already inserted in a previous run
            continue

        # Insert match members
        for member in candidate.members:
            conn.execute(text("""
                INSERT INTO match_members (
                    match_id, record_type, record_id
                ) VALUES (
                    :match_id, :record_type, :record_id
                )
                ON CONFLICT DO NOTHING
            """), {
                "match_id":    match_id,
                "record_type": member.record_type.value,
                "record_id":   member.record_id,
            })

        # Update source record match_status
        _update_record_statuses(conn, candidate, match_id, status)

        # Mandatory audit log (AGENTS.md rule 3)
        _write_audit_log(conn, match_id, candidate, run_id, now)

        persisted += 1

    logger.info("Persisted %d / %d match candidates", persisted, len(candidates))
    return persisted


def _update_record_statuses(
    conn: Connection,
    candidate: MatchCandidate,
    match_id: str,
    status: str,
) -> None:
    """Update match_status on source records to prevent double-matching."""
    from src.matching.types import RecordType

    table_map = {
        RecordType.CANONICAL_TRANSACTION: "canonical_transactions",
        RecordType.BANK_SETTLEMENT:       "bank_settlements",
        RecordType.MERCHANT_LEDGER:       "merchant_ledger_entries",
    }

    for member in candidate.members:
        table = table_map[member.record_type]
        conn.execute(text(f"""
            UPDATE {table}
            SET match_status = :status,
                match_id     = :match_id
            WHERE id = :record_id
              AND match_status = 'unmatched'
        """), {
            "status":    status,
            "match_id":  match_id,
            "record_id": member.record_id,
        })


def _tier_to_status(tier: MatchTier) -> str:
    """Map approval tier to the initial DB match_status."""
    return {
        MatchTier.HOOTL: "confirmed",
        MatchTier.HOTL:  "pending_hotl",
        MatchTier.HITL:  "pending_hitl",
    }[tier]


# ---------------------------------------------------------------------------
# Phase C: Persist exceptions
# ---------------------------------------------------------------------------

def _persist_exceptions(
    conn: Connection,
    exceptions: list[UnmatchedRecord],
    run_id: str,
) -> int:
    """Write exception records and their audit log entries."""
    now = datetime.now(timezone.utc)
    persisted = 0

    for exc in exceptions:
        exc_id = str(uuid.uuid4())
        conn.execute(text("""
            INSERT INTO exceptions (
                id, record_type, record_id,
                category, dollar_value,
                run_id, created_at
            ) VALUES (
                :exc_id, :record_type, :record_id,
                :category, :dollar_value,
                :run_id, :now
            )
            ON CONFLICT (record_type, record_id) DO NOTHING
        """), {
            "exc_id":       exc_id,
            "record_type":  exc.record_type.value,
            "record_id":    exc.record_id,
            "category":     exc.suggested_category.value,
            "dollar_value": str(exc.dollar_value),
            "run_id":       run_id,
            "now":          now,
        })

        # Audit log for every exception (AGENTS.md rule 3)
        conn.execute(text("""
            INSERT INTO audit_log (
                id, event_type, entity_type, entity_id,
                actor, payload, created_at
            ) VALUES (
                :id, 'exception_queued', :record_type, :record_id,
                :actor, :payload::jsonb, :now
            )
        """), {
            "id":          str(uuid.uuid4()),
            "record_type": exc.record_type.value,
            "record_id":   str(exc.record_id),
            "actor":       f"engine/{run_id}",
            "payload":     json.dumps({
                "run_id":   run_id,
                "category": exc.suggested_category.value,
                "amount":   str(exc.dollar_value),
            }),
            "now": now,
        })
        persisted += 1

    logger.info("Persisted %d exceptions", persisted)
    return persisted


# ---------------------------------------------------------------------------
# Audit log writer
# ---------------------------------------------------------------------------

def _write_audit_log(
    conn: Connection,
    match_id: str,
    candidate: MatchCandidate,
    run_id: str,
    now: datetime,
) -> None:
    """
    Write a mandatory audit log entry for every match decision.

    AGENTS.md rule 3: every match — automated or human-approved — writes an
    audit log entry with what matched, which rule/model produced it, and the
    confidence breakdown.  No exceptions, including for Tier-1 auto-matches.
    """
    payload = {
        "run_id":           run_id,
        "match_id":         match_id,
        "pass":             candidate.matched_pass.value,
        "tier":             candidate.tier.value,
        "confidence_score": str(candidate.confidence_score) if candidate.confidence_score else None,
        "member_count":     len(candidate.members),
        "members":          [
            {"record_type": m.record_type.value, "record_id": m.record_id}
            for m in candidate.members
        ],
        "explanation_summary": candidate.explanation.get("human_readable_summary", ""),
    }

    conn.execute(text("""
        INSERT INTO audit_log (
            id, event_type, entity_type, entity_id,
            actor, payload, created_at
        ) VALUES (
            :id, 'match_created', 'match', :match_id,
            :actor, :payload::jsonb, :now
        )
    """), {
        "id":       str(uuid.uuid4()),
        "match_id": match_id,
        "actor":    f"engine/{run_id}",
        "payload":  json.dumps(payload),
        "now":      now,
    })


# ---------------------------------------------------------------------------
# Finalise summary
# ---------------------------------------------------------------------------

def _finalise(summary: EngineRunSummary, t0: float) -> EngineRunSummary:
    completed_at = datetime.now(timezone.utc)
    summary.completed_at     = completed_at.isoformat()
    summary.duration_seconds = round(time.monotonic() - t0, 3)
    logger.info(
        "Engine run %s finished in %.3fs | matched=%d | exceptions=%d | match_rate=%.1f%%",
        summary.run_id,
        summary.duration_seconds,
        summary.total_matched,
        summary.total_exceptions,
        summary.match_rate_pct,
    )
    return summary

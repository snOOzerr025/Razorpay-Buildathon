# 06 — API Specification

All endpoints require an `Authorization: Bearer <token>` header. Response envelope is consistent
JSON; errors return `{"error": {"code": "...", "message": "..."}}`.

## Ingestion
**POST /api/v1/ingest/raw-event**
```json
// Request
{
  "processor_id": "razorpay_gateway",
  "external_event_id": "evt_abc123",
  "event_type": "payment.captured",
  "payload": { "...": "raw gateway payload" }
}
// Response 201
{ "raw_event_id": 8842, "status": "queued_for_normalization" }
```
Idempotent on `(processor_id, external_event_id, event_type)` — a duplicate call returns the
existing `raw_event_id` with `status: "duplicate_ignored"`, not a new row.

## Reconciliation run
**POST /api/v1/reconcile/run** — triggers the 5-pass engine + probabilistic layer over unmatched
records. `{"scope": "incremental" | "full"}`. Returns a `run_id` for polling.

**GET /api/v1/reconcile/runs/{run_id}**
```json
{
  "run_id": "run_2026_08_22_001",
  "status": "completed",
  "records_processed": 12000,
  "duration_ms": 4210,
  "throughput_per_sec": 2850,
  "matches_by_pass": {"pass1_exact": 10320, "pass2_tolerance": 640, "pass3_refund": 210,
                        "pass4_split": 440, "fellegi_sunter": 280, "semantic": 60},
  "exceptions_created": 50
}
```
This is the "believable results report" — total processed, match rate, breakdown by mechanism —
that should headline the dashboard, not be buried in logs.

## Matches
**GET /api/v1/matches?tier=hitl&status=pending** — list matches awaiting review.
**GET /api/v1/matches/{id}** — full record including `match_explanation` (schema in `03_DATA_MODEL.md` §6).
**POST /api/v1/matches/{id}/approve** — `{"reviewer_id": "...", "note": "optional"}` → writes
`audit_log` entry with actor + rationale, flips `posted = true`.
**POST /api/v1/matches/{id}/reject** — `{"reviewer_id": "...", "reason": "..."}` → creates an
`exceptions` row, writes `audit_log` entry.

## Exceptions
**GET /api/v1/exceptions?category=bank_initiated&status=open** — the "honest exception list."
**POST /api/v1/exceptions/{id}/resolve** — `{"resolution_note": "...", "resolved_by": "..."}`.
**POST /api/v1/exceptions/{id}/compensate** — creates a `compensating_entries` row referencing the
original match; never mutates the original.

## Dashboard metrics
**GET /api/v1/dashboard/metrics**
```json
{
  "total_processed": 12000,
  "automated_match_rate_pct": 94.6,
  "net_discrepancy_value": 1420.50,
  "exceptions_by_category": {"timing_difference": 18, "transaction_error": 6,
                               "bank_initiated": 4, "unresolved": 22},
  "throughput_records_per_sec": 2850,
  "confidence_score_distribution": {"p10": 0.71, "p50": 0.94, "p90": 0.99}
}
```

## Audit log (read-only, for the panel demo)
**GET /api/v1/audit-log?entity_type=match&entity_id=4471** — full history for a single record,
proving the "who, what, when, why" trail end to end.

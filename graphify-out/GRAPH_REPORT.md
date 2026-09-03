# Graph Report - Razorpay-Buildathon  (2026-09-03)

## Corpus Check
- Large corpus: 176 files · ~940,260 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 913 nodes · 1782 edges · 65 communities (34 shown, 22 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 90 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- connection
- src_ingestion_normal
- synthetic_data_gener
- src_matching_probabi
- parity_site_src_app_
- src_matching_probabi
- tests_unit_test_matc
- src_ingestion_idempo
- engine
- parity_site_tsconfig
- ndarray
- src_matching_passes_
- src_matching_passes_
- basemodel
- parity_site_src_app_
- httpauthorizationcre
- src_matching_passes_
- patch
- demo_landing_package
- framer_motion
- src_api_routes_match
- tests_conftest
- parity_site_package_
- frontend_package
- parity_site_src_app_
- src_matching_passes_
- tests_unit_test_matc
- scripts_red_team_aud
- src_matching_passes_
- parity_site_package
- exception_handler
- migrations_env
- migrations_versions_
- src_api_main_health_
- src_api_routes_dashb
- frontend_src_counter
- parity_site_src_app_
- lenis
- lucide_react
- next
- parity_site_next_con
- parity_site_package_
- parity_site_package_
- parity_site_package_
- parity_site_package_
- parity_site_package_
- parity_site_package_
- parity_site_postcss_
- src_db_engine_load_e
- src_ingestion_init
- src_init
- src_matching_init
- src_matching_probabi
- synthetic_data_init
- tests_integration_in
- pkg_recon_controller

## God Nodes (most connected - your core abstractions)
1. `_gw()` - 33 edges
2. `MatchTier` - 32 edges
3. `run_pass1()` - 31 edges
4. `MatchPass` - 31 edges
5. `run_pass4()` - 30 edges
6. `run_pass2()` - 28 edges
7. `run_pass3()` - 26 edges
8. `run_pass5()` - 26 edges
9. `_bank()` - 26 edges
10. `RecordType` - 25 edges

## Surprising Connections (you probably didn't know these)
- `run_in_memory_engine()` --indirect_call--> `run_pass1()`  [INFERRED]
  scripts/run_scale_test.py → src/matching/passes/pass1.py
- `run_in_memory_engine()` --indirect_call--> `run_pass2()`  [INFERRED]
  scripts/run_scale_test.py → src/matching/passes/pass2.py
- `run_in_memory_engine()` --indirect_call--> `run_pass3()`  [INFERRED]
  scripts/run_scale_test.py → src/matching/passes/pass3.py
- `TestPass4SubsetSum` --uses--> `MatchPass`  [INFERRED]
  tests/unit/test_matching_pass4_pass5.py → src/matching/types.py
- `TestPass1Exact` --uses--> `MatchPass`  [INFERRED]
  tests/unit/test_matching_passes.py → src/matching/types.py

## Import Cycles
- None detected.

## Communities (65 total, 22 thin omitted)

### Community 0 - "connection"
Cohesion: 0.05
Nodes (94): Connection, datetime, ExceptionCategory, generate_data(), load_csv(), main(), naive_baseline(), Path (+86 more)

### Community 1 - "src_ingestion_normal"
Cohesion: 0.06
Nodes (48): NormalizationError, normalize_bank_settlement(), normalize_gateway_transaction(), normalize_ledger_entry(), _parse_amount(), _parse_currency(), _parse_date(), _parse_rate() (+40 more)

### Community 2 - "synthetic_data_gener"
Cohesion: 0.06
Nodes (32): AnomalyManifest, BankSettlement, GatewayTransaction, main(), MerchantLedgerEntry, Path, Synthetic data generator for the reconciliation engine. Generates all three…, Records every injected anomaly so the red-team checklist can verify each one. (+24 more)

### Community 3 - "src_matching_probabi"
Cohesion: 0.07
Nodes (34): calibrate_from_synthetic(), CalibrationResult, _check_agreement(), FieldCalibration, Any, date, Path, Calibration — estimate m/u probabilities from synthetic ground truth. The… (+26 more)

### Community 4 - "parity_site_src_app_"
Cohesion: 0.07
Nodes (18): chartData, ArchitectureSequence(), passes, Chatbot(), Message, Footer(), HeroScene(), LivingInvariant() (+10 more)

### Community 5 - "src_matching_probabi"
Cohesion: 0.09
Nodes (23): HardFacts, investigate_exception(), _investigate_with_heuristic(), _investigate_with_llm(), InvestigationResult, date, AI Investigation Layer (Role 1, 2, 3 Loop) Role 1: Compute hard facts…, Role 2: Determine why the pair failed and recommend an action. Uses a… (+15 more)

### Community 6 - "tests_unit_test_matc"
Cohesion: 0.10
Nodes (18): _bank(), _gw(), 300 + 400 + 300 = 1000 exactly., Subset sum of 999.97 vs bank 1000.00 → delta 0.03 within ₹0.05., 200 + 800 = 1000 AND 500 + 500 = 1000 → ambiguous → no match., Gateway record from 10 days before settlement is outside POOL_DATE_WINDOW., If a single transaction exceeds the batch total, it can't be part of it., Negative bank settlements (refunds) should be ignored by Pass 4. (+10 more)

### Community 7 - "src_ingestion_idempo"
Cohesion: 0.11
Nodes (26): compute_payload_hash(), IdempotencyOutcome, insert_raw_event_idempotent(), Any, Enum, Two-layer idempotency for raw event ingestion. Layer 1 — Content hash check…, Deterministic sha256 of a JSON payload. Keys are sorted so that identical…, Insert a raw event, skipping gracefully if it already exists. Parameters… (+18 more)

### Community 8 - "engine"
Cohesion: 0.13
Nodes (26): Engine, on_event, sessionmaker, FastAPI application entrypoint for the Reconciliation Controller., shutdown_event(), dispose_engines(), get_admin_engine(), get_app_engine() (+18 more)

### Community 9 - "parity_site_tsconfig"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 10 - "ndarray"
Cohesion: 0.11
Nodes (13): ndarray, Any, Get embedding for a text string, using cache., Simple character n-gram TF-IDF fallback (no external dependencies)., Compute cosine similarity between two text strings., Score text similarity for blocked residual pairs. Only pairs that pass hard-…, Semantic similarity matcher using text embeddings. Usage:: matcher =…, SemanticMatcher (+5 more)

### Community 11 - "src_matching_passes_"
Cohesion: 0.11
Nodes (18): _build_explanation(), _decimal(), Any, date, Decimal, Return True iff gw satisfies Pass-2 criteria for the given bank record., Execute Pass 2: tolerance-aware match (settlement lag + fee rounding). Only…, run_pass2() (+10 more)

### Community 12 - "src_matching_passes_"
Cohesion: 0.17
Nodes (12): Execute Pass 1: exact 1-to-1 match between gateway and bank records. Parameters…, run_pass1(), _bank(), ±1 day is within tolerance., ±2 days exceeds the exact-match tolerance → not matched by Pass 1., Pass 1 requires reference agreement — no UTR/narration match → skip., UTR appearing in narration counts as a reference match., Deterministic passes must never fabricate a confidence score. (+4 more)

### Community 13 - "basemodel"
Cohesion: 0.15
Nodes (20): BaseModel, compensate_exception(), list_exceptions(), get, post, Session, Exceptions endpoints for fetching exception queues and handling resolution…, Create a compensating entry for an exception to fix ledger imbalance. Never… (+12 more)

### Community 14 - "parity_site_src_app_"
Cohesion: 0.15
Nodes (11): AuditTrailPage(), PASSES, Exception, ExceptionCategory, ExceptionStatus, mockExceptions, mockRuns, progressiveRunData (+3 more)

### Community 15 - "httpauthorizationcre"
Cohesion: 0.13
Nodes (16): HTTPAuthorizationCredentials, get_db_session(), Session, FastAPI Dependencies for the Recon API. Handles database session injection and…, FastAPI dependency that yields a SQLAlchemy session. Uses the underlying…, Verify the static bearer token. For buildathon scope, we check against an…, verify_token(), Dashboard metrics endpoint for the reconciliation system. (+8 more)

### Community 16 - "src_matching_passes_"
Cohesion: 0.20
Nodes (10): Any, Execute Pass 3: refund / reversal linkage. Only operates on gateway records…, run_pass3(), _gw(), Refund gross > parent gross → must not produce a match candidate., No parent_transaction_id → orphaned refund, no guess, no candidate., A refund matched to its parent but with no bank credit yet is still a valid…, Refund/reversal matches are HOTL, not HOOTL. (+2 more)

### Community 17 - "patch"
Cohesion: 0.12
Nodes (7): patch, mock_db(), fixture, Unit tests for the FastAPI layer. Uses TestClient to verify routing,…, Mock SQLAlchemy Session dependency., test_healthcheck(), test_reconcile_run_success()

### Community 18 - "demo_landing_package"
Cohesion: 0.13
Nodes (14): dependencies, gsap, devDependencies, vite, gsap, vite, name, private (+6 more)

### Community 19 - "framer_motion"
Cohesion: 0.13
Nodes (15): framer-motion, fuse.js, dependencies, framer-motion, fuse.js, gsap, react, react-dom (+7 more)

### Community 20 - "src_api_routes_match"
Cohesion: 0.21
Nodes (13): approve_match(), get_match(), list_matches(), get, post, Session, Matches endpoints for fetching pending matches and handling manual…, Reject a pending match. Updates the match status to 'rejected', converts the… (+5 more)

### Community 21 - "tests_conftest"
Cohesion: 0.19
Nodes (12): db_engine(), pg_conn(), fixture, pytest conftest.py — shared fixtures for all test layers. Unit tests (no DB…, Session-scoped engine for integration tests. Requires DATABASE_URL to be set…, Function-scoped connection wrapped in a SAVEPOINT. Each test gets a clean…, Minimal valid gateway CSV row for normalizer tests., Minimal valid bank settlement CSV row. (+4 more)

### Community 22 - "parity_site_package_"
Cohesion: 0.15
Nodes (13): devDependencies, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom, typescript, tailwindcss (+5 more)

### Community 23 - "frontend_package"
Cohesion: 0.17
Nodes (11): devDependencies, vite, vite, name, private, scripts, build, dev (+3 more)

### Community 24 - "parity_site_src_app_"
Cohesion: 0.23
Nodes (7): inter, metadata, plexMono, spaceGrotesk, GrainOverlay(), Providers(), initLenis()

### Community 25 - "src_matching_passes_"
Cohesion: 0.33
Nodes (3): _find_subsets(), Find up to ``max_solutions`` subsets of pool_paise that sum within…, TestFindSubsets

### Community 26 - "tests_unit_test_matc"
Cohesion: 0.20
Nodes (6): _led(), Unit tests for matching Passes 1, 2, and 3. All tests run entirely in memory —…, When order_id links a ledger record, it should be included in members., Records matched by Pass 1 (removed from unmatched sets) must not appear in Pass…, Zero-amount transactions (edge case) should not crash., TestPassChaining

### Community 27 - "scripts_red_team_aud"
Cohesion: 0.47
Nodes (8): Red-Team Audit Script for Razorpay Buildathon. Automates the 5 red-team…, run_all(), run_pytest(), test_ambiguous_subset_sum(), test_duplicate_webhook(), test_hitl_validation(), test_malformed_event(), test_prompt_injections()

### Community 28 - "src_matching_passes_"
Cohesion: 0.25
Nodes (9): _build_explanation(), _decimal(), _exact_match(), Any, date, Return True iff gw and bank pass ALL Pass-1 criteria., Build the structured match_explanation for Pass 1., Convert a date / datetime / ISO string to a ``datetime.date``. (+1 more)

### Community 29 - "parity_site_package"
Cohesion: 0.25
Nodes (7): name, private, scripts, build, dev, start, version

### Community 30 - "exception_handler"
Cohesion: 0.33
Nodes (7): exception_handler, Request, RequestValidationError, global_exception_handler(), Format Pydantic validation errors strictly to the spec envelope., Fallback handler for unhandled exceptions., validation_exception_handler()

### Community 31 - "migrations_env"
Cohesion: 0.33
Nodes (5): Alembic env.py — migration runtime environment. Key design choices…, Emit SQL to stdout without connecting to the database. Called by: ``alembic…, Connect to the database and run migrations inside a transaction. Each migration…, run_migrations_offline(), run_migrations_online()

### Community 33 - "src_api_main_health_"
Cohesion: 0.50
Nodes (4): health_check(), Any, get, DB schema and connection verification.

### Community 34 - "src_api_routes_dashb"
Cohesion: 0.50
Nodes (4): get_dashboard_metrics(), get, Session, Get aggregated metrics for the frontend dashboard.

## Knowledge Gaps
- **82 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+77 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 363 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SyntheticGenerator` connect `synthetic_data_gener` to `connection`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `MatchTier` connect `connection` to `src_matching_probabi`, `tests_unit_test_matc`, `ndarray`, `src_matching_passes_`, `src_matching_passes_`, `src_matching_passes_`, `src_api_routes_match`, `tests_unit_test_matc`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `run_pass4()` connect `connection` to `src_matching_passes_`, `tests_unit_test_matc`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Are the 16 inferred relationships involving `MatchTier` (e.g. with `run_in_memory_engine()` and `run_matching_engine()`) actually correct?**
  _`MatchTier` has 16 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `run_pass1()` (e.g. with `run_in_memory_engine()` and `run_matching_engine()`) actually correct?**
  _`run_pass1()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 16 inferred relationships involving `MatchPass` (e.g. with `_build_explanation()` and `run_pass1()`) actually correct?**
  _`MatchPass` has 16 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `run_pass4()` (e.g. with `run_in_memory_engine()` and `run_matching_engine()`) actually correct?**
  _`run_pass4()` has 5 INFERRED edges - model-reasoned connections that need verification._
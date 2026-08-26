@AGENTS.md

# Claude Code-specific notes

- Backend test command: `pytest -q`
- Frontend test command: `npm test`
- Before marking any task complete: run the full test suite, then run the synthetic red-team batch
  (`docs/07_TEST_AND_REDTEAM_PLAN.md` §2) and report updated match-rate/throughput numbers if the
  matching engine or schema changed.
- Do not run `/init` — this file already imports the canonical instructions via `@AGENTS.md`.
- If you add a new module, update `docs/02_ARCHITECTURE.md`'s diagram to keep architecture and code
  in sync — the panel interview will compare the repo against the architecture doc.

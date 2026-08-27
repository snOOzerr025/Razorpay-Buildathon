"""
src.matching.probabilistic — Fellegi-Sunter scoring and semantic embeddings.

Module layout
-------------
sanitize.py         — Prompt-injection defense: strips external text to expected
                      fields before any LLM/embedding call (AGENTS.md rule 4)
fellegi_sunter.py   — Bayesian record-linkage scorer with calibrated m/u from
                      synthetic ground truth (docs/04 §2)
calibration.py      — Utility to estimate m/u probabilities from the synthetic
                      generator's ground_truth.json
embeddings.py       — Cosine-similarity gate on text fields, blocked by hard
                      field agreement first (docs/04 §3)
"""

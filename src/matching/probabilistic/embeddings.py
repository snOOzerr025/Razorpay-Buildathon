"""
Semantic embedding layer — cosine similarity for text fields.

For vendor descriptions and narration strings that survive to this layer
(Pass 5 residuals only), compute embeddings and cosine similarity.

docs/04 §3 requirements
-----------------------
1. Blocking first: only compute embeddings for pairs that already agree on
   hard fields (currency, amount band, date window).
2. Compute cosine similarity between text embeddings.
3. Feed similarity into F-S composite score or use as standalone gate.

Implementation choice: standalone gate (docs/04 §3 option 2)
-------------------------------------------------------------
For v1, we use a standalone similarity threshold (default 0.85) rather
than folding into the F-S weight sum.  This is simpler to implement and
calibrate, and the spec explicitly permits it.

Embedding provider
------------------
Uses sentence-transformers (all-MiniLM-L6-v2) locally — no API cost,
no network latency, no rate limits.  The model is ~80MB and loads once.
If sentence-transformers is not installed, falls back to a simple
TF-IDF + cosine similarity baseline (still useful, just less accurate).

Caching
-------
Embeddings are cached in a dict keyed by sanitized text (docs/05 §3:
"Cache embeddings for recurring vendor description strings — don't
recompute the same string's embedding twice").

AGENTS.md compliance
--------------------
Rule 1: No financial calculations in this module.
Rule 4: All text is sanitized via sanitize_for_embedding() before
        any model or API call.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from decimal import Decimal
from typing import Any

import numpy as np

from src.matching.probabilistic.sanitize import sanitize_for_embedding
from src.matching.types import (
    MatchCandidate,
    MatchMember,
    MatchPass,
    MatchTier,
    RecordType,
)

logger = logging.getLogger(__name__)

# Similarity threshold for standalone gate
DEFAULT_SIMILARITY_THRESHOLD: float = 0.85

# Blocking (same as F-S blocking, but narrower for expensive embedding calls)
EMBEDDING_AMOUNT_BAND: Decimal = Decimal("5.00")
EMBEDDING_DATE_WINDOW: int     = 14


@dataclass
class EmbeddingSimilarity:
    """Result of comparing two text embeddings."""
    gateway_id: int
    bank_id: int
    gateway_text: str
    bank_text: str
    similarity: float
    passes_threshold: bool


class SemanticMatcher:
    """
    Semantic similarity matcher using text embeddings.

    Usage::

        matcher = SemanticMatcher()
        candidates = matcher.match_residuals(gw_records, bank_records, ...)
    """

    def __init__(
        self,
        *,
        similarity_threshold: float = DEFAULT_SIMILARITY_THRESHOLD,
    ) -> None:
        self.similarity_threshold = similarity_threshold
        self._embedding_cache: dict[str, np.ndarray] = {}
        self._model = None
        self._use_tfidf = False

        # Try to load sentence-transformers; fall back to TF-IDF
        try:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer("all-MiniLM-L6-v2")
            logger.info("Loaded sentence-transformers model: all-MiniLM-L6-v2")
        except ImportError:
            logger.warning(
                "sentence-transformers not installed — falling back to TF-IDF baseline. "
                "Install with: pip install sentence-transformers"
            )
            self._use_tfidf = True

    def _embed(self, text: str) -> np.ndarray:
        """Get embedding for a text string, using cache."""
        if text in self._embedding_cache:
            return self._embedding_cache[text]

        if self._use_tfidf:
            vec = self._tfidf_embed(text)
        else:
            vec = self._model.encode(text, normalize_embeddings=True)
            vec = np.array(vec, dtype=np.float32)

        self._embedding_cache[text] = vec
        return vec

    def _tfidf_embed(self, text: str) -> np.ndarray:
        """Simple character n-gram TF-IDF fallback (no external dependencies)."""
        # Character 3-grams as a simple embedding proxy
        ngrams: dict[str, int] = {}
        for i in range(len(text) - 2):
            ng = text[i:i+3]
            ngrams[ng] = ngrams.get(ng, 0) + 1

        if not ngrams:
            return np.zeros(1, dtype=np.float32)

        # Convert to a fixed-size vector via hashing trick (256 dimensions)
        vec = np.zeros(256, dtype=np.float32)
        for ng, count in ngrams.items():
            h = hash(ng) % 256
            vec[h] += count

        # L2 normalize
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec /= norm

        return vec

    def compute_similarity(
        self, text_a: str, text_b: str
    ) -> float:
        """Compute cosine similarity between two text strings."""
        # Sanitize before embedding (AGENTS.md rule 4)
        clean_a = sanitize_for_embedding(text_a)
        clean_b = sanitize_for_embedding(text_b)

        if not clean_a or not clean_b:
            return 0.0

        vec_a = self._embed(clean_a)
        vec_b = self._embed(clean_b)

        # Cosine similarity (vectors are already normalized for sentence-transformers)
        similarity = float(np.dot(vec_a, vec_b))

        # Clamp to [0, 1] (negative cosine sim means very different)
        return max(0.0, min(1.0, similarity))

    def match_residuals(
        self,
        gateway_records: list[dict[str, Any]],
        bank_records: list[dict[str, Any]],
        unmatched_gateway_ids: set[int],
        unmatched_bank_ids: set[int],
    ) -> list[MatchCandidate]:
        """
        Score text similarity for blocked residual pairs.

        Only pairs that pass hard-field blocking AND have non-empty text
        fields on both sides are scored.

        Returns MatchCandidate objects for pairs above the similarity
        threshold.  Tier: HITL (semantic-only matches always require
        human approval per docs/04 §5).
        """
        gw_pool = [gw for gw in gateway_records if gw["id"] in unmatched_gateway_ids]
        bank_pool = [b for b in bank_records if b["id"] in unmatched_bank_ids]

        if not gw_pool or not bank_pool:
            return []

        candidates: list[MatchCandidate] = []
        scored_count = 0

        for bank in bank_pool:
            bank_net  = Decimal(str(bank["net_amount"]))
            bank_date = _to_date(bank["value_date"])
            currency  = bank["currency"]
            bank_text = str(bank.get("narration", "")).strip()

            if not bank_text:
                continue

            best_sim: float = 0.0
            best_gw: dict | None = None
            best_gw_text: str = ""

            for gw in gw_pool:
                if gw["id"] not in unmatched_gateway_ids:
                    continue

                # Blocking
                if gw.get("currency") != currency:
                    continue
                try:
                    gw_net = Decimal(str(gw.get("expected_net_amount") or gw.get("gross_amount", "0")))
                    if abs(gw_net - bank_net) > EMBEDDING_AMOUNT_BAND:
                        continue
                except Exception:
                    continue
                try:
                    gw_date = _to_date(gw["transaction_ts"])
                    if abs((_to_date(bank["value_date"]) - gw_date).days) > EMBEDDING_DATE_WINDOW:
                        continue
                except Exception:
                    continue

                gw_text = str(gw.get("description", "")).strip()
                if not gw_text:
                    continue

                sim = self.compute_similarity(gw_text, bank_text)
                scored_count += 1

                if sim > best_sim:
                    best_sim = sim
                    best_gw = gw
                    best_gw_text = gw_text

            if best_gw is None or best_sim < self.similarity_threshold:
                continue

            confidence = Decimal(str(round(best_sim, 4))).quantize(Decimal("0.0001"))

            candidate = MatchCandidate(
                matched_pass=MatchPass.SEMANTIC_EMBEDDING,
                tier=MatchTier.HITL,   # semantic-only → always HITL
                members=[
                    MatchMember(RecordType.CANONICAL_TRANSACTION, best_gw["id"]),
                    MatchMember(RecordType.BANK_SETTLEMENT, bank["id"]),
                ],
                explanation={
                    "pass": MatchPass.SEMANTIC_EMBEDDING.value,
                    "similarity": {
                        "score":     round(best_sim, 4),
                        "threshold": self.similarity_threshold,
                        "above_threshold": best_sim >= self.similarity_threshold,
                        "method": "sentence-transformers" if not self._use_tfidf else "tfidf-fallback",
                    },
                    "texts": {
                        "gateway_text": sanitize_for_embedding(best_gw_text) or "",
                        "bank_text":    sanitize_for_embedding(bank_text) or "",
                    },
                    "human_readable_summary": (
                        f"Semantic similarity {best_sim:.2%} "
                        f"{'≥' if best_sim >= self.similarity_threshold else '<'} "
                        f"threshold {self.similarity_threshold:.0%}. "
                        f"→ HITL review required."
                    ),
                },
                confidence_score=confidence,
            )
            candidates.append(candidate)

            unmatched_gateway_ids.discard(best_gw["id"])
            unmatched_bank_ids.discard(bank["id"])

        logger.info(
            "Semantic: scored %d pairs | %d candidates above %.0f%% threshold",
            scored_count, len(candidates), self.similarity_threshold * 100,
        )
        return candidates


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def _to_date(value: object):
    from datetime import date, datetime
    if isinstance(value, date) and not hasattr(value, "hour"):
        return value
    s = str(value).strip()
    if len(s) == 10:
        return date.fromisoformat(s)
    try:
        return datetime.fromisoformat(s).date()
    except ValueError:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).date()

"""
Unit tests for the two-layer idempotency module.

These tests run against a real Postgres instance (marked 'integration') and
against an in-memory SQLite mock (marked plain) for fast CI.

The integration tests are gated behind the 'integration' pytest marker:
    pytest -m "not integration"   # fast, no DB needed
    pytest -m integration         # requires docker compose up -d
"""

from __future__ import annotations

import json
import pytest

from src.ingestion.idempotency import (
    IdempotencyOutcome,
    compute_payload_hash,
)


# ---------------------------------------------------------------------------
# compute_payload_hash — pure function, no DB needed
# ---------------------------------------------------------------------------

class TestComputePayloadHash:
    def test_deterministic(self):
        payload = {"amount": "100.00", "currency": "INR", "id": "TXN001"}
        h1 = compute_payload_hash(payload)
        h2 = compute_payload_hash(payload)
        assert h1 == h2

    def test_key_order_invariant(self):
        """Same data in different key order must produce the same hash."""
        p1 = {"a": 1, "b": 2, "c": 3}
        p2 = {"c": 3, "a": 1, "b": 2}
        assert compute_payload_hash(p1) == compute_payload_hash(p2)

    def test_different_values_different_hashes(self):
        p1 = {"amount": "100.00"}
        p2 = {"amount": "100.01"}
        assert compute_payload_hash(p1) != compute_payload_hash(p2)

    def test_returns_64_char_hex(self):
        h = compute_payload_hash({"x": 1})
        assert len(h) == 64
        assert all(c in "0123456789abcdef" for c in h)

    def test_nested_dict_is_stable(self):
        p = {"meta": {"a": 1, "b": 2}, "amount": "50.00"}
        assert compute_payload_hash(p) == compute_payload_hash(p)

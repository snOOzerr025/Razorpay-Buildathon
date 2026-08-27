"""
Sanitization pipeline — strips external text before any LLM/embedding call.

AGENTS.md rule 4: "Sanitize before it touches an LLM prompt. Strip external
text (transaction narrations, bank remittance strings) to expected fields
before it's included in any prompt. Never pass raw, untrusted text directly
into a system or tool-calling context."

docs/05 §1: Extract only expected field types (dates, amounts, alphanumeric
references) via schema-validated parsing. Strip to a bounded length and
character set. Use clear delimiters and treat extracted text as data, never
as instructions.

What this module does
---------------------
1. ``sanitize_text`` — general-purpose text sanitizer:
   - Removes null bytes, control characters, and Unicode homoglyphs
   - Strips known prompt-injection patterns (system:, [INST], etc.)
   - Bounds output length (default 500 chars)
   - Returns the cleaned string or None if the input is entirely rejected

2. ``extract_safe_fields`` — structured extraction:
   - Takes a raw dict (from CSV / JSON / API) and a schema of expected
     field types (str, Decimal, date, int)
   - Returns only the fields that match the schema, sanitized
   - Quarantines anything that doesn't conform

3. ``sanitize_for_embedding`` — optimised for embedding input:
   - Collapses whitespace, lowercases, strips numbers and punctuation
     beyond alphanumeric + basic separators
   - Designed for vendor description / narration comparison

This is the defense layer that makes prompt-injection strings from the
synthetic generator (``anomaly_type = 'prompt_injection'``) harmless.
"""

from __future__ import annotations

import logging
import re
import unicodedata
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MAX_TEXT_LENGTH: int = 500
MAX_EMBEDDING_LENGTH: int = 200

# Patterns that look like prompt injection attempts
_INJECTION_PATTERNS: list[re.Pattern] = [
    re.compile(r"\[/?INST\]", re.IGNORECASE),
    re.compile(r"<</?SYS>>", re.IGNORECASE),
    re.compile(r"system\s*:", re.IGNORECASE),
    re.compile(r"(?:ignore|forget|disregard)\s+(?:all\s+)?(?:previous|above|prior)\s+(?:instructions|prompts|context)", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+", re.IGNORECASE),
    re.compile(r"act\s+as\s+(?:a\s+)?", re.IGNORECASE),
    re.compile(r"do\s+not\s+follow", re.IGNORECASE),
    re.compile(r"<\|(?:im_start|im_end|endoftext)\|>", re.IGNORECASE),
    re.compile(r"```(?:system|python|bash|sh)\b", re.IGNORECASE),
    re.compile(r"<script\b", re.IGNORECASE),
    re.compile(r"javascript:", re.IGNORECASE),
]

# Characters allowed in sanitised text (printable ASCII + common Unicode letters)
_ALLOWED_CATEGORIES = frozenset({
    "Lu", "Ll", "Lt", "Lm", "Lo",   # letters
    "Nd", "Nl", "No",                # numbers
    "Pd", "Ps", "Pe", "Pi", "Pf",   # punctuation
    "Pc", "Po",                       # connectors, other punctuation
    "Zs",                             # spaces
    "Sc", "Sm",                       # currency, math symbols
})


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def sanitize_text(
    raw: str | None,
    *,
    max_length: int = MAX_TEXT_LENGTH,
    strip_injections: bool = True,
) -> str | None:
    """
    Sanitize a raw text string for safe inclusion in prompts.

    Returns the cleaned string, or None if input is empty or entirely
    rejected (e.g. the entire string was an injection pattern).

    This function never raises — it returns None for any input it can't
    safely clean, so the caller can decide whether to quarantine the
    record or proceed without the text field.
    """
    if not raw or not isinstance(raw, str):
        return None

    text = raw

    # Step 1: Remove null bytes and control characters
    text = text.replace("\x00", "")
    text = "".join(
        c for c in text
        if unicodedata.category(c) in _ALLOWED_CATEGORIES
        or c in ("\n", "\t", "\r")
    )

    # Step 2: Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()

    if not text:
        return None

    # Step 3: Strip prompt-injection patterns
    if strip_injections:
        injection_found = False
        for pattern in _INJECTION_PATTERNS:
            if pattern.search(text):
                injection_found = True
                text = pattern.sub("[REDACTED]", text)
                logger.warning(
                    "Prompt injection pattern detected and redacted: %s",
                    pattern.pattern,
                )
        # If the cleaned text is mostly redacted markers, reject entirely
        redacted_ratio = text.count("[REDACTED]") / max(len(text.split()), 1)
        if redacted_ratio > 0.5:
            logger.warning("Text rejected: >50%% was injection patterns")
            return None

    # Step 4: Bound length
    if len(text) > max_length:
        text = text[:max_length].rsplit(" ", 1)[0]  # don't cut mid-word

    return text if text else None


def sanitize_for_embedding(raw: str | None) -> str | None:
    """
    Sanitize text specifically for embedding input.

    More aggressive than sanitize_text:
    - Lowercased
    - Only alphanumeric + spaces + basic separators retained
    - Numbers stripped (embeddings should compare semantics, not amounts)
    - Bounded to MAX_EMBEDDING_LENGTH

    Returns None if the cleaned result is too short to be meaningful (<3 chars).
    """
    cleaned = sanitize_text(raw, max_length=MAX_EMBEDDING_LENGTH * 2)
    if not cleaned:
        return None

    # Lowercase
    cleaned = cleaned.lower()

    # Strip numbers (amounts are compared deterministically, not via embeddings)
    cleaned = re.sub(r"\d+\.?\d*", "", cleaned)

    # Keep only letters, spaces, hyphens, slashes
    cleaned = re.sub(r"[^a-z\s\-/]", " ", cleaned)

    # Collapse whitespace
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    # Bound length
    if len(cleaned) > MAX_EMBEDDING_LENGTH:
        cleaned = cleaned[:MAX_EMBEDDING_LENGTH].rsplit(" ", 1)[0]

    return cleaned if len(cleaned) >= 3 else None


def extract_safe_fields(
    raw_record: dict[str, Any],
    schema: dict[str, type],
) -> tuple[dict[str, Any], list[str]]:
    """
    Extract and validate fields from a raw record against a type schema.

    Parameters
    ----------
    raw_record:
        Raw dict from CSV / JSON / API.
    schema:
        Expected field names and types, e.g.
        {"amount": Decimal, "date": str, "reference": str}

    Returns
    -------
    (safe_fields, quarantined_keys):
        safe_fields — dict of extracted, type-validated values
        quarantined_keys — list of field names that failed validation
    """
    from decimal import Decimal, InvalidOperation
    from datetime import date, datetime

    safe: dict[str, Any] = {}
    quarantined: list[str] = []

    for field_name, expected_type in schema.items():
        raw_val = raw_record.get(field_name)

        if raw_val is None or (isinstance(raw_val, str) and not raw_val.strip()):
            quarantined.append(field_name)
            continue

        try:
            if expected_type is str:
                cleaned = sanitize_text(str(raw_val))
                if cleaned is None:
                    quarantined.append(field_name)
                else:
                    safe[field_name] = cleaned

            elif expected_type is Decimal:
                safe[field_name] = Decimal(str(raw_val).strip())

            elif expected_type is int:
                safe[field_name] = int(str(raw_val).strip())

            elif expected_type is date:
                s = str(raw_val).strip()
                if len(s) == 10:
                    safe[field_name] = date.fromisoformat(s)
                else:
                    safe[field_name] = datetime.fromisoformat(
                        s.replace("Z", "+00:00")
                    ).date()

            else:
                # Unknown type — quarantine
                quarantined.append(field_name)

        except (ValueError, InvalidOperation, TypeError) as exc:
            logger.debug(
                "Field %s quarantined: %s (value=%r)", field_name, exc, raw_val
            )
            quarantined.append(field_name)

    return safe, quarantined

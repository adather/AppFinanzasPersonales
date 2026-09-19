"""Gemini client wrapper: model allowlist, JSON parsing and retry/fallback.

Mirrors the resilience strategy the app previously implemented in
server.ts: exponential backoff on transient errors (503/429), then
cascading to alternative models that share high throughput and
vision/JSON support.
"""
from __future__ import annotations

import asyncio
import json
import os
import random
from functools import lru_cache
from typing import Any, Awaitable, Callable, Optional

from google import genai

ALLOWED_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.1-pro-preview",
]

DEFAULT_MODEL = "gemini-3.8-flash"

# Fallback cascade shared by every endpoint: same models regardless of the
# user's preferred choice, so a saturated primary model always has somewhere
# to land.
FALLBACK_CANDIDATES = ["gemini-3.1-flash-lite", "gemini-flash-latest"]


@lru_cache
def get_client() -> genai.Client:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY environment variable is missing.")
    return genai.Client(
        api_key=api_key,
        http_options={"headers": {"User-Agent": "aistudio-build"}},
    )


def resolve_model(requested_model: Optional[str]) -> str:
    if requested_model in ALLOWED_MODELS:
        return requested_model
    return DEFAULT_MODEL


def clean_and_parse_json(raw_text: Optional[str]) -> Any:
    """Strips ```json fences and parses JSON, salvaging the outer {...} if
    the model wrapped it in stray prose."""
    if not raw_text:
        return {}
    cleaned = raw_text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[len("```json") :].strip()
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:].strip()
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3].strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(cleaned[start : end + 1])
        raise


def is_transient_error(err: Exception) -> bool:
    """Detects 503 (high demand) / 429 (rate limit) style errors from the
    google-genai SDK's APIError, or a plain network failure."""
    status = getattr(err, "status", None)
    code = getattr(err, "code", None)
    message = f"{getattr(err, 'message', '') or ''} {err}"

    transient_statuses = {"UNAVAILABLE", "RESOURCE_EXHAUSTED"}
    transient_markers = (
        "503",
        "429",
        "high demand",
        "UNAVAILABLE",
        "RESOURCE_EXHAUSTED",
        "temporarily unavailable",
        "try again later",
    )
    return (
        code in (503, 429)
        or status in transient_statuses
        or any(marker in message for marker in transient_markers)
    )


class GeminiResult:
    def __init__(self, response: Any, model_used: str, fallback_used: bool):
        self.response = response
        self.model_used = model_used
        self.fallback_used = fallback_used


async def execute_with_retry_and_fallback(
    generate_fn: Callable[[str], Awaitable[Any]],
    preferred_model: str = DEFAULT_MODEL,
) -> GeminiResult:
    candidate_models = list(dict.fromkeys([preferred_model, *FALLBACK_CANDIDATES]))

    last_error: Optional[Exception] = None

    for current_model in candidate_models:
        is_primary = current_model == preferred_model
        max_attempts = 2 if is_primary else 1

        for attempt in range(1, max_attempts + 1):
            try:
                result = await generate_fn(current_model)
                if not is_primary:
                    print(f"[Gemini API] Fallback model '{current_model}' succeeded!")
                return GeminiResult(result, current_model, not is_primary)
            except Exception as err:  # noqa: BLE001 - mirrors the original catch-all
                last_error = err
                transient = is_transient_error(err)
                print(
                    f"[Gemini API] Warning on model '{current_model}' "
                    f"(attempt {attempt}/{max_attempts}): {err}"
                )
                if not transient:
                    break
                if attempt < max_attempts:
                    delay = attempt * 1.2 + random.random() * 0.4
                    await asyncio.sleep(delay)

    assert last_error is not None
    raise last_error

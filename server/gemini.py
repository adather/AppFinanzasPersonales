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

from fastapi.responses import JSONResponse
from google import genai

# A hung upstream call would otherwise block the request (and this retry
# loop) indefinitely — the SDK has no default timeout of its own.
REQUEST_TIMEOUT_SECONDS = 30

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
        isinstance(err, asyncio.TimeoutError)
        or code in (503, 429)
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
                result = await asyncio.wait_for(generate_fn(current_model), timeout=REQUEST_TIMEOUT_SECONDS)
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
                    # A non-transient error (bad request, invalid argument,
                    # content rejected) means the request itself is broken,
                    # not that this particular model is unavailable — every
                    # other model would fail the same way. Cascading to the
                    # fallback candidates here would just add 1-2 more
                    # doomed calls (and their latency) before the user sees
                    # the same error anyway, so raise immediately instead.
                    raise
                if attempt < max_attempts:
                    delay = attempt * 1.2 + random.random() * 0.4
                    await asyncio.sleep(delay)

    assert last_error is not None
    raise last_error


def ai_error_response(error: Exception, fallback_message: str) -> JSONResponse:
    """Error envelope shared by every Gemini endpoint: 503 + a transient-
    overload message when the failure looks temporary, 500 + the real error
    otherwise."""
    is_overload = is_transient_error(error)
    return JSONResponse(
        status_code=503 if is_overload else 500,
        content={
            "success": False,
            "error": (
                "El modelo de IA está experimentando alta demanda temporal."
                if is_overload
                else fallback_message
            ),
            "message": (
                "Los servidores de IA están saturados temporalmente. Por favor "
                "intenta de nuevo en unos momentos."
                if is_overload
                else (str(error) or "Error desconocido")
            ),
            "isTransient": is_overload,
        },
    )


async def run_json_endpoint(
    generate_fn: Callable[[str], Awaitable[Any]],
    model_pref: str,
    error_log_prefix: str,
    error_fallback_message: str,
) -> dict[str, Any] | JSONResponse:
    """Shared shape behind every JSON-returning Gemini endpoint: call with
    retry/fallback, parse the model's JSON, envelope the result.

    If the call used config.response_schema, Gemini's constrained decoding
    already guarantees valid JSON matching that shape, and the SDK exposes
    the validated Pydantic instance as response.parsed — preferred here over
    re-parsing response.text by hand. Calls without a schema (still relying
    on response_mime_type="application/json" alone) fall back to
    clean_and_parse_json's best-effort recovery, which occasionally has to
    patch up a model-generated formatting mistake.

    Callers that need something outside this shape (parse_receipt's base64
    decoding, chat_advisor's plain-text reply) build their own generate_fn
    and handle the rest inline; this only dedupes the part that was
    identical across every endpoint.
    """
    try:
        result = await execute_with_retry_and_fallback(generate_fn, model_pref)
        response_parsed = getattr(result.response, "parsed", None)
        parsed = response_parsed.model_dump() if response_parsed is not None else clean_and_parse_json(result.response.text)
        return {
            "success": True,
            "modelUsed": result.model_used,
            "fallbackUsed": result.fallback_used,
            "data": parsed,
        }
    except Exception as error:  # noqa: BLE001
        print(f"{error_log_prefix}: {error}")
        return ai_error_response(error, error_fallback_message)

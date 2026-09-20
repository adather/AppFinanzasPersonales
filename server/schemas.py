"""Request bodies for the Gemini endpoints.

Pydantic gives us the input validation (types + length caps) that was
previously missing in server.ts — bodies with the wrong shape or absurd
sizes are rejected by FastAPI before touching the Gemini client.
"""
from __future__ import annotations

import json
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator

# ~33MB decoded image, matching the previous 30mb JSON body limit.
MAX_IMAGE_BASE64_CHARS = 45_000_000
MAX_TEXT_CHARS = 4000
MAX_HISTORY_ITEMS = 40

# financialContext/goal/analysis payloads are built from the user's own
# transaction data, so their size should track real usage (dozens of
# transactions, a handful of categories) — this is a generous ceiling meant
# to catch a runaway or malicious payload, not real traffic. Every extra
# character here is tokens billed on every single Gemini call that embeds it
# (the advisor chat re-sends financialContext on every message), so bounding
# it protects cost as much as it protects the server.
MAX_CONTEXT_JSON_CHARS = 40_000


def _check_json_size(value: dict[str, Any] | list[Any], max_chars: int, field_name: str) -> dict[str, Any] | list[Any]:
    size = len(json.dumps(value, ensure_ascii=False))
    if size > max_chars:
        raise ValueError(f"{field_name} es demasiado grande ({size} caracteres, máximo {max_chars}).")
    return value


class ParseReceiptRequest(BaseModel):
    imageBase64: str = Field(..., min_length=1, max_length=MAX_IMAGE_BASE64_CHARS)
    mimeType: Optional[str] = None
    model: Optional[str] = None


class ParseVerbalRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=MAX_TEXT_CHARS)
    currentDate: Optional[str] = None
    model: Optional[str] = None


class AnalyzeFinancesRequest(BaseModel):
    currentMonthSummary: dict[str, Any] = Field(default_factory=dict)
    categoryStats: list[Any] = Field(default_factory=list)
    anomalies: list[Any] = Field(default_factory=list)
    previousMonthComparison: dict[str, Any] = Field(default_factory=dict)
    samplePatterns: list[Any] = Field(default_factory=list)
    model: Optional[str] = None

    @field_validator("currentMonthSummary", "categoryStats", "anomalies", "previousMonthComparison", "samplePatterns")
    @classmethod
    def _bounded(cls, v, info):
        return _check_json_size(v, MAX_CONTEXT_JSON_CHARS, info.field_name)


class ChatHistoryItem(BaseModel):
    role: Optional[str] = None
    content: str = Field(default="", max_length=MAX_TEXT_CHARS)


class ChatAdvisorRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=MAX_TEXT_CHARS)
    history: list[ChatHistoryItem] = Field(default_factory=list, max_length=MAX_HISTORY_ITEMS)
    financialContext: dict[str, Any] = Field(default_factory=dict)
    model: Optional[str] = None

    @field_validator("financialContext")
    @classmethod
    def _bounded_context(cls, v):
        return _check_json_size(v, MAX_CONTEXT_JSON_CHARS, "financialContext")


class SavingsGoalAdviceRequest(BaseModel):
    goal: dict[str, Any]
    financialContext: dict[str, Any] = Field(default_factory=dict)
    model: Optional[str] = None

    @field_validator("goal", "financialContext")
    @classmethod
    def _bounded(cls, v, info):
        return _check_json_size(v, MAX_CONTEXT_JSON_CHARS, info.field_name)

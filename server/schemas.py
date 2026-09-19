"""Request bodies for the Gemini endpoints.

Pydantic gives us the input validation (types + length caps) that was
previously missing in server.ts — bodies with the wrong shape or absurd
sizes are rejected by FastAPI before touching the Gemini client.
"""
from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field

# ~33MB decoded image, matching the previous 30mb JSON body limit.
MAX_IMAGE_BASE64_CHARS = 45_000_000
MAX_TEXT_CHARS = 4000


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


class ChatHistoryItem(BaseModel):
    role: Optional[str] = None
    content: str = Field(default="", max_length=MAX_TEXT_CHARS)


class ChatAdvisorRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=MAX_TEXT_CHARS)
    history: list[ChatHistoryItem] = Field(default_factory=list)
    financialContext: dict[str, Any] = Field(default_factory=dict)
    model: Optional[str] = None


class SavingsGoalAdviceRequest(BaseModel):
    goal: dict[str, Any]
    financialContext: dict[str, Any] = Field(default_factory=dict)
    model: Optional[str] = None

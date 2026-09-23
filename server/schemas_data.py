"""Request bodies for the persistence endpoints (server/data_routes.py).

Mirrors the shapes in src/types.ts. Derived/computed fields (isAnomaly,
zScore) are intentionally excluded — those come from /api/analytics/summary
at read time, never stored, so they can't go stale against the transactions
that produced them.
"""
from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field

MAX_TEXT_FIELD_CHARS = 2000
MAX_RECEIPT_IMG_CHARS = 900_000  # Firestore documents cap out around 1 MiB.
MAX_ADVICE_ITEMS = 20


class TransactionIn(BaseModel):
    id: str = Field(..., min_length=1, max_length=200)
    date: str  # YYYY-MM-DD
    concept: str = Field(default="", max_length=MAX_TEXT_FIELD_CHARS)
    merchant: str = Field(default="", max_length=MAX_TEXT_FIELD_CHARS)
    amount: float
    category: str
    note: Optional[str] = Field(default=None, max_length=MAX_TEXT_FIELD_CHARS)
    receiptImg: Optional[str] = Field(default=None, max_length=MAX_RECEIPT_IMG_CHARS)
    rawSource: Optional[str] = None


class SavingsContributionIn(BaseModel):
    id: str = Field(..., min_length=1, max_length=200)
    date: str
    amount: float
    note: Optional[str] = Field(default=None, max_length=MAX_TEXT_FIELD_CHARS)


class SavingsAdviceItemIn(BaseModel):
    id: str
    focusCategory: str
    monthlySavingPotential: float
    tip: str = Field(max_length=MAX_TEXT_FIELD_CHARS)
    behavioralBias: str = Field(max_length=MAX_TEXT_FIELD_CHARS)
    impactWeeksAccelerated: Optional[float] = None


class SavingsGoalIn(BaseModel):
    id: str = Field(..., min_length=1, max_length=200)
    title: str = Field(max_length=MAX_TEXT_FIELD_CHARS)
    category: str
    targetAmount: float
    currentAmount: float = 0
    targetDate: str
    createdAt: str
    notes: Optional[str] = Field(default=None, max_length=MAX_TEXT_FIELD_CHARS)
    color: Optional[str] = None
    contributions: list[SavingsContributionIn] = Field(default_factory=list, max_length=1000)
    customAdvice: list[SavingsAdviceItemIn] = Field(default_factory=list, max_length=MAX_ADVICE_ITEMS)


class AddContributionRequest(BaseModel):
    amount: float
    note: Optional[str] = Field(default=None, max_length=MAX_TEXT_FIELD_CHARS)


class AnalysisUpdateRequest(BaseModel):
    analysis: Optional[dict[str, Any]] = None


class PreferencesUpdateRequest(BaseModel):
    selectedModel: Optional[str] = None
    theme: Optional[str] = None


class ResetDataRequest(BaseModel):
    currentTransactions: list[TransactionIn] = Field(default_factory=list, max_length=5000)
    previousTransactions: list[TransactionIn] = Field(default_factory=list, max_length=5000)
    savingsGoals: list[SavingsGoalIn] = Field(default_factory=list, max_length=200)

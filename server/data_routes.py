"""Persistence endpoints backed by Firestore (server/db.py).

Replaces the frontend's localStorage usage. Single fixed user for now —
see the note at the top of server/db.py about what changes when real auth
is added later.
"""
from __future__ import annotations

import time
from datetime import date
from typing import Any

from fastapi import APIRouter, HTTPException

from server import db
from server.schemas_data import (
    AddContributionRequest,
    AnalysisUpdateRequest,
    PreferencesUpdateRequest,
    ResetDataRequest,
    SavingsGoalIn,
    TransactionIn,
)

router = APIRouter(prefix="/api/data")


@router.get("/state")
async def get_state() -> dict[str, Any]:
    try:
        return {"success": True, "data": db.get_state()}
    except Exception as error:  # noqa: BLE001
        print(f"Error loading state: {error}")
        raise HTTPException(status_code=500, detail="Error al cargar los datos guardados.") from error


@router.post("/transactions")
async def create_transaction(body: TransactionIn) -> dict[str, Any]:
    db.add_transaction(body.model_dump())
    return {"success": True}


@router.delete("/transactions/{tx_id}")
async def remove_transaction(tx_id: str) -> dict[str, Any]:
    db.delete_transaction(tx_id)
    return {"success": True}


@router.post("/goals")
async def create_goal(body: SavingsGoalIn) -> dict[str, Any]:
    db.add_goal(body.model_dump())
    return {"success": True}


@router.put("/goals/{goal_id}")
async def replace_goal(goal_id: str, body: SavingsGoalIn) -> dict[str, Any]:
    db.replace_goal(goal_id, body.model_dump())
    return {"success": True}


@router.delete("/goals/{goal_id}")
async def remove_goal(goal_id: str) -> dict[str, Any]:
    db.delete_goal(goal_id)
    return {"success": True}


@router.post("/goals/{goal_id}/contributions")
async def add_contribution(goal_id: str, body: AddContributionRequest) -> dict[str, Any]:
    contribution = {
        "id": f"contrib-{int(time.time() * 1000)}",
        "date": date.today().isoformat(),
        "amount": body.amount,
        "note": body.note,
    }
    try:
        updated_goal = db.add_contribution(goal_id, contribution, body.amount)
    except KeyError:
        raise HTTPException(status_code=404, detail="Meta de ahorro no encontrada.")
    return {"success": True, "goal": updated_goal}


@router.put("/analysis")
async def put_analysis(body: AnalysisUpdateRequest) -> dict[str, Any]:
    db.save_analysis(body.analysis)
    return {"success": True}


@router.put("/preferences")
async def put_preferences(body: PreferencesUpdateRequest) -> dict[str, Any]:
    db.save_preferences(body.selectedModel, body.theme)
    return {"success": True}


@router.post("/reset")
async def reset(body: ResetDataRequest) -> dict[str, Any]:
    db.reset_data(
        [t.model_dump() for t in body.currentTransactions],
        [t.model_dump() for t in body.previousTransactions],
        [g.model_dump() for g in body.savingsGoals],
    )
    return {"success": True}

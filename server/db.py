"""Firestore persistence for the app's data (transactions, savings goals,
cached AI analysis, preferences).

No user auth yet (see MEMORY.md feedback_datascience_in_python /
project decisions) — everything is scoped under one fixed user id.
Swapping in real per-user auth later means deriving DEFAULT_USER_ID from a
verified request token instead of a constant; nothing else about this
module's shape needs to change.

DEMO_MODE (env var): when set, this whole deployment is a public, throwaway
demo — every visitor shares one "public-demo" user id, completely separate
from "default" (the real one), so a public demo deployment can never read or
write real data even by accident. The demo data self-wipes every
DEMO_RESET_INTERVAL_MINUTES; the frontend's existing "brand new account ->
seed with sample data" logic (see App.tsx) then reseeds it for the next
visitor — no separate demo dataset needed here.
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from typing import Any, Optional

from google.cloud import firestore

DEMO_MODE = os.environ.get("DEMO_MODE", "").strip().lower() in ("1", "true", "yes")
DEFAULT_USER_ID = "public-demo" if DEMO_MODE else "default"
DEMO_RESET_INTERVAL_MINUTES = 30


@lru_cache
def get_db() -> firestore.Client:
    project = os.environ.get("GOOGLE_CLOUD_PROJECT")
    return firestore.Client(project=project) if project else firestore.Client()


def _user_ref(db: firestore.Client):
    return db.collection("users").document(DEFAULT_USER_ID)


def _maybe_wipe_stale_demo() -> None:
    """In demo mode, wipe the shared demo account if it's been more than
    DEMO_RESET_INTERVAL_MINUTES since the last wipe — keeps one visitor's
    mess from persisting for the next. Not time-critical (a few concurrent
    visitors triggering it around the same moment just means an extra
    harmless wipe), so no locking needed."""
    db = get_db()
    user_ref = _user_ref(db)
    user_data = user_ref.get().to_dict() or {}

    last_reset_raw = user_data.get("demoLastResetAt")
    now = datetime.now(timezone.utc)
    is_stale = True
    if last_reset_raw is not None:
        last_reset = last_reset_raw if isinstance(last_reset_raw, datetime) else None
        if last_reset is not None:
            is_stale = now - last_reset > timedelta(minutes=DEMO_RESET_INTERVAL_MINUTES)

    if is_stale:
        reset_data([], [], [])
        user_ref.set({"demoLastResetAt": now}, merge=True)


def get_state() -> dict[str, Any]:
    if DEMO_MODE:
        _maybe_wipe_stale_demo()

    db = get_db()
    user_ref = _user_ref(db)
    user_data = user_ref.get().to_dict() or {}

    current_transactions = [doc.to_dict() for doc in user_ref.collection("transactions").stream()]
    savings_goals = [doc.to_dict() for doc in user_ref.collection("goals").stream()]

    return {
        "currentTransactions": current_transactions,
        "previousTransactions": user_data.get("previousTransactions", []),
        "savingsGoals": savings_goals,
        "analysisResult": user_data.get("analysisResult"),
        "selectedModel": user_data.get("selectedModel"),
        "theme": user_data.get("theme"),
        "demoMode": DEMO_MODE,
    }


def add_transaction(tx: dict[str, Any]) -> None:
    db = get_db()
    _user_ref(db).collection("transactions").document(tx["id"]).set(tx)


def delete_transaction(tx_id: str) -> None:
    db = get_db()
    _user_ref(db).collection("transactions").document(tx_id).delete()


def add_goal(goal: dict[str, Any]) -> None:
    db = get_db()
    _user_ref(db).collection("goals").document(goal["id"]).set(goal)


def replace_goal(goal_id: str, goal: dict[str, Any]) -> None:
    db = get_db()
    _user_ref(db).collection("goals").document(goal_id).set(goal)


def delete_goal(goal_id: str) -> None:
    db = get_db()
    _user_ref(db).collection("goals").document(goal_id).delete()


def add_contribution(goal_id: str, contribution: dict[str, Any], amount: float) -> dict[str, Any]:
    """Atomically bumps currentAmount and appends the contribution, so two
    near-simultaneous contributions can't clobber each other's amount."""
    db = get_db()
    goal_ref = _user_ref(db).collection("goals").document(goal_id)

    @firestore.transactional
    def _apply(transaction: firestore.Transaction) -> dict[str, Any]:
        snapshot = goal_ref.get(transaction=transaction)
        if not snapshot.exists:
            raise KeyError(goal_id)
        data = snapshot.to_dict() or {}
        data["currentAmount"] = float(data.get("currentAmount", 0)) + amount
        contributions = list(data.get("contributions", []))
        contributions.append(contribution)
        data["contributions"] = contributions
        transaction.set(goal_ref, data)
        return data

    return _apply(db.transaction())


def save_analysis(analysis: Optional[dict[str, Any]]) -> None:
    db = get_db()
    _user_ref(db).set({"analysisResult": analysis}, merge=True)


def save_preferences(selected_model: Optional[str], theme: Optional[str]) -> None:
    db = get_db()
    updates: dict[str, Any] = {}
    if selected_model is not None:
        updates["selectedModel"] = selected_model
    if theme is not None:
        updates["theme"] = theme
    if updates:
        _user_ref(db).set(updates, merge=True)


def reset_data(
    current_transactions: list[dict[str, Any]],
    previous_transactions: list[dict[str, Any]],
    savings_goals: list[dict[str, Any]],
) -> None:
    db = get_db()
    user_ref = _user_ref(db)

    # Firestore batches cap at 500 writes; a demo reset is well under that
    # for this app's scale, but split just in case someone's data has grown.
    batch = db.batch()
    op_count = 0

    def _commit_if_full():
        nonlocal batch, op_count
        if op_count >= 450:
            batch.commit()
            batch = db.batch()
            op_count = 0

    for doc in user_ref.collection("transactions").stream():
        batch.delete(doc.reference)
        op_count += 1
        _commit_if_full()
    for doc in user_ref.collection("goals").stream():
        batch.delete(doc.reference)
        op_count += 1
        _commit_if_full()
    for tx in current_transactions:
        batch.set(user_ref.collection("transactions").document(tx["id"]), tx)
        op_count += 1
        _commit_if_full()
    for goal in savings_goals:
        batch.set(user_ref.collection("goals").document(goal["id"]), goal)
        op_count += 1
        _commit_if_full()

    batch.set(user_ref, {"previousTransactions": previous_transactions, "analysisResult": None}, merge=True)
    batch.commit()

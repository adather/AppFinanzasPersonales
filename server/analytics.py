"""Statistical analysis: category stats, robust anomaly detection, behavioral
patterns, spending timeline/tiers.

Personal spending amounts are right-skewed (many small purchases, few large
ones), not normal, so a classic mean/stdDev z-score is unreliable for outlier
detection: a single large transaction inflates the very mean/stdDev it's
compared against, which can hide its own anomaly (or a smaller category's).
This module instead uses the median and MAD (median absolute deviation) — a
robust analogue with a 50% breakdown point — computed in log-space so that
"3x the usual amount" is what gets flagged, regardless of a category's
absolute scale. This follows the modified z-score convention from Iglewicz &
Hoaglin (1993): constant 0.6745, conventional outlier cutoff 3.5.

No numpy/pandas: transaction volumes here are small (dozens to low
thousands), so the stdlib is enough and avoids an extra dependency.
"""
from __future__ import annotations

import math
from collections import defaultdict
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field

CATEGORY_COLORS: dict[str, str] = {
    'Alimentos & Supermercado': '#10B981',
    'Transporte & Movilidad': '#3B82F6',
    'Entretenimiento & Ocio': '#EC4899',
    'Servicios & Hogar': '#8B5CF6',
    'Salud & Bienestar': '#14B8A6',
    'Educación & Libros': '#F59E0B',
    'Ropa & Compras': '#F97316',
    'Restaurantes & Cafeterías': '#EF4444',
    'Otros': '#6B7280',
}

DEFAULT_BUDGETS: dict[str, float] = {
    'Alimentos & Supermercado': 7500,
    'Transporte & Movilidad': 3000,
    'Entretenimiento & Ocio': 2500,
    'Servicios & Hogar': 6000,
    'Salud & Bienestar': 2000,
    'Educación & Libros': 1500,
    'Ropa & Compras': 2500,
    'Restaurantes & Cafeterías': 3500,
    'Otros': 1500,
}

DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
MONTH_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

# Scales MAD so it approximates stdDev under normality (Iglewicz & Hoaglin,
# 1993) — the reason 3.5 is the conventional outlier cutoff for this method.
MODIFIED_Z_CONSTANT = 0.6745

# Below this, a category's median/MAD are too noisy to trust as a baseline —
# silence is safer than a confident-looking threshold built on 2-3 points.
MIN_ANOMALY_SAMPLE_SIZE = 5


class TransactionIn(BaseModel):
    id: str
    date: str  # YYYY-MM-DD
    concept: str = ""
    merchant: str = ""
    amount: float
    category: str
    note: Optional[str] = None


class AnalyticsSummaryRequest(BaseModel):
    currentTransactions: list[TransactionIn] = Field(default_factory=list)
    previousTransactions: list[TransactionIn] = Field(default_factory=list)
    anomalyThreshold: float = 3.5


# --- Core robust statistics -------------------------------------------------

def calculate_mean(values: list[float]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)


def calculate_stddev(values: list[float], mean: Optional[float] = None) -> float:
    if len(values) < 2:
        return 0.0
    m = mean if mean is not None else calculate_mean(values)
    variance = sum((v - m) ** 2 for v in values) / (len(values) - 1)
    return math.sqrt(variance)


def calculate_median(values: list[float]) -> float:
    if not values:
        return 0.0
    s = sorted(values)
    n = len(s)
    mid = n // 2
    return s[mid] if n % 2 != 0 else (s[mid - 1] + s[mid]) / 2


def calculate_mad(values: list[float], median: Optional[float] = None) -> float:
    if not values:
        return 0.0
    m = median if median is not None else calculate_median(values)
    return calculate_median([abs(v - m) for v in values])


def calculate_modified_zscore(value: float, median: float, mad: float) -> float:
    if mad == 0:
        return 0.0
    return (MODIFIED_Z_CONSTANT * (value - median)) / mad


def compute_category_baseline(amounts: list[float]) -> tuple[float, float]:
    """Median/MAD of amounts, computed in log-space (median commutes with the
    monotonic log(x+1) transform, so it inverts back exactly to the dollar
    median)."""
    log_amounts = [math.log(a + 1) for a in amounts]
    median_log = calculate_median(log_amounts)
    mad = calculate_mad(log_amounts, median_log)
    return math.exp(median_log) - 1, mad


def modified_zscore_for_amount(amount: float, median_amount: float, mad: float) -> float:
    if mad == 0:
        return 0.0
    return calculate_modified_zscore(math.log(amount + 1), math.log(median_amount + 1), mad)


def anomaly_threshold_amount(median_amount: float, mad: float, multiplier: float) -> float:
    if mad == 0:
        return median_amount
    threshold_log = math.log(median_amount + 1) + (multiplier / MODIFIED_Z_CONSTANT) * mad
    return math.exp(threshold_log) - 1


# --- Anomaly detection -------------------------------------------------------

def detect_anomalies(transactions: list[TransactionIn], multiplier: float = 3.5) -> list[dict[str, Any]]:
    by_category: dict[str, list[TransactionIn]] = defaultdict(list)
    for t in transactions:
        by_category[t.category].append(t)

    anomalies: list[dict[str, Any]] = []

    for category, txs in by_category.items():
        if len(txs) < MIN_ANOMALY_SAMPLE_SIZE:
            continue

        amounts = [t.amount for t in txs]
        median_amount, mad = compute_category_baseline(amounts)
        if mad == 0:
            continue

        threshold = anomaly_threshold_amount(median_amount, mad, multiplier)

        for t in txs:
            z = modified_zscore_for_amount(t.amount, median_amount, mad)
            if z > multiplier:
                anomalies.append({
                    "id": t.id,
                    "transactionId": t.id,
                    "zScore": round(z, 2),
                    "categoryMedian": round(median_amount, 2),
                    "categoryMAD": round(mad, 4),
                    "threshold": round(threshold, 2),
                    "deviationMultiplier": multiplier,
                    "explanation": (
                        f'El gasto de ${t.amount:,.2f} en "{t.concept}" se aleja de forma atípica de lo '
                        f'habitual en {category} (mediana de ${median_amount:,.2f}): puntaje Z robusto de '
                        f'{z:.1f}, sobre el umbral de {multiplier:.1f} (equivalente a ${threshold:,.2f}).'
                    ),
                })

    anomalies.sort(key=lambda a: a["zScore"], reverse=True)
    return anomalies


# --- Category stats -----------------------------------------------------------

def calculate_category_stats(
    current_transactions: list[TransactionIn],
    prev_transactions: list[TransactionIn],
    budgets: Optional[dict[str, float]] = None,
    anomaly_threshold: float = 3.5,
) -> list[dict[str, Any]]:
    budgets = budgets or DEFAULT_BUDGETS
    stats: list[dict[str, Any]] = []

    for category, budget in budgets.items():
        current_list = [t for t in current_transactions if t.category == category]
        prev_list = [t for t in prev_transactions if t.category == category]

        amounts = [t.amount for t in current_list]
        total = sum(amounts)
        mean = calculate_mean(amounts)
        stddev = calculate_stddev(amounts, mean)
        median_amount, mad = compute_category_baseline(amounts)
        budget_value = budget or 1
        budget_percent = round((total / budget_value) * 100, 1)

        alert_threshold = (
            round(anomaly_threshold_amount(median_amount, mad, anomaly_threshold), 2)
            if len(current_list) >= MIN_ANOMALY_SAMPLE_SIZE and mad > 0
            else None
        )

        prev_total = sum(t.amount for t in prev_list)
        trend = '='
        trend_percent = 0.0
        if prev_total > 0:
            trend_percent = round(((total - prev_total) / prev_total) * 100, 1)
            if trend_percent > 3:
                trend = '↑'
            elif trend_percent < -3:
                trend = '↓'
        elif total > 0:
            trend = '↑'
            trend_percent = 100.0

        stats.append({
            "category": category,
            "total": round(total, 2),
            "count": len(current_list),
            "mean": round(mean, 2),
            "stdDev": round(stddev, 2),
            "median": round(median_amount, 2),
            "mad": round(mad, 4),
            "alertThreshold": alert_threshold,
            "budget": budget_value,
            "budgetPercent": budget_percent,
            "trend": trend,
            "trendPercent": trend_percent,
            "color": CATEGORY_COLORS.get(category, '#6B7280'),
        })

    return stats


# --- Behavioral economics patterns --------------------------------------------

def analyze_behavioral_patterns(transactions: list[TransactionIn]) -> dict[str, Any]:
    day_totals = [0.0] * 7
    day_counts = [0] * 7
    micro_count = 0
    micro_total = 0.0
    weekend_total = 0.0
    total_amount = 0.0

    for t in transactions:
        try:
            d = datetime.strptime(t.date, '%Y-%m-%d').date()
            # Python's Monday=0..Sunday=6; match JS Date#getDay() (Sunday=0..Saturday=6).
            day = (d.weekday() + 1) % 7
        except ValueError:
            day = 0

        day_totals[day] += t.amount
        day_counts[day] += 1
        total_amount += t.amount

        if day in (0, 6):
            weekend_total += t.amount

        # Micro-spending / Latte factor (purchases under $120)
        if 0 < t.amount <= 120:
            micro_count += 1
            micro_total += t.amount

    weekday_avg = (day_totals[1] + day_totals[2] + day_totals[3] + day_totals[4]) / 4
    friday_total = day_totals[5]
    friday_spike_pct = round(((friday_total - weekday_avg) / weekday_avg) * 100, 1) if weekday_avg > 0 else 0.0
    weekend_pct = round((weekend_total / total_amount) * 100, 1) if total_amount > 0 else 0.0

    day_summary = []
    for i, name in enumerate(DAY_NAMES):
        total = day_totals[i]
        count = day_counts[i]
        avg = round(total / count, 2) if count > 0 else 0.0
        is_spike = (i == 5 and friday_spike_pct > 25) or (total > weekday_avg * 1.35)
        day_summary.append({
            "day": name, "count": count, "total": round(total, 2), "avg": avg, "isSpike": is_spike,
        })

    return {
        "dayOfWeekSummary": day_summary,
        "fridaySpikePct": friday_spike_pct,
        "microExpensesCount": micro_count,
        "microExpensesTotal": round(micro_total, 2),
        "weekendPct": weekend_pct,
    }


# --- Timeline -----------------------------------------------------------------

def build_timeline_data(transactions: list[TransactionIn], anomalies: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not transactions:
        return []

    anomaly_by_tx_id = {a["transactionId"]: a for a in anomalies}

    by_date: dict[str, list[TransactionIn]] = defaultdict(list)
    for t in transactions:
        by_date[t.date].append(t)

    sorted_dates = sorted(by_date.keys())
    running_cumulative = 0.0
    raw_points: list[dict[str, Any]] = []

    for d in sorted_dates:
        txs = by_date[d]
        daily_total = sum(t.amount for t in txs)
        running_cumulative += daily_total

        date_anomaly: Optional[dict[str, Any]] = None
        anomaly_tx: Optional[TransactionIn] = None
        for t in txs:
            a = anomaly_by_tx_id.get(t.id)
            if a and (date_anomaly is None or a["zScore"] > date_anomaly["zScore"]):
                date_anomaly = a
                anomaly_tx = t

        try:
            date_obj = datetime.strptime(d, '%Y-%m-%d').date()
            display_date = f"{date_obj.day:02d} {MONTH_ABBR[date_obj.month - 1]}"
        except ValueError:
            display_date = d

        raw_points.append({
            "date": d,
            "displayDate": display_date,
            "dailyTotal": round(daily_total, 2),
            "cumulativeTotal": round(running_cumulative, 2),
            "count": len(txs),
            "hasAnomaly": date_anomaly is not None,
            "anomalyZScore": date_anomaly["zScore"] if date_anomaly else None,
            "anomalyConcept": anomaly_tx.concept if anomaly_tx else None,
            "anomalyAmount": anomaly_tx.amount if anomaly_tx else None,
            "transactionIds": [t.id for t in txs],
        })

    n = len(raw_points)
    for idx, pt in enumerate(raw_points):
        start = max(0, idx - 1)
        end = min(n, idx + 2)
        window = raw_points[start:end]
        pt["rollingAvg"] = round(sum(p["dailyTotal"] for p in window) / len(window), 2)

    return raw_points


# --- Spending ranges ------------------------------------------------------------

def build_spending_ranges(transactions: list[TransactionIn]) -> list[dict[str, Any]]:
    ranges: list[dict[str, Any]] = [
        {"label": "Microgastos (<$150)", "min": 0, "max": 150, "count": 0, "total": 0.0, "color": "#A855F7"},
        {"label": "Cotidianos ($150-$500)", "min": 150, "max": 500, "count": 0, "total": 0.0, "color": "#3B82F6"},
        {"label": "Medios ($500-$1,500)", "min": 500, "max": 1500, "count": 0, "total": 0.0, "color": "#10B981"},
        {"label": "Grandes ($1,500-$3,000)", "min": 1500, "max": 3000, "count": 0, "total": 0.0, "color": "#F59E0B"},
        {"label": "Atípicos (>$3,000)", "min": 3000, "max": None, "count": 0, "total": 0.0, "color": "#EF4444"},
    ]

    for t in transactions:
        for r in ranges:
            upper = r["max"] if r["max"] is not None else math.inf
            if r["min"] < t.amount <= upper:
                r["count"] += 1
                r["total"] += t.amount
                break

    for r in ranges:
        r["total"] = round(r["total"], 2)

    return ranges


# --- Aggregate summary ----------------------------------------------------------

def build_analytics_summary(
    current_transactions: list[TransactionIn],
    previous_transactions: list[TransactionIn],
    anomaly_threshold: float,
) -> dict[str, Any]:
    anomalies = detect_anomalies(current_transactions, anomaly_threshold)
    return {
        "categoryStats": calculate_category_stats(
            current_transactions, previous_transactions, anomaly_threshold=anomaly_threshold
        ),
        "anomalies": anomalies,
        "timeline": build_timeline_data(current_transactions, anomalies),
        "behavioralPatterns": analyze_behavioral_patterns(current_transactions),
        "spendingRanges": build_spending_ranges(current_transactions),
        "totalBudget": sum(DEFAULT_BUDGETS.values()),
    }

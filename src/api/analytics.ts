// All statistical computation (category stats, robust anomaly detection,
// behavioral patterns, timeline, spending tiers) runs in the Python backend
// (server/analytics.py) — this module just calls it and re-attaches the
// full Transaction objects the frontend already holds, since the backend
// only sends ids back to avoid re-serializing transaction data it was
// just given.
import { AnomalyItem, BehavioralPatterns, CategoryStat, SpendingRange, Transaction, TimelinePoint } from '../types';

interface RawAnomaly {
  id: string;
  transactionId: string;
  zScore: number;
  categoryMedian: number;
  categoryMAD: number;
  threshold: number;
  deviationMultiplier: number;
  explanation?: string;
}

interface RawTimelinePoint {
  date: string;
  displayDate: string;
  dailyTotal: number;
  cumulativeTotal: number;
  rollingAvg: number;
  count: number;
  hasAnomaly: boolean;
  anomalyZScore?: number;
  anomalyConcept?: string;
  anomalyAmount?: number;
  transactionIds: string[];
}

interface RawAnalyticsSummary {
  categoryStats: CategoryStat[];
  anomalies: RawAnomaly[];
  timeline: RawTimelinePoint[];
  behavioralPatterns: BehavioralPatterns;
  spendingRanges: SpendingRange[];
  totalBudget: number;
}

export interface AnalyticsSummary {
  categoryStats: CategoryStat[];
  anomalies: AnomalyItem[];
  timeline: TimelinePoint[];
  behavioralPatterns: BehavioralPatterns;
  spendingRanges: SpendingRange[];
  totalBudget: number;
  // currentTransactions, decorated with isAnomaly/zScore from the anomalies
  // the backend just computed — the single source of "decorated" transactions
  // used both for the timeline's per-day breakdown and by every view tab.
  enrichedTransactions: Transaction[];
}

export async function fetchAnalyticsSummary(
  currentTransactions: Transaction[],
  previousTransactions: Transaction[],
  anomalyThreshold: number
): Promise<AnalyticsSummary> {
  const res = await fetch('/api/analytics/summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currentTransactions,
      previousTransactions,
      anomalyThreshold,
    }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Error al calcular estadísticas');
  }

  const raw = json.data as RawAnalyticsSummary;

  const anomalyByTxId = new Map(raw.anomalies.map((a) => [a.transactionId, a]));
  const enrichedTransactions: Transaction[] = currentTransactions.map((t) => {
    const a = anomalyByTxId.get(t.id);
    return { ...t, isAnomaly: Boolean(a), zScore: a ? a.zScore : undefined };
  });
  const byId = new Map(enrichedTransactions.map((t) => [t.id, t]));

  const anomalies: AnomalyItem[] = raw.anomalies
    .map((a): AnomalyItem | null => {
      const transaction = byId.get(a.transactionId);
      if (!transaction) return null;
      return {
        id: a.id,
        transaction,
        zScore: a.zScore,
        categoryMedian: a.categoryMedian,
        categoryMAD: a.categoryMAD,
        threshold: a.threshold,
        deviationMultiplier: a.deviationMultiplier,
        explanation: a.explanation,
      };
    })
    .filter((a): a is AnomalyItem => a !== null);

  const timeline: TimelinePoint[] = raw.timeline.map((pt) => ({
    ...pt,
    transactions: pt.transactionIds.map((id) => byId.get(id)).filter((t): t is Transaction => Boolean(t)),
  }));

  return {
    categoryStats: raw.categoryStats,
    anomalies,
    timeline,
    behavioralPatterns: raw.behavioralPatterns,
    spendingRanges: raw.spendingRanges,
    totalBudget: raw.totalBudget,
    enrichedTransactions,
  };
}

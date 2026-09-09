import { CategoryName, CategoryStat, Transaction, AnomalyItem } from '../types';

export const CATEGORY_COLORS: Record<CategoryName, string> = {
  'Alimentos & Supermercado': '#10B981', // Emerald
  'Transporte & Movilidad': '#3B82F6', // Blue
  'Entretenimiento & Ocio': '#EC4899', // Pink
  'Servicios & Hogar': '#8B5CF6', // Purple
  'Salud & Bienestar': '#14B8A6', // Teal
  'Educación & Libros': '#F59E0B', // Amber
  'Ropa & Compras': '#F97316', // Orange
  'Restaurantes & Cafeterías': '#EF4444', // Red
  'Otros': '#6B7280', // Gray
};

export const DEFAULT_BUDGETS: Record<CategoryName, number> = {
  'Alimentos & Supermercado': 7500,
  'Transporte & Movilidad': 3000,
  'Entretenimiento & Ocio': 2500,
  'Servicios & Hogar': 6000,
  'Salud & Bienestar': 2000,
  'Educación & Libros': 1500,
  'Ropa & Compras': 2500,
  'Restaurantes & Cafeterías': 3500,
  'Otros': 1500,
};

export function calculateMean(values: number[]): number {
  if (!values.length) return 0;
  const sum = values.reduce((acc, curr) => acc + curr, 0);
  return sum / values.length;
}

export function calculateStdDev(values: number[], mean?: number): number {
  if (values.length < 2) return 0;
  const m = mean ?? calculateMean(values);
  const variance = values.reduce((acc, curr) => acc + Math.pow(curr - m, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

export function detectAnomalies(transactions: Transaction[], multiplier = 2.0): AnomalyItem[] {
  // Group by category to find category-specific anomalies
  const byCategory = new Map<CategoryName, Transaction[]>();
  for (const t of transactions) {
    const list = byCategory.get(t.category) || [];
    list.push(t);
    byCategory.set(t.category, list);
  }

  const anomalies: AnomalyItem[] = [];

  byCategory.forEach((txs, category) => {
    const amounts = txs.map(t => t.amount);
    const mean = calculateMean(amounts);
    const stdDev = calculateStdDev(amounts, mean);

    // If we have at least 3 transactions and standard deviation is significant
    const threshold = mean + multiplier * stdDev;

    for (const t of txs) {
      const zScore = stdDev > 0 ? calculateZScore(t.amount, mean, stdDev) : 0;
      // Anomaly if amount > threshold or zScore > multiplier
      if (stdDev > 0 && zScore > multiplier) {
        anomalies.push({
          id: t.id,
          transaction: t,
          zScore: Number(zScore.toFixed(2)),
          categoryMean: Number(mean.toFixed(2)),
          categoryStdDev: Number(stdDev.toFixed(2)),
          threshold: Number(threshold.toFixed(2)),
          deviationMultiplier: multiplier,
          explanation: `El gasto de $${t.amount.toLocaleString()} en "${t.concept}" supera el umbral estadístico de $${threshold.toFixed(2)} (${zScore.toFixed(1)} desviaciones estándar sobre la media de $${mean.toFixed(2)} para ${category}).`,
        });
      }
    }
  });

  // Sort descending by Z-Score
  return anomalies.sort((a, b) => b.zScore - a.zScore);
}

export function calculateCategoryStats(
  currentTransactions: Transaction[],
  prevTransactions: Transaction[],
  budgets: Record<CategoryName, number> = DEFAULT_BUDGETS
): CategoryStat[] {
  const categories = Object.keys(budgets) as CategoryName[];

  return categories.map(cat => {
    const currentList = currentTransactions.filter(t => t.category === cat);
    const prevList = prevTransactions.filter(t => t.category === cat);

    const amounts = currentList.map(t => t.amount);
    const total = amounts.reduce((a, b) => a + b, 0);
    const mean = calculateMean(amounts);
    const stdDev = calculateStdDev(amounts, mean);
    const budget = budgets[cat] || 1;
    const budgetPercent = Number(((total / budget) * 100).toFixed(1));

    const prevTotal = prevList.reduce((a, b) => a + b.amount, 0);
    let trend: '↑' | '↓' | '=' = '=';
    let trendPercent = 0;

    if (prevTotal > 0) {
      trendPercent = Number((((total - prevTotal) / prevTotal) * 100).toFixed(1));
      if (trendPercent > 3) trend = '↑';
      else if (trendPercent < -3) trend = '↓';
      else trend = '=';
    } else if (total > 0) {
      trend = '↑';
      trendPercent = 100;
    }

    return {
      category: cat,
      total: Number(total.toFixed(2)),
      count: currentList.length,
      mean: Number(mean.toFixed(2)),
      stdDev: Number(stdDev.toFixed(2)),
      budget,
      budgetPercent,
      trend,
      trendPercent,
      color: CATEGORY_COLORS[cat] || '#6B7280',
    };
  });
}

// Detect specific behavioral economics patterns in the transaction dataset
export function analyzeBehavioralPatterns(transactions: Transaction[]): {
  dayOfWeekSummary: { day: string; count: number; total: number; avg: number; isSpike?: boolean }[];
  fridaySpikePct: number;
  microExpensesCount: number;
  microExpensesTotal: number;
  weekendPct: number;
} {
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dayTotals = Array(7).fill(0);
  const dayCounts = Array(7).fill(0);

  let microExpensesCount = 0;
  let microExpensesTotal = 0;
  let weekendTotal = 0;
  let totalAmount = 0;

  for (const t of transactions) {
    const date = new Date(t.date + 'T12:00:00');
    const day = isNaN(date.getDay()) ? 0 : date.getDay();
    dayTotals[day] += t.amount;
    dayCounts[day] += 1;
    totalAmount += t.amount;

    if (day === 0 || day === 6) {
      weekendTotal += t.amount;
    }

    // Micro-spending / Latte factor (purchases under $120)
    if (t.amount > 0 && t.amount <= 120) {
      microExpensesCount++;
      microExpensesTotal += t.amount;
    }
  }

  const weekdayAvg = (dayTotals[1] + dayTotals[2] + dayTotals[3] + dayTotals[4]) / 4;
  const fridayTotal = dayTotals[5];
  const fridaySpikePct = weekdayAvg > 0 ? Number((((fridayTotal - weekdayAvg) / weekdayAvg) * 100).toFixed(1)) : 0;
  const weekendPct = totalAmount > 0 ? Number(((weekendTotal / totalAmount) * 100).toFixed(1)) : 0;

  const dayOfWeekSummary = dayNames.map((name, i) => {
    const total = dayTotals[i];
    const count = dayCounts[i];
    const avg = count > 0 ? Number((total / count).toFixed(2)) : 0;
    const isSpike = (i === 5 && fridaySpikePct > 25) || (total > weekdayAvg * 1.35);
    return { day: name, count, total: Number(total.toFixed(2)), avg, isSpike };
  });

  return {
    dayOfWeekSummary,
    fridaySpikePct,
    microExpensesCount,
    microExpensesTotal: Number(microExpensesTotal.toFixed(2)),
    weekendPct,
  };
}

export interface TimelinePoint {
  date: string; // YYYY-MM-DD
  displayDate: string; // e.g. "05 Sep"
  dailyTotal: number;
  cumulativeTotal: number;
  rollingAvg: number;
  count: number;
  hasAnomaly: boolean;
  anomalyZScore?: number;
  anomalyConcept?: string;
  anomalyAmount?: number;
  transactions: Transaction[];
}

export function buildTimelineData(
  transactions: Transaction[],
  anomalies: AnomalyItem[] = []
): TimelinePoint[] {
  if (!transactions.length) return [];

  const anomalyMap = new Map<string, AnomalyItem>();
  anomalies.forEach((a) => anomalyMap.set(a.transaction.id, a));

  // Sort transactions chronologically
  const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Group by date
  const byDate = new Map<string, Transaction[]>();
  for (const t of sorted) {
    const list = byDate.get(t.date) || [];
    list.push(t);
    byDate.set(t.date, list);
  }

  const sortedDates = Array.from(byDate.keys()).sort();
  let runningCumulative = 0;
  const rawPoints: {
    date: string;
    displayDate: string;
    dailyTotal: number;
    cumulativeTotal: number;
    count: number;
    hasAnomaly: boolean;
    anomalyZScore?: number;
    anomalyConcept?: string;
    anomalyAmount?: number;
    transactions: Transaction[];
  }[] = [];

  for (const date of sortedDates) {
    const txs = byDate.get(date) || [];
    const dailyTotal = txs.reduce((sum, t) => sum + t.amount, 0);
    runningCumulative += dailyTotal;

    // Check for anomalies on this date
    let dateAnomaly: AnomalyItem | undefined;
    for (const t of txs) {
      const anom = anomalyMap.get(t.id);
      if (anom && (!dateAnomaly || anom.zScore > dateAnomaly.zScore)) {
        dateAnomaly = anom;
      }
    }

    const dateObj = new Date(date + 'T12:00:00');
    const displayDate = isNaN(dateObj.getTime())
      ? date
      : dateObj.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });

    rawPoints.push({
      date,
      displayDate,
      dailyTotal: Number(dailyTotal.toFixed(2)),
      cumulativeTotal: Number(runningCumulative.toFixed(2)),
      count: txs.length,
      hasAnomaly: Boolean(dateAnomaly),
      anomalyZScore: dateAnomaly ? dateAnomaly.zScore : undefined,
      anomalyConcept: dateAnomaly ? dateAnomaly.transaction.concept : undefined,
      anomalyAmount: dateAnomaly ? dateAnomaly.transaction.amount : undefined,
      transactions: txs,
    });
  }

  // Calculate 3-period rolling average for smoother visualization of trend
  return rawPoints.map((pt, idx, arr) => {
    const start = Math.max(0, idx - 1);
    const end = Math.min(arr.length, idx + 2);
    const slice = arr.slice(start, end);
    const avg = slice.reduce((s, p) => s + p.dailyTotal, 0) / slice.length;
    return {
      ...pt,
      rollingAvg: Number(avg.toFixed(2)),
    };
  });
}

export function buildSpendingRanges(transactions: Transaction[]) {
  const ranges = [
    { label: 'Microgastos (<$150)', min: 0, max: 150, count: 0, total: 0, color: '#A855F7' },
    { label: 'Cotidianos ($150-$500)', min: 150, max: 500, count: 0, total: 0, color: '#3B82F6' },
    { label: 'Medios ($500-$1,500)', min: 500, max: 1500, count: 0, total: 0, color: '#10B981' },
    { label: 'Grandes ($1,500-$3,000)', min: 1500, max: 3000, count: 0, total: 0, color: '#F59E0B' },
    { label: 'Atípicos (>$3,000)', min: 3000, max: Infinity, count: 0, total: 0, color: '#EF4444' },
  ];

  for (const t of transactions) {
    for (const r of ranges) {
      if (t.amount > r.min && t.amount <= r.max) {
        r.count++;
        r.total += t.amount;
        break;
      }
    }
  }

  return ranges;
}

export function calculateGoalProgress(target: number, current: number, targetDateStr: string) {
  const now = new Date();
  const targetDate = new Date(targetDateStr + 'T23:59:59');

  const diffTime = targetDate.getTime() - now.getTime();
  const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const diffWeeks = Math.max(1, Math.ceil(diffDays / 7));
  const diffMonths = Math.max(0.5, Number((diffDays / 30.4375).toFixed(1)));

  const remainingAmount = Math.max(0, target - current);
  const percentComplete = target > 0 ? Math.min(100, Number(((current / target) * 100).toFixed(1))) : 0;

  // Monthly and weekly required savings
  const monthsDivisor = Math.max(1, Math.round(diffMonths));
  const monthlyRequired = Math.ceil(remainingAmount / monthsDivisor);
  const weeklyRequired = Math.ceil(remainingAmount / diffWeeks);

  return {
    remainingAmount,
    percentComplete,
    daysRemaining: diffDays,
    weeksRemaining: diffWeeks,
    monthsRemaining: diffMonths,
    monthlyRequired,
    weeklyRequired,
    isCompleted: current >= target,
  };
}

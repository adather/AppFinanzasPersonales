// Plain date/arithmetic for a savings goal preview (days/weeks/months left,
// required contribution) — kept client-side by design, unlike the rest of
// the analytics engine (see src/api/analytics.ts): it's basic date math, not
// statistics, and it needs to update live as the user types in a modal.
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

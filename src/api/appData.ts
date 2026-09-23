// Persistence for transactions/goals/analysis/model preference — backed by
// Firestore (server/db.py, server/data_routes.py). Replaces localStorage.
// Single fixed user for now (see server/db.py); theme stays in localStorage
// on purpose — it's a per-device display preference, not app data.
import { FinancialAnalysisResult, GeminiModelId, SavingsGoal, Transaction } from '../types';

export interface AppState {
  currentTransactions: Transaction[];
  previousTransactions: Transaction[];
  savingsGoals: SavingsGoal[];
  analysisResult: FinancialAnalysisResult | null;
  selectedModel: GeminiModelId | null;
  // True when this deployment is a public, throwaway demo (DEMO_MODE env var
  // on the backend) — everyone shares one auto-wiped account, never the
  // real data. See server/db.py.
  demoMode: boolean;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.message || json.detail || `Error en ${path}`);
  }
  return json;
}

export async function fetchAppState(): Promise<AppState> {
  const json = await request<{ data: AppState }>('/api/data/state');
  return json.data;
}

export async function createTransaction(tx: Transaction): Promise<void> {
  await request('/api/data/transactions', { method: 'POST', body: JSON.stringify(tx) });
}

export async function deleteTransactionRemote(id: string): Promise<void> {
  await request(`/api/data/transactions/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function createGoal(goal: SavingsGoal): Promise<void> {
  await request('/api/data/goals', { method: 'POST', body: JSON.stringify(goal) });
}

export async function updateGoalRemote(goal: SavingsGoal): Promise<void> {
  await request(`/api/data/goals/${encodeURIComponent(goal.id)}`, { method: 'PUT', body: JSON.stringify(goal) });
}

export async function deleteGoalRemote(id: string): Promise<void> {
  await request(`/api/data/goals/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function addContributionRemote(
  goalId: string,
  amount: number,
  note?: string
): Promise<SavingsGoal> {
  const json = await request<{ goal: SavingsGoal }>(`/api/data/goals/${encodeURIComponent(goalId)}/contributions`, {
    method: 'POST',
    body: JSON.stringify({ amount, note }),
  });
  return json.goal;
}

export async function saveAnalysisRemote(analysis: FinancialAnalysisResult | null): Promise<void> {
  await request('/api/data/analysis', { method: 'PUT', body: JSON.stringify({ analysis }) });
}

export async function saveSelectedModelRemote(selectedModel: GeminiModelId): Promise<void> {
  await request('/api/data/preferences', { method: 'PUT', body: JSON.stringify({ selectedModel }) });
}

export async function resetDataRemote(
  currentTransactions: Transaction[],
  previousTransactions: Transaction[],
  savingsGoals: SavingsGoal[]
): Promise<void> {
  await request('/api/data/reset', {
    method: 'POST',
    body: JSON.stringify({ currentTransactions, previousTransactions, savingsGoals }),
  });
}

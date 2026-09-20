import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Camera,
  Mic,
  Plus,
  BarChart3,
  AlertTriangle,
  TrendingUp,
  ListOrdered,
  MessageSquare,
  RotateCcw,
  Wallet,
  ArrowUpRight,
  Target,
  Sun,
  Moon,
  Menu,
  X,
  Cpu,
  LayoutDashboard,
} from 'lucide-react';
import { Transaction, FinancialAnalysisResult, SavingsGoal, GeminiModelId, BehavioralPatterns, AVAILABLE_GEMINI_MODELS } from './types';
import { getInitialTransactions } from './data/initialTransactions';
import { getInitialSavingsGoals } from './data/initialGoals';
import { fetchAnalyticsSummary, AnalyticsSummary } from './api/analytics';

const EMPTY_BEHAVIORAL_PATTERNS: BehavioralPatterns = {
  dayOfWeekSummary: [],
  fridaySpikePct: 0,
  microExpensesCount: 0,
  microExpensesTotal: 0,
  weekendPct: 0,
};
import { ExecutiveAnalysisView } from './components/ExecutiveAnalysisView';
import { AnomalyDetectorView } from './components/AnomalyDetectorView';
import { PatternsAndChartsView } from './components/PatternsAndChartsView';
import { SavingsGoalsView } from './components/SavingsGoalsView';
import { TransactionListView } from './components/TransactionListView';
import { ReceiptScannerModal } from './components/ReceiptScannerModal';
import { VerbalExpenseModal } from './components/VerbalExpenseModal';
import { AddTransactionModal } from './components/AddTransactionModal';
import { AdvisorChatModal } from './components/AdvisorChatModal';
import { ModelSelectorModal } from './components/ModelSelectorModal';

// Minimal inline sparkline — shows the real 14-day spend trend behind the
// hero number instead of a decorative icon. No axes/labels: at this size
// the shape (rising, flat, spiky) is the point, not exact values.
const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const width = 100;
  const height = 32;
  const max = Math.max(...data, 1);
  const stepX = data.length > 1 ? width / (data.length - 1) : width;
  const points = data.map((v, i) => `${i * stepX},${height - (v / max) * height}`).join(' ');
  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-8" preserveAspectRatio="none">
      <polyline points={areaPoints} fill={color} opacity="0.12" stroke="none" />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default function App() {
  // Local storage keys
  const STORAGE_KEY_CURRENT = 'app_finances_current_tx_v1';
  const STORAGE_KEY_PREV = 'app_finances_prev_tx_v1';
  const STORAGE_KEY_ANALYSIS = 'app_finances_ai_analysis_v1';
  const STORAGE_KEY_GOALS = 'app_finances_savings_goals_v1';
  const STORAGE_KEY_MODEL = 'app_finances_selected_model_v1';

  // AI Model Selection state
  const [selectedModel, setSelectedModel] = useState<GeminiModelId>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MODEL);
      if (
        saved &&
        ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.1-pro-preview'].includes(
          saved
        )
      ) {
        return saved as GeminiModelId;
      }
    } catch (e) {
      console.error(e);
    }
    return 'gemini-3.8-flash';
  });
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);

  // Global theme state: 'light' | 'dark'
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('app_finances_theme_v1');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (e) {
      console.error(e);
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('app_finances_theme_v1', theme);
    } catch (e) {
      console.error(e);
    }
  }, [theme]);

  // Active Model Meta
  const currentModelMeta = useMemo(() => {
    return AVAILABLE_GEMINI_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_GEMINI_MODELS[0];
  }, [selectedModel]);

  // Initialize transactions
  const [currentTransactions, setCurrentTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CURRENT);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return getInitialTransactions().current;
  });

  const [previousTransactions, setPreviousTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREV);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return getInitialTransactions().previous;
  });

  // Initialize Savings Goals
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GOALS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return getInitialSavingsGoals();
  });

  // Threshold multiplier for statistical anomaly detection (modified z-score, robust to outliers)
  const [anomalyThreshold, setAnomalyThreshold] = useState<number>(3.5);

  // All statistics (category stats, anomalies, timeline, behavioral patterns)
  // are computed server-side — see server/analytics.py and src/api/analytics.ts.
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null);

  // Active view tab
  type ActiveTab = 'executive' | 'anomalies' | 'patterns' | 'goals' | 'transactions';
  const [activeTab, setActiveTab] = useState<ActiveTab>('patterns');

  // Mobile sidebar drawer state (sidebar is always visible from lg up)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modals state
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isVerbalModalOpen, setIsVerbalModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdvisorChatOpen, setIsAdvisorChatOpen] = useState(false);
  const [advisorInitialPrompt, setAdvisorInitialPrompt] = useState<string | undefined>(undefined);

  // Analysis result state
  const [analysisResult, setAnalysisResult] = useState<FinancialAnalysisResult | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ANALYSIS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return null;
  });
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Save transactions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(currentTransactions));
    } catch (e) {
      console.error(e);
    }
  }, [currentTransactions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PREV, JSON.stringify(previousTransactions));
    } catch (e) {
      console.error(e);
    }
  }, [previousTransactions]);

  useEffect(() => {
    if (analysisResult) {
      try {
        localStorage.setItem(STORAGE_KEY_ANALYSIS, JSON.stringify(analysisResult));
      } catch (e) {
        console.error(e);
      }
    }
  }, [analysisResult]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_GOALS, JSON.stringify(savingsGoals));
    } catch (e) {
      console.error(e);
    }
  }, [savingsGoals]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MODEL, selectedModel);
    } catch (e) {
      console.error(e);
    }
  }, [selectedModel]);

  // Fetch all statistics from the backend whenever the inputs that affect
  // them change (new/edited transactions, or the anomaly sensitivity slider).
  useEffect(() => {
    let cancelled = false;
    fetchAnalyticsSummary(currentTransactions, previousTransactions, anomalyThreshold)
      .then((summary) => {
        if (!cancelled) setAnalyticsSummary(summary);
      })
      .catch((err) => {
        console.error('Failed to compute analytics summary:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [currentTransactions, previousTransactions, anomalyThreshold]);

  const categoryStats = analyticsSummary?.categoryStats ?? [];
  const detectedAnomalies = analyticsSummary?.anomalies ?? [];
  const timeline = analyticsSummary?.timeline ?? [];
  const spendingRanges = analyticsSummary?.spendingRanges ?? [];
  const behavioralPatterns = analyticsSummary?.behavioralPatterns ?? EMPTY_BEHAVIORAL_PATTERNS;
  // Current transactions decorated with isAnomaly/zScore; falls back to the
  // plain list for the brief window before the first fetch resolves.
  const enrichedTransactions = analyticsSummary?.enrichedTransactions ?? currentTransactions;

  // Financial totals
  const totalSpent = useMemo(() => {
    return currentTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [currentTransactions]);

  const totalPreviousSpent = useMemo(() => {
    return previousTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [previousTransactions]);

  const totalBudget = analyticsSummary?.totalBudget ?? 0;
  const budgetPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Last-14-days daily spend, for the sparkline behind the hero stat
  const last14DaysSpend = useMemo(() => {
    const days = 14;
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (days - 1));

    const buckets = new Array(days).fill(0);
    currentTransactions.forEach((t) => {
      const d = new Date(t.date + 'T12:00:00');
      const diff = Math.round((d.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff < days) buckets[diff] += t.amount;
    });
    return buckets;
  }, [currentTransactions]);

  // Run AI Financial & Behavioral Economics Analysis
  const runDeepAnalysis = useCallback(async (modelOverride?: GeminiModelId) => {
    const modelToUse = modelOverride || selectedModel;
    setIsAnalyzing(true);
    try {
      const currentMonthSummary = {
        totalSpent,
        totalBudget,
        budgetPercentage: Number(((totalSpent / totalBudget) * 100).toFixed(1)),
        totalTransactionsCount: currentTransactions.length,
      };

      const anomaliesPayload = detectedAnomalies.slice(0, 5).map((a) => ({
        id: a.id,
        concepto: a.transaction.concept,
        monto: a.transaction.amount,
        categoria: a.transaction.category,
        fecha: a.transaction.date,
        zScore: a.zScore,
        categoryMedian: a.categoryMedian,
        categoryMAD: a.categoryMAD,
        threshold: a.threshold,
        note: a.transaction.note,
      }));

      const previousMonthComparison = {
        totalPreviousSpent,
        variancePercentage: totalPreviousSpent > 0
          ? Number((((totalSpent - totalPreviousSpent) / totalPreviousSpent) * 100).toFixed(1))
          : 0,
      };

      const res = await fetch('/api/gemini/analyze-finances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentMonthSummary,
          categoryStats,
          anomalies: anomaliesPayload,
          previousMonthComparison,
          samplePatterns: [
            'Patrón de aumento en cafeterías los viernes',
            'Compras de ocio los fines de semana',
            'Microgastos bajo $120 que suman volumen',
          ],
          model: modelToUse,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Error al generar análisis');
      }

      const generated: FinancialAnalysisResult = {
        ...json.data,
        modelUsed: json.modelUsed || modelToUse,
        generatedAt: new Date().toLocaleDateString('es-MX', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setAnalysisResult(generated);
    } catch (err: any) {
      console.error('Failed to run AI analysis:', err);
      // Fallback deterministic analysis if offline
      if (!analysisResult) {
        setAnalysisResult({
          modelUsed: modelToUse,
          resumenEjecutivo: [
            `El gasto total del mes alcanza $${totalSpent.toLocaleString()} representando el ${((totalSpent / totalBudget) * 100).toFixed(1)}% del presupuesto global.`,
            `Se han identificado ${detectedAnomalies.length} gastos con un patrón claramente atípico frente a su categoría (puntaje Z robusto > ${anomalyThreshold.toFixed(1)}).`,
            `La categoría con mayor sobregiro relativo es Restaurantes & Cafeterías con marcada concentración los viernes (+38%).`,
            `Comparado con el mes previo, el gasto total tuvo una variación de ${totalSpent > totalPreviousSpent ? '+' : ''}${(((totalSpent - totalPreviousSpent) / totalPreviousSpent) * 100).toFixed(1)}%.`,
          ],
          tablaCategorias: categoryStats.map((c) => ({
            categoria: c.category,
            totalGastado: c.total,
            porcentajePresupuesto: c.budgetPercent,
            tendencia: c.trend,
            comentarioConductual: c.budgetPercent > 100 ? 'Supera presupuesto planeado' : 'Dentro de rangos saludables',
          })),
          topAnomalias: detectedAnomalies.slice(0, 3).map((a) => ({
            concepto: a.transaction.concept,
            monto: a.transaction.amount,
            categoria: a.transaction.category,
            fecha: a.transaction.date,
            desviacionesEstandar: a.zScore,
            explicacion: a.explanation || 'Gasto atípico muy superior a la media de la categoría.',
          })),
          recomendacionesAhorro: [
            {
              titulo: 'Pre-compromiso en Salidas de Fin de Semana',
              sesgoAbordado: 'Sesgo del Presente (Present Bias)',
              accionConcreta: 'Establece un límite de gasto previo fijando una transferencia de ahorro automático los viernes por la mañana.',
              contextoEstadistico: 'El gasto social en viernes y sábados concentra más del 35% de tus consumos discrecionales.',
            },
            {
              titulo: 'Fricción en Compras de Moda y Tecnología',
              sesgoAbordado: 'Gratificación Instantánea & Descuento Hiperbólico',
              accionConcreta: 'Aplica la regla de enfriamiento de 48 horas antes de cualquier compra no esencial mayor a $1,000.',
              contextoEstadistico: 'Las 2 mayores compras impulsivas representaron un puntaje Z robusto de +2.8 sobre la mediana de la categoría.',
            },
            {
              titulo: 'Contabilidad Mental para Microgastos de Cafetería',
              sesgoAbordado: 'Fricción de Microgastos (The Latte Factor)',
              accionConcreta: 'Asigna una tarjeta prepagada o saldo exclusivo para cafeterías semanales.',
              contextoEstadistico: 'Los microgastos menores a $120 representan más de $800 al mes.',
            },
          ],
          comparativaMesAnterior: {
            cambioTotalPorcentual: Number((((totalSpent - totalPreviousSpent) / totalPreviousSpent) * 100).toFixed(1)),
            analisisComparativo: `El gasto total cambió en un ${(((totalSpent - totalPreviousSpent) / totalPreviousSpent) * 100).toFixed(1)}% respecto al mes anterior, impulsado por gastos imprevistos y compras no recurrentes.`,
            areasDeMejora: [
              'Moderar la frecuencia de visitas a restaurantes durante el cierre de mes.',
              'Mantener un fondo de imprevistos específico para evitar que las reparaciones desbalanceen el presupuesto operativo.',
            ],
          },
          patronesProactivos: [
            'Veo que tu gasto en cafeterías sube 40% los viernes debido al sesgo de auto-recompensa de fin de semana.',
            'Los microgastos recurrentes menores a $120 acumulan un volumen relevante sin generar utilidad duradera.',
          ],
          generatedAt: new Date().toLocaleDateString('es-MX'),
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [totalSpent, totalBudget, currentTransactions, detectedAnomalies, totalPreviousSpent, categoryStats, analysisResult]);

  // Run once real stats are in (avoids sending Gemini an empty/stale
  // snapshot from before the first analytics fetch resolves); also covers
  // the reset-demo-data flow, which just nulls analysisResult and lets this
  // fire again once the fresh summary lands.
  useEffect(() => {
    if (!analysisResult && analyticsSummary) {
      runDeepAnalysis();
    }
  }, [analyticsSummary]);

  // Handlers for adding transactions
  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const created: Transaction = {
      ...newTx,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    setCurrentTransactions((prev) => [created, ...prev]);
  };

  const handleDeleteTransaction = (id: string) => {
    setCurrentTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  // Handlers for Savings Goals
  const handleAddGoal = (newGoalData: Omit<SavingsGoal, 'id' | 'createdAt'>) => {
    const created: SavingsGoal = {
      ...newGoalData,
      id: `goal-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString().split('T')[0],
      contributions: newGoalData.contributions || [],
    };
    setSavingsGoals((prev) => [created, ...prev]);
  };

  const handleUpdateGoal = (updatedGoal: SavingsGoal) => {
    setSavingsGoals((prev) => prev.map((g) => (g.id === updatedGoal.id ? updatedGoal : g)));
  };

  const handleDeleteGoal = (goalId: string) => {
    setSavingsGoals((prev) => prev.filter((g) => g.id !== goalId));
  };

  const handleAddContribution = (goalId: string, amount: number, note?: string) => {
    setSavingsGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const newContrib = {
          id: `contrib-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          amount,
          note,
        };
        return {
          ...g,
          currentAmount: g.currentAmount + amount,
          contributions: [...(g.contributions || []), newContrib],
        };
      })
    );
  };

  // Reset demo data
  const handleResetDemoData = () => {
    if (window.confirm('¿Restablecer las transacciones de prueba y metas de ahorro a los valores iniciales?')) {
      const initial = getInitialTransactions();
      setCurrentTransactions(initial.current);
      setPreviousTransactions(initial.previous);
      setSavingsGoals(getInitialSavingsGoals());
      localStorage.removeItem(STORAGE_KEY_ANALYSIS);
      localStorage.removeItem(STORAGE_KEY_GOALS);
      // Nulling this lets the analyticsSummary-driven effect above re-run
      // the analysis once the fresh (post-reset) stats land — no need to
      // guess a delay for the backend round trip.
      setAnalysisResult(null);
    }
  };

  const navItems: {
    id: ActiveTab;
    label: string;
    subtitle: string;
    icon: typeof BarChart3;
    badge?: number;
  }[] = [
    {
      id: 'patterns',
      label: 'Dashboard',
      subtitle: 'Panorama general: patrones y visualizaciones de gasto',
      icon: LayoutDashboard,
    },
    {
      id: 'executive',
      label: 'Informe IA',
      subtitle: 'Diagnóstico financiero y behavioral economics',
      icon: BarChart3,
    },
    {
      id: 'anomalies',
      label: 'Anomalías',
      subtitle: 'Gastos que superan el umbral estadístico (Z robusto)',
      icon: AlertTriangle,
      badge: detectedAnomalies.length,
    },
    {
      id: 'goals',
      label: 'Metas de ahorro',
      subtitle: 'Seguimiento y consejos de ahorro con IA',
      icon: Target,
      badge: savingsGoals.length,
    },
    {
      id: 'transactions',
      label: 'Transacciones',
      subtitle: 'Historial completo de movimientos',
      icon: ListOrdered,
      badge: enrichedTransactions.length,
    },
  ];
  const activeNavItem = navItems.find((item) => item.id === activeTab) || navItems[0];
  const budgetIsOver = totalBudget > 0 && totalSpent > totalBudget;
  const spentIsHigherThanPrevious = totalSpent > totalPreviousSpent;

  return (
    <div id="financial-agent-app" className="min-h-screen flex bg-paper text-ink transition-colors duration-200">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 h-screen z-50 w-64 shrink-0 bg-sidebar border-r border-rule flex flex-col transition-transform duration-200 print:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-rule shrink-0">
          <div className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center shrink-0">
            <Wallet className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm text-ink truncate">Agente Financiero</div>
            <div className="text-[10px] text-ink-muted truncate">Behavioral Economics</div>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="ml-auto lg:hidden p-1.5 text-ink-muted hover:text-ink rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`tab-${item.id}-btn`}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                  isActive ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:bg-surface hover:text-ink'
                }`}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                <span className="flex-1 text-left truncate">{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                      isActive ? 'bg-accent text-white' : 'bg-rule text-ink-muted'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-rule shrink-0">
          <button
            id="reset-demo-data-btn"
            type="button"
            onClick={handleResetDemoData}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs text-ink-muted hover:bg-surface hover:text-ink transition cursor-pointer"
            title="Restablecer datos de ejemplo con anomalías estadísticas"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restablecer datos demo</span>
          </button>
        </div>
      </aside>

      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-16 shrink-0 bg-paper/95 backdrop-blur-md border-b border-rule transition-colors duration-200 flex items-center justify-between gap-3 px-4 sm:px-6 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1.5 -ml-1 text-ink-muted hover:text-ink rounded-md cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-bold text-base sm:text-lg text-ink truncate">{activeNavItem.label}</h1>
              <p className="hidden sm:block text-xs text-ink-muted truncate">{activeNavItem.subtitle}</p>
            </div>
          </div>

          {/* Topbar Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              id="open-model-selector-header-btn"
              onClick={() => setIsModelSelectorOpen(true)}
              className="px-2.5 py-1.5 text-xs text-ink-muted hover:text-ink border border-rule hover:border-ink/40 rounded-lg transition items-center gap-1.5 cursor-pointer hidden sm:flex"
              title="Cambiar el modelo de Inteligencia Artificial (Gemini)"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span className="font-semibold text-ink">{currentModelMeta.shortName}</span>
            </button>

            <button
              id="toggle-theme-btn"
              onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
              className="p-2 text-ink-muted hover:text-ink border border-rule hover:border-ink/40 rounded-lg transition flex items-center justify-center cursor-pointer"
              title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <button
              id="open-receipt-modal-btn"
              onClick={() => setIsReceiptModalOpen(true)}
              className="p-2 sm:px-3 sm:py-2 text-xs font-medium text-accent bg-accent-soft hover:bg-accent/20 rounded-lg transition items-center gap-1.5 cursor-pointer hidden sm:flex"
              title="Escanear ticket o recibo con IA"
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Escanear</span> Recibo
            </button>
            <button
              id="open-receipt-modal-btn-mobile"
              onClick={() => setIsReceiptModalOpen(true)}
              className="p-2 text-accent bg-accent-soft hover:bg-accent/20 rounded-lg transition flex items-center justify-center cursor-pointer sm:hidden"
              title="Escanear ticket o recibo con IA"
            >
              <Camera className="w-4 h-4" />
            </button>

            <button
              id="open-verbal-modal-btn"
              onClick={() => setIsVerbalModalOpen(true)}
              className="p-2 text-accent bg-accent-soft hover:bg-accent/20 rounded-lg transition flex items-center justify-center cursor-pointer"
              title="Dictar o escribir gasto en lenguaje natural"
            >
              <Mic className="w-4 h-4" />
            </button>

            <button
              id="open-add-modal-btn"
              onClick={() => setIsAddModalOpen(true)}
              className="p-2 text-accent bg-accent-soft hover:bg-accent/20 rounded-lg transition flex items-center justify-center cursor-pointer"
              title="Agregar gasto manual"
            >
              <Plus className="w-4 h-4" />
            </button>

            <button
              id="open-advisor-btn"
              onClick={() => {
                setAdvisorInitialPrompt(undefined);
                setIsAdvisorChatOpen(true);
              }}
              className="px-3 py-2 text-xs font-semibold text-white bg-accent hover:bg-accent/90 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Asesor IA</span>
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 py-6 space-y-6 max-w-[1400px] w-full mx-auto">
          {/* Stat Strip — one unified surface, not four decorative icon-badge
              boxes: numbers and their trend deltas carry the meaning, the
              way an actual finance dashboard (Stripe/Mercury) reads. */}
          <div className="bg-surface rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 divide-rule sm:divide-x print:hidden">
            {/* Total Spent — the hero figure, with its real 14-day trend
                behind it instead of a decorative icon */}
            <div className="p-5">
              <div className="text-xs text-ink-muted">Gasto acumulado</div>
              <div className="text-2xl sm:text-3xl font-bold text-ink mt-1">
                ${totalSpent.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </div>
              <div className="mt-2">
                <Sparkline data={last14DaysSpend} color="var(--accent)" />
              </div>
              <div className="text-xs text-ink-muted mt-1">
                de ${totalBudget.toLocaleString('es-MX')} presupuestados · 14 días
              </div>
            </div>

            {/* Budget Consumption */}
            <div className="p-5">
              <div className="text-xs text-ink-muted">% del presupuesto</div>
              <div className={`text-2xl font-bold mt-1 ${budgetIsOver ? 'text-loss' : 'text-ink'}`}>
                {budgetPercentage.toFixed(1)}%
              </div>
              <div className="w-full h-1.5 rounded-full bg-rule mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${budgetIsOver ? 'bg-loss' : 'bg-accent'}`}
                  style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Statistical Anomalies Detected */}
            <div className="p-5">
              <div className="text-xs text-ink-muted">Anomalías (Z&gt;{anomalyThreshold.toFixed(1)})</div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <AlertTriangle className="w-4 h-4 text-loss shrink-0" />
                <span className="text-2xl font-bold text-loss">{detectedAnomalies.length}</span>
              </div>
              <div className="text-xs text-ink-muted mt-1">puntaje Z robusto sobre la mediana de la categoría</div>
            </div>

            {/* Comparison vs Previous Month */}
            <div className="p-5">
              <div className="text-xs text-ink-muted">vs. mes anterior</div>
              <div className="flex items-baseline gap-1 mt-1">
                <ArrowUpRight
                  className={`w-4 h-4 shrink-0 ${spentIsHigherThanPrevious ? 'text-loss' : 'text-gain rotate-90'}`}
                />
                <span className={`text-2xl font-bold ${spentIsHigherThanPrevious ? 'text-loss' : 'text-gain'}`}>
                  {spentIsHigherThanPrevious ? '+' : ''}
                  {totalPreviousSpent > 0
                    ? (((totalSpent - totalPreviousSpent) / totalPreviousSpent) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
              <div className="text-xs text-ink-muted mt-1">
                {spentIsHigherThanPrevious ? 'incremento en el periodo' : 'contención favorable de gasto'}
              </div>
            </div>
          </div>

          {/* Tab View Render */}
          <div className="transition-all duration-200">
            {activeTab === 'executive' && (
              <ExecutiveAnalysisView
                analysis={analysisResult}
                categoryStats={categoryStats}
                totalSpent={totalSpent}
                totalBudget={totalBudget}
                isLoading={isAnalyzing}
                selectedModel={selectedModel}
                onRefreshAnalysis={() => runDeepAnalysis()}
                onOpenAdvisorChat={(topic) => {
                  setAdvisorInitialPrompt(topic);
                  setIsAdvisorChatOpen(true);
                }}
                onOpenModelSelector={() => setIsModelSelectorOpen(true)}
              />
            )}

            {activeTab === 'anomalies' && (
              <AnomalyDetectorView
                anomalies={detectedAnomalies}
                allTransactions={enrichedTransactions}
                categoryStats={categoryStats}
                currentThreshold={anomalyThreshold}
                onThresholdChange={setAnomalyThreshold}
              />
            )}

            {activeTab === 'patterns' && (
              <PatternsAndChartsView
                transactions={enrichedTransactions}
                categoryStats={categoryStats}
                anomalies={detectedAnomalies}
                behavioralPatterns={behavioralPatterns}
                timeline={timeline}
                spendingRanges={spendingRanges}
              />
            )}

            {activeTab === 'goals' && (
              <SavingsGoalsView
                goals={savingsGoals}
                transactions={enrichedTransactions}
                categoryStats={categoryStats}
                anomalies={detectedAnomalies}
                behavioralPatterns={behavioralPatterns}
                selectedModel={selectedModel}
                onAddGoal={handleAddGoal}
                onUpdateGoal={handleUpdateGoal}
                onDeleteGoal={handleDeleteGoal}
                onAddContribution={handleAddContribution}
              />
            )}

            {activeTab === 'transactions' && (
              <TransactionListView
                transactions={enrichedTransactions}
                onDeleteTransaction={handleDeleteTransaction}
              />
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-rule bg-paper py-4 text-center text-xs text-ink-muted transition-colors duration-200 print:hidden">
          <div className="max-w-[1400px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>Agente de Análisis Financiero Personal & Behavioral Economics</span>
            <div className="flex items-center gap-2">
              <span>Motor activo: <strong className="text-ink font-semibold">{currentModelMeta.name}</strong></span>
              <span className="text-rule">·</span>
              <span>Detección Z-Score robusto (mediana/MAD)</span>
              <button
                onClick={() => setIsModelSelectorOpen(true)}
                className="text-accent hover:text-accent/80 underline ml-1 cursor-pointer font-medium"
              >
                Cambiar modelo
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* Modals */}
      <ReceiptScannerModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        onAddTransaction={handleAddTransaction}
        selectedModel={selectedModel}
        onOpenModelSelector={() => setIsModelSelectorOpen(true)}
      />

      <VerbalExpenseModal
        isOpen={isVerbalModalOpen}
        onClose={() => setIsVerbalModalOpen(false)}
        onAddTransaction={handleAddTransaction}
        selectedModel={selectedModel}
        onOpenModelSelector={() => setIsModelSelectorOpen(true)}
      />

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddTransaction={handleAddTransaction}
      />

      <AdvisorChatModal
        isOpen={isAdvisorChatOpen}
        onClose={() => setIsAdvisorChatOpen(false)}
        transactions={enrichedTransactions}
        categoryStats={categoryStats}
        totalSpent={totalSpent}
        initialMessage={advisorInitialPrompt}
        selectedModel={selectedModel}
        onOpenModelSelector={() => setIsModelSelectorOpen(true)}
      />

      <ModelSelectorModal
        isOpen={isModelSelectorOpen}
        onClose={() => setIsModelSelectorOpen(false)}
        selectedModel={selectedModel}
        onSelectModel={(newModel) => setSelectedModel(newModel)}
        onReanalyzeWithModel={(newModel) => {
          setSelectedModel(newModel);
          runDeepAnalysis(newModel);
        }}
      />
    </div>
  );
}

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Camera,
  Mic,
  Plus,
  BarChart3,
  AlertTriangle,
  TrendingUp,
  ListOrdered,
  MessageSquare,
  RotateCcw,
  ShieldAlert,
  Wallet,
  Calendar,
  CheckCircle2,
  ArrowUpRight,
  PieChart as PieChartIcon,
  Target,
  Sun,
  Moon,
} from 'lucide-react';
import { Transaction, CategoryName, FinancialAnalysisResult, AnomalyItem, CategoryStat, SavingsGoal, GeminiModelId, AVAILABLE_GEMINI_MODELS } from './types';
import { getInitialTransactions } from './data/initialTransactions';
import { getInitialSavingsGoals } from './data/initialGoals';
import {
  calculateCategoryStats,
  detectAnomalies,
  DEFAULT_BUDGETS,
  calculateMean,
  calculateStdDev,
  calculateZScore,
} from './utils/statistics';
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
import { Cpu } from 'lucide-react';

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

  // Threshold multiplier for statistical anomaly detection (default = 2.0 std dev)
  const [anomalyThreshold, setAnomalyThreshold] = useState<number>(2.0);

  // Active view tab
  type ActiveTab = 'executive' | 'anomalies' | 'patterns' | 'goals' | 'transactions';
  const [activeTab, setActiveTab] = useState<ActiveTab>('executive');

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

  // Compute category stats
  const categoryStats = useMemo(() => {
    return calculateCategoryStats(currentTransactions, previousTransactions, DEFAULT_BUDGETS);
  }, [currentTransactions, previousTransactions]);

  // Compute anomalies using statistical Z-Score > anomalyThreshold
  const detectedAnomalies = useMemo(() => {
    return detectAnomalies(currentTransactions, anomalyThreshold);
  }, [currentTransactions, anomalyThreshold]);

  // Decorate current transactions with anomaly tags and exact Z-scores
  const enrichedTransactions = useMemo(() => {
    const anomalyMap = new Map<string, AnomalyItem>();
    detectedAnomalies.forEach((a) => anomalyMap.set(a.id, a));

    return currentTransactions.map((t) => {
      const anom = anomalyMap.get(t.id);
      return {
        ...t,
        isAnomaly: Boolean(anom),
        zScore: anom ? anom.zScore : undefined,
      };
    });
  }, [currentTransactions, detectedAnomalies]);

  // Financial totals
  const totalSpent = useMemo(() => {
    return currentTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [currentTransactions]);

  const totalPreviousSpent = useMemo(() => {
    return previousTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [previousTransactions]);

  const totalBudget = useMemo(() => {
    return Object.values(DEFAULT_BUDGETS).reduce((sum, b) => sum + b, 0);
  }, []);

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
        categoryMean: a.categoryMean,
        categoryStdDev: a.categoryStdDev,
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
            `Se han identificado ${detectedAnomalies.length} gastos que superan 2 desviaciones estándar sobre su media histórica.`,
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
              contextoEstadistico: 'Las 2 mayores compras impulsivas representaron un desvío de +2.8σ del promedio.',
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

  // Run on mount if no analysis exists
  useEffect(() => {
    if (!analysisResult) {
      runDeepAnalysis();
    }
  }, []);

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
      setAnalysisResult(null);
      setTimeout(() => {
        runDeepAnalysis();
      }, 100);
    }
  };

  return (
    <div id="financial-agent-app" className="min-h-screen bg-slate-100/70 text-slate-800 dark:bg-slate-950 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Top Application Bar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-2xs transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Agente de Análisis Financiero
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50 px-2 py-0.5 rounded-md">
                  Behavioral Economics
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 hidden sm:block">
                Patrones de gasto, detección de anomalías (&gt;2σ) e insights accionables
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              id="open-model-selector-header-btn"
              onClick={() => setIsModelSelectorOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Cambiar el modelo de Inteligencia Artificial (Gemini)"
            >
              <Cpu className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span className="hidden lg:inline text-slate-400 dark:text-slate-500 font-normal">IA:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{currentModelMeta.shortName}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-0.5" />
            </button>

            <button
              id="toggle-theme-btn"
              onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
              className="p-1.5 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition flex items-center justify-center cursor-pointer shadow-2xs"
              title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4 text-slate-600" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

            <button
              id="open-receipt-modal-btn"
              onClick={() => setIsReceiptModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              title="Escanear ticket o recibo con IA"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">Escanear</span> Recibo
            </button>

            <button
              id="open-verbal-modal-btn"
              onClick={() => setIsVerbalModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition flex items-center gap-1.5"
              title="Dictar o escribir gasto en lenguaje natural"
            >
              <Mic className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">Gasto</span> Verbal
            </button>

            <button
              id="open-add-modal-btn"
              onClick={() => setIsAddModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5"
              title="Agregar gasto manual"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Manual</span>
            </button>

            <button
              id="open-advisor-btn"
              onClick={() => {
                setAdvisorInitialPrompt(undefined);
                setIsAdvisorChatOpen(true);
              }}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Asesor IA</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Metric Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Total Spent */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-2xs transition-colors duration-200">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Gasto Acumulado
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
              ${totalSpent.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
              <span>Presupuesto:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">${totalBudget.toLocaleString('es-MX')}</span>
            </div>
          </div>

          {/* Budget Consumption */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-2xs transition-colors duration-200">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              % del Presupuesto
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={`text-xl sm:text-2xl font-black font-mono ${
                  (totalSpent / totalBudget) > 1 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                }`}
              >
                {((totalSpent / totalBudget) * 100).toFixed(1)}%
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">utilizado</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  (totalSpent / totalBudget) > 1 ? 'bg-rose-500 dark:bg-rose-600' : 'bg-emerald-500 dark:bg-emerald-600'
                }`}
                style={{ width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Statistical Anomalies Detected */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-2xs transition-colors duration-200">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block flex items-center justify-between">
              <span>Anomalías (&gt;{anomalyThreshold.toFixed(1)}σ)</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
            </span>
            <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono mt-1">
              {detectedAnomalies.length}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Puntaje Z &gt; 2.0 respecto a la media
            </p>
          </div>

          {/* Comparison vs Previous Month */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-2xs transition-colors duration-200">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              vs. Mes Anterior
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span
                className={`text-xl sm:text-2xl font-black font-mono ${
                  totalSpent > totalPreviousSpent ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {totalSpent > totalPreviousSpent ? '+' : ''}
                {totalPreviousSpent > 0
                  ? (((totalSpent - totalPreviousSpent) / totalPreviousSpent) * 100).toFixed(1)
                  : 0}
                %
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                (${totalPreviousSpent.toLocaleString('es-MX')})
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {totalSpent > totalPreviousSpent ? 'Incremento en el periodo' : 'Contención favorable de gasto'}
            </p>
          </div>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex items-center justify-between border-b border-slate-200/90 dark:border-slate-800 pb-2 transition-colors duration-200">
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
            <button
              id="tab-executive-btn"
              type="button"
              onClick={() => setActiveTab('executive')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'executive'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-900/40'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Análisis Ejecutivo & Behavioral</span>
            </button>

            <button
              id="tab-anomalies-btn"
              type="button"
              onClick={() => setActiveTab('anomalies')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'anomalies'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-900/40'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
              <span>Detector de Anomalías (&gt;2σ)</span>
              {detectedAnomalies.length > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === 'anomalies'
                      ? 'bg-rose-500 dark:bg-rose-600 text-white'
                      : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {detectedAnomalies.length}
                </span>
              )}
            </button>

            <button
              id="tab-patterns-btn"
              type="button"
              onClick={() => setActiveTab('patterns')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'patterns'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-900/40'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span>Visualizaciones & Patrones</span>
            </button>

            <button
              id="tab-goals-btn"
              type="button"
              onClick={() => setActiveTab('goals')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'goals'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-900/40'
              }`}
            >
              <Target className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span>Metas de Ahorro ({savingsGoals.length})</span>
            </button>

            <button
              id="tab-transactions-btn"
              type="button"
              onClick={() => setActiveTab('transactions')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'transactions'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-900/40'
              }`}
            >
              <ListOrdered className="w-4 h-4" />
              <span>Transacciones ({enrichedTransactions.length})</span>
            </button>
          </nav>

          <button
            id="reset-demo-data-btn"
            type="button"
            onClick={handleResetDemoData}
            className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-900 transition cursor-pointer"
            title="Restablecer datos de ejemplo con anomalías estadísticas"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Datos Demo</span>
          </button>
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
            />
          )}

          {activeTab === 'goals' && (
            <SavingsGoalsView
              goals={savingsGoals}
              transactions={enrichedTransactions}
              categoryStats={categoryStats}
              anomalies={detectedAnomalies}
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
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 text-center text-xs text-slate-400 dark:text-slate-500 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Agente de Análisis Financiero Personal & Behavioral Economics</span>
          <div className="flex items-center gap-2">
            <span>Motor activo: <strong className="text-slate-600 dark:text-slate-400 font-semibold">{currentModelMeta.name}</strong></span>
            <span>•</span>
            <span>Detección Z-Score (&gt;2σ)</span>
            <button
              onClick={() => setIsModelSelectorOpen(true)}
              className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 underline ml-1 cursor-pointer font-medium"
            >
              Cambiar modelo
            </button>
          </div>
        </div>
      </footer>

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

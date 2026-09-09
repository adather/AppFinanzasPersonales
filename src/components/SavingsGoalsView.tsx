import React, { useState } from 'react';
import {
  Target,
  Plus,
  Calendar,
  DollarSign,
  TrendingUp,
  Sparkles,
  Shield,
  Home,
  Plane,
  GraduationCap,
  Car,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Lightbulb,
  History,
  Sliders,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit3,
  Flame,
  Coffee,
  Check,
} from 'lucide-react';
import { SavingsGoal, Transaction, CategoryStat, AnomalyItem, GeminiModelId } from '../types';
import { calculateGoalProgress, analyzeBehavioralPatterns } from '../utils/statistics';
import { AddGoalModal } from './AddGoalModal';
import { ContributeGoalModal } from './ContributeGoalModal';

interface SavingsGoalsViewProps {
  goals: SavingsGoal[];
  transactions: Transaction[];
  categoryStats: CategoryStat[];
  anomalies?: AnomalyItem[];
  selectedModel?: GeminiModelId;
  onAddGoal: (goal: Omit<SavingsGoal, 'id' | 'createdAt'>) => void;
  onUpdateGoal: (goal: SavingsGoal) => void;
  onDeleteGoal: (goalId: string) => void;
  onAddContribution: (goalId: string, amount: number, note?: string) => void;
}

export const SavingsGoalsView: React.FC<SavingsGoalsViewProps> = ({
  goals,
  transactions,
  categoryStats,
  anomalies = [],
  selectedModel = 'gemini-3.8-flash',
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  onAddContribution,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [contributeGoal, setContributeGoal] = useState<SavingsGoal | null>(null);
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(goals[0]?.id || null);
  const [loadingAdviceGoalId, setLoadingAdviceGoalId] = useState<string | null>(null);

  // Behavioral spending context
  const behavioral = analyzeBehavioralPatterns(transactions);
  const totalSpentMonth = transactions.reduce((acc, t) => acc + t.amount, 0);

  // Global totals
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalCurrent = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const globalProgress = totalTarget > 0 ? Number(((totalCurrent / totalTarget) * 100).toFixed(1)) : 0;

  // Total monthly savings required across all active goals
  const totalMonthlyRequired = goals.reduce((sum, g) => {
    const calc = calculateGoalProgress(g.targetAmount, g.currentAmount, g.targetDate);
    return sum + (calc.isCompleted ? 0 : calc.monthlyRequired);
  }, 0);

  const getCategoryIcon = (category: SavingsGoal['category']) => {
    switch (category) {
      case 'vivienda':
        return Home;
      case 'emergencia':
        return Shield;
      case 'viajes':
        return Plane;
      case 'educacion':
        return GraduationCap;
      case 'vehiculo':
        return Car;
      default:
        return Target;
    }
  };

  // Request AI personalized advice for a specific goal
  const handleRequestAiAdvice = async (goal: SavingsGoal) => {
    setLoadingAdviceGoalId(goal.id);
    try {
      const calc = calculateGoalProgress(goal.targetAmount, goal.currentAmount, goal.targetDate);
      const res = await fetch('/api/gemini/savings-goal-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: {
            title: goal.title,
            category: goal.category,
            targetAmount: goal.targetAmount,
            currentAmount: goal.currentAmount,
            targetDate: goal.targetDate,
            monthlyRequired: calc.monthlyRequired,
            weeklyRequired: calc.weeklyRequired,
          },
          financialContext: {
            totalSpentMonth,
            fridaySpikePct: behavioral.fridaySpikePct,
            microExpensesTotal: behavioral.microExpensesTotal,
            weekendPct: behavioral.weekendPct,
            anomaliesCount: anomalies.length,
            topCategories: categoryStats.slice(0, 4).map((c) => ({
              category: c.category,
              total: c.total,
              budgetPercent: c.budgetPercent,
            })),
          },
          model: selectedModel,
        }),
      });

      const data = await res.json();
      if (data.success && data.data?.customAdvice) {
        const updatedAdvice = data.data.customAdvice.map((adv: any, i: number) => ({
          id: `adv-${Date.now()}-${i}`,
          focusCategory: adv.focusCategory || 'Gastos Discrecionales',
          monthlySavingPotential: adv.monthlySavingPotential || 800,
          tip: adv.tip,
          behavioralBias: adv.behavioralBias || 'Behavioral Nudge',
          impactWeeksAccelerated: adv.impactWeeksAccelerated || 2,
        }));

        onUpdateGoal({
          ...goal,
          customAdvice: updatedAdvice,
        });
      }
    } catch (err) {
      console.error('Failed to get savings advice:', err);
    } finally {
      setLoadingAdviceGoalId(null);
    }
  };

  return (
    <div id="savings-goals-container" className="space-y-8 text-slate-800 dark:text-slate-200">
      {/* Top Header & Summary KPIs */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-6 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400">
                <Target className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Metas de Ahorro Concretas</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Define tus proyectos prioritarios (casa, fondo de emergencia, vacaciones) y calcula
              el ahorro periódico requerido con consejos conductuales basados en tus hábitos de gasto reales.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingGoal(null);
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Definir Nueva Meta</span>
          </button>
        </div>

        {/* Global KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 font-mono tracking-wider block">
              Ahorro Acumulado Total
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
              ${totalCurrent.toLocaleString('es-MX')}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              de ${totalTarget.toLocaleString('es-MX')} en objetivos
            </span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 font-mono tracking-wider block">
              Progreso Global
            </span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {globalProgress}%
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, globalProgress)}%` }}
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 font-mono tracking-wider block">
              Compromiso Mensual Total
            </span>
            <div className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono">
              ${totalMonthlyRequired.toLocaleString('es-MX')}
              <span className="text-xs font-normal text-slate-400 dark:text-slate-500 font-sans"> / mes</span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Para cumplir todas en tiempo
            </span>
          </div>

          <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/80 dark:border-emerald-900/40 space-y-1">
            <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-400 font-mono tracking-wider block flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              Margen de Optimización
            </span>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
              +${(behavioral.microExpensesTotal + 1200).toLocaleString('es-MX')}
              <span className="text-xs font-normal text-emerald-600 dark:text-emerald-500 font-sans"> / mes</span>
            </div>
            <span className="text-[11px] text-emerald-800 dark:text-emerald-500">
              Identificado en hábitos conductuales
            </span>
          </div>
        </div>
      </div>

      {/* Behavioral Economics Savings Bridge / Insights Banner */}
      <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Lightbulb className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60">
                  Economía Conductual Aplicada a tus Metas
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mt-1">
                ¿Cómo fondear tus ${totalMonthlyRequired.toLocaleString('es-MX')}/mes sin privaciones?
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                Tus datos muestran <strong>${behavioral.microExpensesTotal.toLocaleString('es-MX')}</strong> en microgastos (&lt;$150)
                y un incremento del <strong>{behavioral.fridaySpikePct}%</strong> en restaurantes los viernes. Si aplicas
                la regla de pre-compromiso (transferir el ahorro antes del viernes), cubres de inmediato el{' '}
                <strong>
                  {totalMonthlyRequired > 0
                    ? Math.min(100, Math.round(((behavioral.microExpensesTotal + 1200) / totalMonthlyRequired) * 100))
                    : 0}
                  %
                </strong>{' '}
                de tu compromiso mensual.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-850 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
            <Target className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Aún no has definido metas de ahorro</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              Comienza estableciendo una meta como un Fondo de Emergencia, el Pago Inicial de una Casa o tus próximas Vacaciones.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-xl text-xs font-bold shadow-xs inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Primera Meta</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
              Metas Activas ({goals.length})
            </h3>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Haz clic en cada meta para ver el desglose de cuotas y consejos personalizados
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {goals.map((goal) => {
              const calc = calculateGoalProgress(goal.targetAmount, goal.currentAmount, goal.targetDate);
              const CategoryIcon = getCategoryIcon(goal.category);
              const isExpanded = expandedGoalId === goal.id;

              return (
                <div
                  key={goal.id}
                  id={`goal-card-${goal.id}`}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden transition hover:border-slate-300 dark:hover:border-slate-700"
                >
                  {/* Top Bar of the Card */}
                  <div className="p-6 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div
                          className="w-12 h-12 rounded-xl text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5"
                          style={{ backgroundColor: goal.color || '#10B981' }}
                        >
                          <CategoryIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
                              {goal.category}
                            </span>
                            {calc.isCompleted ? (
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Meta Alcanzada
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {calc.monthsRemaining} meses restantes
                              </span>
                            )}
                          </div>

                          <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{goal.title}</h4>
                          {goal.notes && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl line-clamp-1">
                              {goal.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Top Right Quick Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setContributeGoal(goal)}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Abonar Ahorro</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingGoal(goal);
                            setIsAddModalOpen(true);
                          }}
                          className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Editar meta"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`¿Seguro que deseas eliminar la meta "${goal.title}"?`)) {
                              onDeleteGoal(goal.id);
                            }
                          }}
                          className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/35 transition cursor-pointer"
                          title="Eliminar meta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar & Amount Row */}
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between text-xs">
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                            ${goal.currentAmount.toLocaleString('es-MX')}
                          </span>
                          <span className="text-slate-400 dark:text-slate-500 font-mono">
                            / ${goal.targetAmount.toLocaleString('es-MX')}
                          </span>
                        </div>
                        <div className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                          {calc.percentComplete}% completado
                        </div>
                      </div>

                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            backgroundColor: goal.color || '#10B981',
                            width: `${Math.min(100, calc.percentComplete)}%`,
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-0.5">
                        <span>
                          Faltan por ahorrar: <strong className="text-slate-700 dark:text-slate-300">${calc.remainingAmount.toLocaleString('es-MX')}</strong>
                        </span>
                        <span>
                          Fecha límite: <strong className="text-slate-700 dark:text-slate-300">{goal.targetDate}</strong> ({calc.weeksRemaining} semanas)
                        </span>
                      </div>
                    </div>

                    {/* CALCULATED REQUIRED SAVINGS BOX (MONTH / WEEK) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                      <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block font-mono">
                          Ahorro Requerido por Mes
                        </span>
                        <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">
                          ${calc.monthlyRequired.toLocaleString('es-MX')}
                          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 font-sans"> / mes</span>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {calc.monthsRemaining} mensualidades fijas
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block font-mono">
                          Ahorro Requerido por Semana
                        </span>
                        <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                          ${calc.weeklyRequired.toLocaleString('es-MX')}
                          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 font-sans"> / sem</span>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {calc.weeksRemaining} depósitos semanales
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block font-mono">
                          Ahorro Diario Sugerido
                        </span>
                        <div className="text-base font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                          ${Math.ceil(calc.weeklyRequired / 7).toLocaleString('es-MX')}
                          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 font-sans"> / día</span>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          Equivalente a 1-2 cafés al día
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expand / Collapse Behavioral Advice & History Toggle */}
                  <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 px-6 py-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)}
                      className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>
                        {isExpanded ? 'Ocultar Estrategia Conductual' : 'Ver Consejos Personalizados y Estrategia Conductual'}
                      </span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                      {goal.contributions?.length || 0} abonos registrados
                    </span>
                  </div>

                  {/* Expanded Section: Behavioral Advice & Contribution History */}
                  {isExpanded && (
                    <div className="p-6 bg-slate-50/40 dark:bg-slate-950/10 border-t border-slate-100 dark:border-slate-800 space-y-6">
                      {/* Personalized Behavioral Advice Section */}
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <h5 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                              Consejos Personalizados Basados en Tus Patrones de Gasto
                            </h5>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRequestAiAdvice(goal)}
                            disabled={loadingAdviceGoalId === goal.id}
                            className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-750 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                          >
                            <Sparkles className={`w-3.5 h-3.5 text-amber-500 ${loadingAdviceGoalId === goal.id ? 'animate-spin' : ''}`} />
                            <span>
                              {loadingAdviceGoalId === goal.id ? 'Analizando con Gemini...' : 'Regenerar Consejos IA'}
                            </span>
                          </button>
                        </div>

                        {/* Advice Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {goal.customAdvice && goal.customAdvice.length > 0 ? (
                            goal.customAdvice.map((adv) => (
                              <div
                                key={adv.id}
                                className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2 text-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded-md text-[11px]">
                                    {adv.focusCategory}
                                  </span>
                                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/40">
                                    Ahorro: +${adv.monthlySavingPotential.toLocaleString('es-MX')}/mes
                                  </span>
                                </div>

                                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{adv.tip}</p>

                                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-805 text-[10px] text-slate-400 dark:text-slate-500">
                                  <span className="italic">{adv.behavioralBias}</span>
                                  {adv.impactWeeksAccelerated && (
                                    <span className="font-bold text-blue-600 dark:text-blue-400">
                                      Adelanta la meta {adv.impactWeeksAccelerated} semanas
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="col-span-2 p-4 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Genera consejos conductuales con IA diseñados específicamente para cruzar tus transacciones
                                y financiar esta meta sin fricción.
                              </p>
                              <button
                                type="button"
                                onClick={() => handleRequestAiAdvice(goal)}
                                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                Generar Consejos Personalizados con IA
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Contribution History Table */}
                      <div className="space-y-2.5 pt-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <History className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                            <h5 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                              Historial de Abonos Recientes
                            </h5>
                          </div>
                          <button
                            type="button"
                            onClick={() => setContributeGoal(goal)}
                            className="text-xs text-emerald-700 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                          >
                            + Agregar abono
                          </button>
                        </div>

                        {goal.contributions && goal.contributions.length > 0 ? (
                          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                            {goal.contributions.slice(-5).reverse().map((contrib) => (
                              <div
                                key={contrib.id}
                                className="px-4 py-2.5 flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2.5">
                                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  <div>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                      {contrib.note || 'Abono programado'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-mono">
                                      {contrib.date}
                                    </span>
                                  </div>
                                </div>
                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                  +${contrib.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs text-center italic">
                            No hay abonos registrados aún. Haz clic en "Abonar Ahorro" para iniciar.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <AddGoalModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingGoal(null);
        }}
        onSaveGoal={(goalData) => {
          if (editingGoal) {
            onUpdateGoal({
              ...editingGoal,
              ...goalData,
            });
          } else {
            onAddGoal(goalData);
          }
        }}
        editingGoal={editingGoal}
      />

      <ContributeGoalModal
        isOpen={Boolean(contributeGoal)}
        onClose={() => setContributeGoal(null)}
        goal={contributeGoal}
        onAddContribution={onAddContribution}
      />
    </div>
  );
};

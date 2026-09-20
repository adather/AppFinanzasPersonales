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
import { SavingsGoal, Transaction, CategoryStat, AnomalyItem, BehavioralPatterns, GeminiModelId } from '../types';
import { calculateGoalProgress } from '../utils/goalMath';
import { AddGoalModal } from './AddGoalModal';
import { ContributeGoalModal } from './ContributeGoalModal';

interface SavingsGoalsViewProps {
  goals: SavingsGoal[];
  transactions: Transaction[];
  categoryStats: CategoryStat[];
  anomalies?: AnomalyItem[];
  behavioralPatterns: BehavioralPatterns;
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
  behavioralPatterns,
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

  // Behavioral spending context (computed server-side; see src/api/analytics.ts)
  const behavioral = behavioralPatterns;
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

  const progressBadgeColor = globalProgress >= 100 ? 'bg-gain' : 'bg-accent';

  return (
    <div id="savings-goals-container" className="space-y-6 text-ink">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs text-ink-muted">
            <Target className="w-3.5 h-3.5 text-gain" />
            Proyectos de ahorro con seguimiento estadístico
          </div>
          <h2 className="font-bold text-xl text-ink tracking-tight">Metas de ahorro concretas</h2>
          <p className="text-xs text-ink-muted mt-0.5 max-w-2xl leading-relaxed">
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
          className="px-4 py-2 text-xs font-semibold text-white bg-accent hover:bg-accent/90 rounded-lg transition flex items-center gap-2 shrink-0 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Definir nueva meta</span>
        </button>
      </div>

      {/* Global KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-sm">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent text-white flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-lg sm:text-xl font-bold text-ink truncate">
              ${totalCurrent.toLocaleString('es-MX')}
            </div>
            <div className="text-xs text-ink-muted truncate">
              de ${totalTarget.toLocaleString('es-MX')} en objetivos
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-sm">
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl text-white flex items-center justify-center shrink-0 ${progressBadgeColor}`}>
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-lg sm:text-xl font-bold text-ink truncate">{globalProgress}%</div>
            <div className="w-full h-1.5 bg-rule rounded-full mt-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressBadgeColor}`}
                style={{ width: `${Math.min(100, globalProgress)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-sm">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent text-white flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-base sm:text-xl font-bold text-ink truncate">
              ${totalMonthlyRequired.toLocaleString('es-MX')}
              <span className="text-xs font-sans font-normal text-ink-muted"> /mes</span>
            </div>
            <div className="text-xs text-ink-muted truncate">Para cumplir todas en tiempo</div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-sm">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-insight text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-base sm:text-xl font-bold text-insight truncate">
              +${(behavioral.microExpensesTotal + 1200).toLocaleString('es-MX')}
              <span className="text-xs font-sans font-normal text-ink-muted"> /mes</span>
            </div>
            <div className="text-xs text-ink-muted truncate">Margen de optimización IA</div>
          </div>
        </div>
      </div>

      {/* Behavioral Economics Savings Bridge / Insights Banner */}
      <div className="rounded-2xl shadow-sm p-6 space-y-3 bg-accent text-white">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/15 text-white flex items-center justify-center shrink-0">
            <Lightbulb className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="text-xs text-white/70">Economía conductual aplicada a tus metas</span>
            <h3 className="font-bold text-lg text-white mt-0.5">
              ¿Cómo fondear tus ${totalMonthlyRequired.toLocaleString('es-MX')}/mes sin privaciones?
            </h3>
            <p className="text-xs text-white/85 mt-1.5 max-w-3xl leading-relaxed">
              Tus datos muestran <strong className="text-white">${behavioral.microExpensesTotal.toLocaleString('es-MX')}</strong> en microgastos (&lt;$150)
              y un incremento del <strong className="text-white">{behavioral.fridaySpikePct}%</strong> en restaurantes los viernes. Si aplicas
              la regla de pre-compromiso (transferir el ahorro antes del viernes), cubres de inmediato el{' '}
              <strong className="text-white underline decoration-white/40">
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

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="bg-surface rounded-2xl shadow-sm p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-accent-soft text-accent mx-auto flex items-center justify-center">
            <Target className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-bold text-base text-ink">Aún no has definido metas de ahorro</h3>
            <p className="text-xs text-ink-muted max-w-md mx-auto mt-1">
              Comienza estableciendo una meta como un Fondo de Emergencia, el Pago Inicial de una Casa o tus próximas Vacaciones.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 bg-accent text-white hover:bg-accent/90 rounded-lg text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Crear primera meta</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-bold text-base text-ink">Metas activas ({goals.length})</h3>
            <span className="text-xs text-ink-muted">
              Haz clic en cada meta para ver el desglose de cuotas y consejos personalizados
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {goals.map((goal) => {
              const calc = calculateGoalProgress(goal.targetAmount, goal.currentAmount, goal.targetDate);
              const CategoryIcon = getCategoryIcon(goal.category);
              const isExpanded = expandedGoalId === goal.id;

              return (
                <div
                  key={goal.id}
                  id={`goal-card-${goal.id}`}
                  className="bg-surface rounded-2xl shadow-sm"
                >
                  {/* Top Bar of the Card */}
                  <div className="p-5 sm:p-6 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div
                          className="w-12 h-12 rounded-xl text-white flex items-center justify-center shrink-0"
                          style={{ backgroundColor: goal.color || '#10B981' }}
                        >
                          <CategoryIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-ink-muted capitalize">{goal.category}</span>
                            {calc.isCompleted ? (
                              <span className="text-xs font-medium px-2 py-1 rounded-full bg-gain/10 text-gain flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Meta alcanzada
                              </span>
                            ) : (
                              <span className="text-xs font-medium px-2 py-1 rounded-full bg-rule/60 text-ink-muted flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" /> {calc.monthsRemaining} meses restantes
                              </span>
                            )}
                          </div>

                          <h4 className="font-bold text-lg text-ink mt-0.5">{goal.title}</h4>
                          {goal.notes && (
                            <p className="text-xs text-ink-muted mt-0.5 max-w-xl line-clamp-1">
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
                          className="px-3.5 py-2 text-xs font-semibold text-white bg-accent hover:bg-accent/90 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Abonar ahorro</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingGoal(goal);
                            setIsAddModalOpen(true);
                          }}
                          className="p-2 text-ink-muted hover:text-ink hover:bg-rule/60 rounded-lg transition cursor-pointer"
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
                          className="p-2 text-ink-muted hover:text-loss hover:bg-loss/10 rounded-lg transition cursor-pointer"
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
                          <span className="font-bold text-xl text-ink">
                            ${goal.currentAmount.toLocaleString('es-MX')}
                          </span>
                          <span className="text-ink-muted font-mono">
                            / ${goal.targetAmount.toLocaleString('es-MX')}
                          </span>
                        </div>
                        <div className="font-mono text-ink-muted">
                          {calc.percentComplete}% completado
                        </div>
                      </div>

                      <div className="w-full bg-rule h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            backgroundColor: goal.color || '#10B981',
                            width: `${Math.min(100, calc.percentComplete)}%`,
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-ink-muted pt-0.5">
                        <span>
                          Faltan por ahorrar: <strong className="text-ink font-mono font-normal">${calc.remainingAmount.toLocaleString('es-MX')}</strong>
                        </span>
                        <span>
                          Fecha límite: <strong className="text-ink font-normal">{goal.targetDate}</strong> ({calc.weeksRemaining} semanas)
                        </span>
                      </div>
                    </div>

                    {/* CALCULATED REQUIRED SAVINGS BOX (MONTH / WEEK) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-rule">
                      <div>
                        <span className="text-xs text-ink-muted block">Ahorro requerido por mes</span>
                        <div className="font-mono text-base text-ink mt-0.5">
                          ${calc.monthlyRequired.toLocaleString('es-MX')}
                          <span className="text-xs font-sans text-ink-muted"> / mes</span>
                        </div>
                        <span className="text-xs text-ink-muted">
                          {calc.monthsRemaining} mensualidades fijas
                        </span>
                      </div>

                      <div>
                        <span className="text-xs text-ink-muted block">Ahorro requerido por semana</span>
                        <div className="font-mono text-base text-ink mt-0.5">
                          ${calc.weeklyRequired.toLocaleString('es-MX')}
                          <span className="text-xs font-sans text-ink-muted"> / sem</span>
                        </div>
                        <span className="text-xs text-ink-muted">
                          {calc.weeksRemaining} depósitos semanales
                        </span>
                      </div>

                      <div>
                        <span className="text-xs text-ink-muted block">Ahorro diario sugerido</span>
                        <div className="font-mono text-base text-ink mt-0.5">
                          ${Math.ceil(calc.weeklyRequired / 7).toLocaleString('es-MX')}
                          <span className="text-xs font-sans text-ink-muted"> / día</span>
                        </div>
                        <span className="text-xs text-ink-muted">
                          Equivalente a 1-2 cafés al día
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expand / Collapse Behavioral Advice & History Toggle */}
                  <div className="border-t border-rule px-5 sm:px-6 py-3 flex items-center justify-between flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)}
                      className="text-xs font-medium text-ink-muted hover:text-ink flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-insight" />
                      <span>
                        {isExpanded ? 'Ocultar estrategia conductual' : 'Ver consejos personalizados y estrategia conductual'}
                      </span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <span className="text-xs text-ink-muted font-mono">
                      {goal.contributions?.length || 0} abonos registrados
                    </span>
                  </div>

                  {/* Expanded Section: Behavioral Advice & Contribution History */}
                  {isExpanded && (
                    <div className="p-5 sm:p-6 border-t border-rule space-y-6">
                      {/* Personalized Behavioral Advice Section */}
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-insight/15 text-insight flex items-center justify-center shrink-0">
                              <Sparkles className="w-3.5 h-3.5" />
                            </div>
                            <h5 className="text-xs text-ink-muted">
                              Consejos personalizados basados en tus patrones de gasto
                            </h5>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRequestAiAdvice(goal)}
                            disabled={loadingAdviceGoalId === goal.id}
                            className="px-3 py-1.5 bg-accent-soft text-accent hover:bg-accent/20 rounded-lg text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                          >
                            <Sparkles className={`w-3.5 h-3.5 ${loadingAdviceGoalId === goal.id ? 'animate-spin' : ''}`} />
                            <span>
                              {loadingAdviceGoalId === goal.id ? 'Analizando con Gemini...' : 'Regenerar consejos IA'}
                            </span>
                          </button>
                        </div>

                        {/* Advice Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {goal.customAdvice && goal.customAdvice.length > 0 ? (
                            goal.customAdvice.map((adv) => (
                              <div
                                key={adv.id}
                                className="rounded-xl bg-insight/5 p-4 space-y-2.5 text-xs"
                              >
                                <div className="flex items-start justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-insight/15 text-insight flex items-center justify-center shrink-0">
                                      <Lightbulb className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-ink font-medium">{adv.focusCategory}</span>
                                  </div>
                                  <span className="text-gain font-mono">
                                    +${adv.monthlySavingPotential.toLocaleString('es-MX')}/mes
                                  </span>
                                </div>

                                <p className="text-ink leading-relaxed">{adv.tip}</p>

                                <div className="flex items-center justify-between pt-2.5 border-t border-rule text-xs">
                                  <span className="px-2 py-0.5 rounded-full bg-insight/10 text-insight">{adv.behavioralBias}</span>
                                  {adv.impactWeeksAccelerated && (
                                    <span className="text-ink-muted">
                                      Adelanta la meta {adv.impactWeeksAccelerated} semanas
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="md:col-span-2 rounded-xl bg-insight/5 text-center p-5 space-y-2.5">
                              <p className="text-xs text-ink-muted">
                                Genera consejos conductuales con IA diseñados específicamente para cruzar tus transacciones
                                y financiar esta meta sin fricción.
                              </p>
                              <button
                                type="button"
                                onClick={() => handleRequestAiAdvice(goal)}
                                className="px-4 py-2 bg-accent text-white hover:bg-accent/90 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                Generar consejos personalizados con IA
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Contribution History Table */}
                      <div className="space-y-2.5 pt-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <History className="w-3.5 h-3.5 text-ink-muted" />
                            <h5 className="text-xs text-ink-muted">
                              Historial de abonos recientes
                            </h5>
                          </div>
                          <button
                            type="button"
                            onClick={() => setContributeGoal(goal)}
                            className="text-xs text-accent hover:text-accent/80 font-medium transition cursor-pointer"
                          >
                            + Agregar abono
                          </button>
                        </div>

                        {goal.contributions && goal.contributions.length > 0 ? (
                          <div className="divide-y divide-rule">
                            {goal.contributions.slice(-5).reverse().map((contrib) => (
                              <div
                                key={contrib.id}
                                className="py-2.5 flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2.5">
                                  <span className="w-6 h-6 rounded-full bg-gain/10 text-gain flex items-center justify-center shrink-0">
                                    <Check className="w-3.5 h-3.5" />
                                  </span>
                                  <div>
                                    <span className="text-ink">
                                      {contrib.note || 'Abono programado'}
                                    </span>
                                    <span className="text-xs text-ink-muted block font-mono">
                                      {contrib.date}
                                    </span>
                                  </div>
                                </div>
                                <span className="font-mono text-ink">
                                  +${contrib.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-paper rounded-xl p-3 text-ink-muted text-xs text-center">
                            No hay abonos registrados aún. Haz clic en "Abonar ahorro" para iniciar.
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

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
    <div id="savings-goals-container" className="space-y-10 text-ink">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-rule">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs text-ink-muted">
            <Target className="w-3.5 h-3.5 text-gain" />
            Proyectos de ahorro con seguimiento estadístico
          </div>
          <h2 className="font-display text-2xl text-ink tracking-tight">Metas de ahorro concretas</h2>
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
          className="px-4 py-2 text-xs font-semibold text-paper bg-ink hover:bg-ink/85 rounded-md transition flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Definir nueva meta</span>
        </button>
      </div>

      {/* Global KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y divide-x-0 md:divide-y-0 md:divide-x divide-rule border border-rule rounded-md overflow-hidden">
        <div className="p-4">
          <span className="text-xs text-ink-muted block">Ahorro acumulado total</span>
          <div className="font-display text-2xl text-ink mt-1">
            ${totalCurrent.toLocaleString('es-MX')}
          </div>
          <div className="text-xs text-ink-muted mt-1 font-mono">
            de ${totalTarget.toLocaleString('es-MX')} en objetivos
          </div>
        </div>

        <div className="p-4">
          <span className="text-xs text-ink-muted block">Progreso global</span>
          <div className="font-display text-2xl text-ink mt-1">{globalProgress}%</div>
          <div className="w-full h-1 bg-rule mt-2.5 overflow-hidden">
            <div
              className="bg-gain h-full transition-all duration-500"
              style={{ width: `${Math.min(100, globalProgress)}%` }}
            />
          </div>
        </div>

        <div className="p-4">
          <span className="text-xs text-ink-muted block">Compromiso mensual total</span>
          <div className="font-display text-2xl text-ink mt-1">
            ${totalMonthlyRequired.toLocaleString('es-MX')}
            <span className="text-xs font-sans text-ink-muted"> / mes</span>
          </div>
          <p className="text-xs text-ink-muted mt-1">Para cumplir todas en tiempo</p>
        </div>

        <div className="p-4">
          <span className="text-xs text-ink-muted flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-insight" />
            Margen de optimización
          </span>
          <div className="font-display text-2xl text-insight mt-1">
            +${(behavioral.microExpensesTotal + 1200).toLocaleString('es-MX')}
            <span className="text-xs font-sans text-ink-muted"> / mes</span>
          </div>
          <p className="text-xs text-ink-muted mt-1">Identificado en hábitos conductuales</p>
        </div>
      </div>

      {/* Behavioral Economics Savings Bridge / Insights Banner */}
      <div className="p-6 bg-ink text-paper space-y-3">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-insight shrink-0 mt-0.5" />
          <div>
            <span className="text-xs text-paper/60">Economía conductual aplicada a tus metas</span>
            <h3 className="font-display text-lg text-paper mt-0.5">
              ¿Cómo fondear tus ${totalMonthlyRequired.toLocaleString('es-MX')}/mes sin privaciones?
            </h3>
            <p className="text-xs text-paper/75 mt-1.5 max-w-3xl leading-relaxed">
              Tus datos muestran <strong className="text-paper">${behavioral.microExpensesTotal.toLocaleString('es-MX')}</strong> en microgastos (&lt;$150)
              y un incremento del <strong className="text-paper">{behavioral.fridaySpikePct}%</strong> en restaurantes los viernes. Si aplicas
              la regla de pre-compromiso (transferir el ahorro antes del viernes), cubres de inmediato el{' '}
              <strong className="text-insight">
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
        <div className="p-12 text-center border border-dashed border-rule space-y-4">
          <div className="w-14 h-14 border border-rule text-ink-muted mx-auto flex items-center justify-center">
            <Target className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-display text-base text-ink">Aún no has definido metas de ahorro</h3>
            <p className="text-xs text-ink-muted max-w-md mx-auto mt-1">
              Comienza estableciendo una meta como un Fondo de Emergencia, el Pago Inicial de una Casa o tus próximas Vacaciones.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 bg-ink text-paper hover:bg-ink/85 rounded-md text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Crear primera meta</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-display text-lg text-ink">Metas activas ({goals.length})</h3>
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
                  className="border border-rule transition hover:border-ink/30"
                >
                  {/* Top Bar of the Card */}
                  <div className="p-6 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div
                          className="w-12 h-12 text-white flex items-center justify-center shrink-0 mt-0.5"
                          style={{ backgroundColor: goal.color || '#10B981' }}
                        >
                          <CategoryIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-ink-muted">{goal.category}</span>
                            {calc.isCompleted ? (
                              <span className="text-xs text-gain flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Meta alcanzada
                              </span>
                            ) : (
                              <span className="text-xs text-ink-muted flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" /> {calc.monthsRemaining} meses restantes
                              </span>
                            )}
                          </div>

                          <h4 className="font-display text-lg text-ink mt-0.5">{goal.title}</h4>
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
                          className="px-3.5 py-2 text-xs font-semibold text-paper bg-ink hover:bg-ink/85 rounded-md transition flex items-center gap-1.5 cursor-pointer"
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
                          className="p-2 text-ink-muted hover:text-ink border border-rule hover:border-ink/40 rounded-md transition cursor-pointer"
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
                          className="p-2 text-ink-muted hover:text-loss border border-rule hover:border-loss/40 rounded-md transition cursor-pointer"
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
                          <span className="font-display text-xl text-ink">
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

                      <div className="w-full bg-rule h-1.5 overflow-hidden">
                        <div
                          className="h-full transition-all duration-700"
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
                  <div className="border-t border-rule px-6 py-3 flex items-center justify-between flex-wrap gap-2">
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
                    <div className="p-6 border-t border-rule space-y-6">
                      {/* Personalized Behavioral Advice Section */}
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-insight" />
                            <h5 className="text-xs text-ink-muted">
                              Consejos personalizados basados en tus patrones de gasto
                            </h5>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRequestAiAdvice(goal)}
                            disabled={loadingAdviceGoalId === goal.id}
                            className="px-3 py-1.5 border border-rule text-ink-muted hover:text-ink hover:border-ink/40 rounded-md text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                          >
                            <Sparkles className={`w-3.5 h-3.5 text-insight ${loadingAdviceGoalId === goal.id ? 'animate-spin' : ''}`} />
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
                                className="p-5 border border-rule space-y-2.5 text-xs"
                              >
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className="text-ink font-medium">{adv.focusCategory}</span>
                                  <span className="text-gain font-mono">
                                    +${adv.monthlySavingPotential.toLocaleString('es-MX')}/mes
                                  </span>
                                </div>

                                <p className="text-ink leading-relaxed">{adv.tip}</p>

                                <div className="flex items-center justify-between pt-2.5 border-t border-rule text-xs">
                                  <span className="text-insight">{adv.behavioralBias}</span>
                                  {adv.impactWeeksAccelerated && (
                                    <span className="text-ink-muted">
                                      Adelanta la meta {adv.impactWeeksAccelerated} semanas
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="col-span-2 p-5 border border-dashed border-rule text-center space-y-2.5">
                              <p className="text-xs text-ink-muted">
                                Genera consejos conductuales con IA diseñados específicamente para cruzar tus transacciones
                                y financiar esta meta sin fricción.
                              </p>
                              <button
                                type="button"
                                onClick={() => handleRequestAiAdvice(goal)}
                                className="px-4 py-2 bg-ink text-paper hover:bg-ink/85 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-insight" />
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
                            className="text-xs text-ink-muted hover:text-ink font-medium transition cursor-pointer"
                          >
                            + Agregar abono
                          </button>
                        </div>

                        {goal.contributions && goal.contributions.length > 0 ? (
                          <div className="border border-rule divide-y divide-rule">
                            {goal.contributions.slice(-5).reverse().map((contrib) => (
                              <div
                                key={contrib.id}
                                className="px-4 py-2.5 flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2.5">
                                  <Check className="w-3.5 h-3.5 text-gain shrink-0" />
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
                          <div className="p-3 border border-rule text-ink-muted text-xs text-center">
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

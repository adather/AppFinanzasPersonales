import React from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  HelpCircle,
  Cpu,
} from 'lucide-react';
import { FinancialAnalysisResult, CategoryStat, GeminiModelId, AVAILABLE_GEMINI_MODELS } from '../types';

interface ExecutiveAnalysisViewProps {
  analysis: FinancialAnalysisResult | null;
  categoryStats: CategoryStat[];
  totalSpent: number;
  totalBudget: number;
  isLoading: boolean;
  selectedModel?: GeminiModelId;
  onRefreshAnalysis: () => void;
  onOpenAdvisorChat?: (initialTopic?: string) => void;
  onOpenModelSelector?: () => void;
}

export const ExecutiveAnalysisView: React.FC<ExecutiveAnalysisViewProps> = ({
  analysis,
  categoryStats,
  totalSpent,
  totalBudget,
  isLoading,
  selectedModel = 'gemini-3.8-flash',
  onRefreshAnalysis,
  onOpenAdvisorChat,
  onOpenModelSelector,
}) => {
  const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const currentModelMeta = AVAILABLE_GEMINI_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_GEMINI_MODELS[0];

  return (
    <div className="space-y-8 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Top Banner / Control Panel */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-2xs transition-colors duration-200">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400">
              <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              Agente de Behavioral Economics & Finanzas
            </span>
            <button
              type="button"
              onClick={onOpenModelSelector}
              title="Haz clic para cambiar el modelo de IA"
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <Cpu className="w-3 h-3 text-slate-500 dark:text-slate-400" />
              <span>Motor: <strong>{currentModelMeta.name}</strong></span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal underline ml-0.5">Cambiar</span>
            </button>
            {analysis?.generatedAt && (
              <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 ml-1">
                <Calendar className="w-3 h-3" /> {analysis.generatedAt}
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Informe Estadístico & Conductual de Gastos
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Análisis de patrones cognitivos, desvíos estándar (&gt;2σ) y optimización de presupuesto
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onOpenAdvisorChat && (
            <button
              id="open-advisor-chat-from-report-btn"
              onClick={() => onOpenAdvisorChat('Explícame los hallazgos de este análisis')}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              Preguntar al Asesor
            </button>
          )}
          <button
            id="refresh-ai-analysis-btn"
            disabled={isLoading}
            onClick={onRefreshAnalysis}
            className="px-4 py-2 text-xs font-semibold text-white dark:text-slate-900 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-50 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Analizando con IA...' : 'Actualizar Análisis'}
          </button>
        </div>
      </div>

      {/* 1. Resumen Ejecutivo (3-4 puntos clave) */}
      <section id="resumen-ejecutivo-section" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide text-xs">
              1. Resumen Ejecutivo
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">3-4 puntos clave de diagnóstico</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {analysis?.resumenEjecutivo && analysis.resumenEjecutivo.length > 0 ? (
            analysis.resumenEjecutivo.map((point, index) => (
              <div
                key={index}
                className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800/80 shadow-2xs hover:border-emerald-200 dark:hover:border-emerald-900 transition-all duration-200 flex items-start gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {index + 1}
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{point}</p>
              </div>
            ))
          ) : (
            <div className="col-span-2 p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-slate-500 dark:text-slate-400 text-sm">
              Cargando resumen ejecutivo generado por el agente...
            </div>
          )}
        </div>
      </section>

      {/* 2. Tabla con Categorías: Total gastado, % del presupuesto, tendencia (↑↓) */}
      <section id="tabla-categorias-section" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide text-xs">
              2. Tabla por Categorías & Tendencias
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Total gastado vs Presupuesto asignado
          </span>
        </div>

        <div className="overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors duration-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Categoría</th>
                  <th className="py-3.5 px-4 text-right">Total Gastado</th>
                  <th className="py-3.5 px-4 text-center">Presupuesto</th>
                  <th className="py-3.5 px-4 text-center">% Presupuesto</th>
                  <th className="py-3.5 px-4 text-center">Tendencia</th>
                  <th className="py-3.5 px-4">Diagnóstico Conductual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {categoryStats.map((stat) => {
                  const aiCat = analysis?.tablaCategorias?.find(
                    (c) => c.categoria?.toLowerCase() === stat.category.toLowerCase()
                  );
                  const isOver = stat.budgetPercent > 100;
                  const isWarning = stat.budgetPercent > 85;

                  return (
                    <tr key={stat.category} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: stat.color }}
                        />
                        <span>{stat.category}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-800 dark:text-slate-200">
                        ${stat.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-500 dark:text-slate-400 text-xs font-mono">
                        ${stat.budget.toLocaleString('es-MX')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(stat.budgetPercent, 100)}%` }}
                            />
                          </div>
                          <span
                            className={`text-xs font-bold font-mono ${
                              isOver ? 'text-rose-600 dark:text-rose-400' : isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {stat.budgetPercent}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {stat.trend === '↑' ? (
                          <span className="inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400">
                            <TrendingUp className="w-3.5 h-3.5" /> ↑
                          </span>
                        ) : stat.trend === '↓' ? (
                          <span className="inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                            <TrendingDown className="w-3.5 h-3.5" /> ↓
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            <Minus className="w-3.5 h-3.5" /> =
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400 max-w-xs">
                        {aiCat?.comentarioConductual ||
                          (isOver
                            ? 'Superó el umbral presupuestario; requiere reevaluación de contabilidad mental.'
                            : stat.trend === '↓'
                            ? 'Buena contención de gasto respecto al periodo previo.'
                            : 'Gasto dentro del promedio estándar esperado.')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 3. Top 3 Anomalías Detectadas con Explicación (>2 Desviaciones Estándar) */}
      <section id="top-anomalias-section" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide text-xs">
              3. Top Anomalías Estadísticas Detectadas (&gt;2σ)
            </h3>
          </div>
          <span className="text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md">
            Z-Score &gt; 2.0 (Desviaciones Estándar)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {analysis?.topAnomalias && analysis.topAnomalias.length > 0 ? (
            analysis.topAnomalias.slice(0, 3).map((anomaly, idx) => (
              <div
                key={idx}
                className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-950/50 shadow-2xs space-y-3 hover:shadow-xs transition-colors duration-200"
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-md flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    +{anomaly.desviacionesEstandar || 2.5}σ Desv. Estándar
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">{anomaly.fecha}</span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">{anomaly.concepto}</h4>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{anomaly.categoria}</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    ${anomaly.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <span className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">Impacto conductual:</span>
                  {anomaly.explicacion}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-sm text-slate-500 dark:text-slate-400">
              No se han detectado anomalías superiores a 2 desviaciones estándar en este periodo.
            </div>
          )}
        </div>
      </section>

      {/* 4. 3-5 Recomendaciones Concretas de Ahorro (Behavioral Economics) */}
      <section id="recomendaciones-ahorro-section" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide text-xs">
              4. Recomendaciones Concretas de Ahorro (Behavioral Nudges)
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">Acciones prácticas sin juicios de valor</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analysis?.recomendacionesAhorro && analysis.recomendacionesAhorro.length > 0 ? (
            analysis.recomendacionesAhorro.map((rec, idx) => (
              <div
                key={idx}
                className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 hover:border-amber-300 dark:hover:border-amber-900/60 transition-colors duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                      <Lightbulb className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{rec.titulo}</h4>
                  </div>
                  <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                    {rec.sesgoAbordado}
                  </span>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {rec.accionConcreta}
                </p>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-slate-600 dark:text-slate-300 shrink-0">Contexto estadístico:</span>
                  <span>{rec.contextoEstadistico}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-sm text-slate-500 dark:text-slate-400">
              Generando recomendaciones de economía conductual...
            </div>
          )}
        </div>
      </section>

      {/* 5. Comparativa con Mes Anterior & Patrones Proactivos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comparativa con Mes Anterior */}
        <section id="comparativa-mes-anterior-section" className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide text-xs">
                5. Comparativa con Mes Anterior
              </h3>
            </div>
            {analysis?.comparativaMesAnterior && (
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1 ${
                  analysis.comparativaMesAnterior.cambioTotalPorcentual > 0
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {analysis.comparativaMesAnterior.cambioTotalPorcentual > 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                {analysis.comparativaMesAnterior.cambioTotalPorcentual > 0 ? '+' : ''}
                {analysis.comparativaMesAnterior.cambioTotalPorcentual}% vs mes previo
              </span>
            )}
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {analysis?.comparativaMesAnterior?.analisisComparativo ||
              'El comportamiento del mes en curso refleja variaciones influenciadas por compras extraordinarias y frecuencias en fin de semana.'}
          </p>

          {analysis?.comparativaMesAnterior?.areasDeMejora && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Oportunidades de ajuste intermensual:
              </span>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                {analysis.comparativaMesAnterior.areasDeMejora.map((area, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Patrones Proactivos Detectados */}
        <section id="patrones-proactivos-section" className="p-6 bg-slate-900 dark:bg-slate-900/60 text-white rounded-2xl shadow-xs space-y-4 border border-transparent dark:border-slate-800 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Patrones Proactivos Detectados
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Hábitos conductuales</span>
          </div>

          <div className="space-y-3">
            {analysis?.patronesProactivos && analysis.patronesProactivos.length > 0 ? (
              analysis.patronesProactivos.map((pat, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-800/80 dark:bg-slate-950/60 border border-slate-700/70 dark:border-slate-800/80 text-xs text-slate-200 dark:text-slate-300 leading-relaxed flex items-start gap-2.5"
                >
                  <span className="text-emerald-400 font-bold shrink-0 mt-0.5">✦</span>
                  <span>{pat}</span>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-xl bg-slate-800 dark:bg-slate-950/40 text-slate-400 dark:text-slate-500 text-xs text-center">
                Analizando patrones recurrentes como gasto en viernes y microgastos...
              </div>
            )}
          </div>

          <div className="pt-2 text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-800 dark:border-slate-800/80 flex items-center justify-between">
            <span>Metodología: Z-Score (&gt;2σ) + Behavioral Economics</span>
            <span className="text-emerald-400 font-medium">Gemini 3.8 Flash</span>
          </div>
        </section>
      </div>
    </div>
  );
};

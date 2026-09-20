import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  HelpCircle,
  Cpu,
  Printer,
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
  const currentModelMeta = AVAILABLE_GEMINI_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_GEMINI_MODELS[0];
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="space-y-6 text-ink transition-colors duration-200">
      {/* Control Panel */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5 text-xs text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-insight" />
              Behavioral economics & finanzas
            </span>
            <span className="text-rule">·</span>
            <button
              type="button"
              onClick={onOpenModelSelector}
              title="Haz clic para cambiar el modelo de IA"
              className="inline-flex items-center gap-1.5 hover:text-ink transition cursor-pointer"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>motor: <strong className="font-semibold text-ink">{currentModelMeta.name}</strong></span>
              <span className="underline">cambiar</span>
            </button>
            {analysis?.generatedAt && (
              <>
                <span className="text-rule">·</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> {analysis.generatedAt}
                </span>
              </>
            )}
          </div>
          <h2 className="font-bold text-2xl text-ink tracking-tight">
            Informe estadístico & conductual de gastos
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Análisis de patrones cognitivos, desvíos atípicos (Z robusto) y optimización de presupuesto
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <button
            id="export-report-btn"
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 text-xs font-medium text-ink-muted hover:text-ink bg-surface hover:bg-rule/60 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Exportar este informe como PDF (usa el diálogo de impresión del navegador)"
          >
            <Printer className="w-4 h-4" />
            Exportar informe
          </button>
          {onOpenAdvisorChat && (
            <button
              id="open-advisor-chat-from-report-btn"
              onClick={() => onOpenAdvisorChat('Explícame los hallazgos de este análisis')}
              className="px-3.5 py-2 text-xs font-medium text-ink-muted hover:text-ink bg-surface hover:bg-rule/60 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <HelpCircle className="w-4 h-4" />
              Preguntar al asesor
            </button>
          )}
          <button
            id="refresh-ai-analysis-btn"
            disabled={isLoading}
            onClick={onRefreshAnalysis}
            className="px-4 py-2 text-xs font-semibold text-white bg-accent hover:bg-accent/90 disabled:opacity-50 rounded-lg transition flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Analizando con IA...' : 'Actualizar análisis'}
          </button>
        </div>
      </div>

      {/* 1. Resumen Ejecutivo */}
      <section id="resumen-ejecutivo-section" className="bg-surface rounded-2xl p-5 sm:p-6 space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="font-bold text-base text-ink">Resumen ejecutivo</h3>
          <span className="text-xs text-ink-muted">3-4 puntos clave de diagnóstico</span>
        </div>

        {analysis?.resumenEjecutivo && analysis.resumenEjecutivo.length > 0 ? (
          <ol className="divide-y divide-rule">
            {analysis.resumenEjecutivo.map((point, index) => {
              const isLead = index === 0;
              return (
                <li
                  key={index}
                  className={`flex items-start gap-4 first:pt-1 ${isLead ? 'py-4' : 'py-3.5'}`}
                >
                  <span
                    className={`rounded-full font-bold flex items-center justify-center shrink-0 ${
                      isLead
                        ? 'w-7 h-7 bg-accent text-white text-sm mt-0.5'
                        : 'w-6 h-6 bg-accent-soft text-accent text-xs mt-1'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <p className={isLead ? 'text-base font-medium text-ink leading-relaxed' : 'text-sm text-ink-muted leading-relaxed'}>
                    {point}
                  </p>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="py-6 text-center text-ink-muted text-sm">
            Cargando resumen ejecutivo generado por el agente...
          </div>
        )}
      </section>

      {/* 2. Tabla con Categorías: Total gastado, % del presupuesto, tendencia (↑↓) */}
      <section id="tabla-categorias-section" className="bg-surface rounded-2xl p-5 sm:p-6 space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="font-bold text-base text-ink">Categorías & tendencias</h3>
          <span className="text-xs text-ink-muted">total gastado vs. presupuesto asignado</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-rule text-ink-muted text-xs">
                <th className="py-2.5 pr-4 font-medium">Categoría</th>
                <th className="py-2.5 px-4 text-right font-medium">Total gastado</th>
                <th className="py-2.5 px-4 text-right font-medium">Presupuesto</th>
                <th className="py-2.5 px-4 text-center font-medium">% presupuesto</th>
                <th className="py-2.5 px-4 text-center font-medium">Tendencia</th>
                <th className="py-2.5 pl-4 font-medium">Diagnóstico conductual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {categoryStats.map((stat) => {
                const aiCat = analysis?.tablaCategorias?.find(
                  (c) => c.categoria?.toLowerCase() === stat.category.toLowerCase()
                );
                const isOver = stat.budgetPercent > 100;
                const isWarning = stat.budgetPercent > 85;

                return (
                  <tr key={stat.category}>
                    <td className="py-3.5 pr-4 font-medium text-ink flex items-center gap-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: stat.color }}
                      />
                      <span>{stat.category}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-ink">
                      ${stat.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-ink-muted text-xs">
                      ${stat.budget.toLocaleString('es-MX')}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-rule overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isOver ? 'bg-loss' : isWarning ? 'bg-insight' : 'bg-gain'
                            }`}
                            style={{ width: `${Math.min(stat.budgetPercent, 100)}%` }}
                          />
                        </div>
                        <span
                          className={`text-xs font-mono ${
                            isOver ? 'text-loss' : isWarning ? 'text-insight' : 'text-ink-muted'
                          }`}
                        >
                          {stat.budgetPercent}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {stat.trend === '↑' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-loss/10 text-loss">
                          <TrendingUp className="w-3.5 h-3.5" /> sube
                        </span>
                      ) : stat.trend === '↓' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-gain/10 text-gain">
                          <TrendingDown className="w-3.5 h-3.5" /> baja
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-rule/60 text-ink-muted">
                          <Minus className="w-3.5 h-3.5" /> estable
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 pl-4 text-xs text-ink-muted max-w-xs">
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
      </section>

      {/* 3. Top 3 Anomalías Detectadas con Explicación (Z-Score robusto, mediana/MAD) */}
      <section id="top-anomalias-section" className="space-y-3">
        <div className="flex items-baseline justify-between flex-wrap gap-1.5">
          <h3 className="font-bold text-base text-ink">Anomalías estadísticas (Z robusto)</h3>
          <span className="text-xs font-medium text-loss px-2.5 py-1 rounded-full bg-loss/10">z-score robusto &gt; 3.5</span>
        </div>

        {analysis?.topAnomalias && analysis.topAnomalias.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analysis.topAnomalias.slice(0, 3).map((anomaly, idx) => (
              <div key={idx} className="bg-surface rounded-2xl p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-medium text-loss bg-loss/10 px-2 py-1 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Z {anomaly.desviacionesEstandar || 3.5}
                  </span>
                  <span className="text-xs text-ink-muted font-mono">{anomaly.fecha}</span>
                </div>

                <div>
                  <h4 className="font-medium text-ink text-sm line-clamp-1">{anomaly.concepto}</h4>
                  <div className="text-xs text-ink-muted">{anomaly.categoria}</div>
                  <div className="font-bold text-xl text-ink mt-1">
                    ${anomaly.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="pt-3 border-t border-rule text-xs text-ink-muted leading-relaxed">
                  <span className="font-medium text-ink block mb-1">Impacto conductual</span>
                  {anomaly.explicacion}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-surface rounded-2xl py-6 text-center text-sm text-ink-muted">
            No se han detectado anomalías superiores a 2 desviaciones estándar en este periodo.
          </div>
        )}
      </section>

      {/* 4. 3-5 Recomendaciones Concretas de Ahorro (Behavioral Economics) */}
      <section id="recomendaciones-ahorro-section" className="space-y-3">
        <div className="flex items-baseline justify-between flex-wrap gap-1.5">
          <h3 className="font-bold text-base text-ink">Recomendaciones de ahorro</h3>
          <span className="text-xs text-ink-muted">acciones prácticas sin juicios de valor</span>
        </div>

        {analysis?.recomendacionesAhorro && analysis.recomendacionesAhorro.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.recomendacionesAhorro.map((rec, idx) => (
              <div key={idx} className="bg-surface rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-insight/15 text-insight flex items-center justify-center shrink-0">
                      <Lightbulb className="w-4 h-4" />
                    </div>
                    <h4 className="font-medium text-ink text-sm">{rec.titulo}</h4>
                  </div>
                  <span className="text-[11px] text-insight shrink-0 bg-insight/10 px-2 py-0.5 rounded-full">{rec.sesgoAbordado}</span>
                </div>

                <p className="text-xs text-ink leading-relaxed">
                  {rec.accionConcreta}
                </p>

                <div className="pt-3 border-t border-rule flex items-start gap-2 text-xs text-ink-muted">
                  <span className="font-medium text-ink shrink-0">Contexto estadístico</span>
                  <span>{rec.contextoEstadistico}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-surface rounded-2xl py-6 text-center text-sm text-ink-muted">
            Generando recomendaciones de economía conductual...
          </div>
        )}
      </section>

      {/* 5. Comparativa con Mes Anterior & Patrones Proactivos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Comparativa con Mes Anterior */}
        <section id="comparativa-mes-anterior-section" className="bg-surface rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-bold text-base text-ink">Comparativa con mes anterior</h3>
            {analysis?.comparativaMesAnterior && (
              <span
                className={`text-xs font-medium flex items-center gap-1 px-2.5 py-1 rounded-full ${
                  analysis.comparativaMesAnterior.cambioTotalPorcentual > 0 ? 'bg-loss/10 text-loss' : 'bg-gain/10 text-gain'
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

          <p className="text-sm text-ink leading-relaxed">
            {analysis?.comparativaMesAnterior?.analisisComparativo ||
              'El comportamiento del mes en curso refleja variaciones influenciadas por compras extraordinarias y frecuencias en fin de semana.'}
          </p>

          {analysis?.comparativaMesAnterior?.areasDeMejora && (
            <div className="space-y-2 pt-3 border-t border-rule">
              <span className="text-xs text-ink-muted block">
                Oportunidades de ajuste intermensual
              </span>
              <ul className="space-y-1.5 text-xs text-ink">
                {analysis.comparativaMesAnterior.areasDeMejora.map((area, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-gain shrink-0 mt-0.5" />
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Patrones Proactivos Detectados — the one deliberate motion moment on
            this page: reveals itself when a fresh AI analysis lands, marking
            this panel as "the AI noticed something," not decoration. */}
        <motion.section
          key={analysis?.generatedAt || 'pending'}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          id="patrones-proactivos-section"
          className="rounded-2xl p-6 space-y-4 bg-accent text-white"
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Patrones proactivos detectados
            </h3>
            <span className="text-[11px] opacity-70">hábitos conductuales</span>
          </div>

          <div className="divide-y divide-white/15">
            {analysis?.patronesProactivos && analysis.patronesProactivos.length > 0 ? (
              analysis.patronesProactivos.map((pat, idx) => (
                <div key={idx} className="py-3 text-xs opacity-95 leading-relaxed flex items-start gap-2.5 first:pt-0">
                  <span className="shrink-0 mt-0.5">✦</span>
                  <span>{pat}</span>
                </div>
              ))
            ) : (
              <div className="py-4 opacity-70 text-xs text-center">
                Analizando patrones recurrentes como gasto en viernes y microgastos...
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-white/15 text-[11px] opacity-70 flex items-center justify-between">
            <span>metodología: Z-Score robusto (mediana/MAD) + behavioral economics</span>
            <span className="opacity-100 font-medium">{currentModelMeta.shortName}</span>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

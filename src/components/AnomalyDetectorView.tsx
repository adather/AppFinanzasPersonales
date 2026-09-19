import React, { useState } from 'react';
import {
  AlertTriangle,
  Sliders,
  Calculator,
  Info,
  CheckCircle,
  Tag,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { AnomalyItem, CategoryName, CategoryStat, Transaction } from '../types';

interface AnomalyDetectorViewProps {
  anomalies: AnomalyItem[];
  allTransactions: Transaction[];
  categoryStats: CategoryStat[];
  currentThreshold: number;
  onThresholdChange: (threshold: number) => void;
}

export const AnomalyDetectorView: React.FC<AnomalyDetectorViewProps> = ({
  anomalies,
  allTransactions,
  categoryStats,
  currentThreshold,
  onThresholdChange,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredAnomalies = selectedCategory === 'all'
    ? anomalies
    : anomalies.filter((a) => a.transaction.category === selectedCategory);

  return (
    <div className="space-y-6 text-ink transition-colors duration-200">
      {/* Header + threshold control */}
      <div className="bg-surface rounded-2xl shadow-sm p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="flex items-start gap-3.5 max-w-2xl">
            <div className="w-11 h-11 rounded-xl bg-loss text-white flex items-center justify-center shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-2xl text-ink tracking-tight">
                Detección estadística de anomalías de gasto
              </h2>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                Identifica gastos atípicos que se alejan significativamente del comportamiento habitual
                utilizando el puntaje Z (Z-Score) y la regla empírica de{' '}
                <strong className="text-ink font-medium">&gt; {currentThreshold.toFixed(1)} desviaciones estándar (σ)</strong>.
              </p>
            </div>
          </div>

          {/* Threshold adjustment control */}
          <div className="shrink-0">
            <div className="flex items-center justify-between gap-4 mb-2">
              <span className="text-xs text-ink-muted flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                Sensibilidad de anomalía
              </span>
              <span className="text-xs font-mono text-loss">
                &gt; {currentThreshold.toFixed(1)}σ
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[1.5, 2.0, 2.5, 3.0].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => onThresholdChange(val)}
                  className={`px-3 py-1.5 text-xs rounded-full font-medium transition cursor-pointer ${
                    currentThreshold === val
                      ? 'bg-accent text-white'
                      : 'bg-rule/50 text-ink-muted hover:text-ink'
                  }`}
                >
                  {val.toFixed(1)}σ {val === 2.0 ? '(estándar)' : ''}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Statistical formula note */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-surface rounded-2xl shadow-sm p-4">
          <span className="text-ink-muted block mb-1.5">Fórmula Z-Score</span>
          <span className="text-ink font-mono text-xs block bg-accent-soft text-accent rounded-lg px-2 py-1.5 my-1.5">
            Z = (Gasto - μ) / σ
          </span>
          <p className="text-ink-muted leading-relaxed">
            Donde <strong className="text-ink font-medium">μ</strong> es el promedio del gasto de la categoría y{' '}
            <strong className="text-ink font-medium">σ</strong> es la desviación estándar muestral.
          </p>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm p-4">
          <span className="text-ink-muted block mb-1.5">Criterio estadístico</span>
          <p className="text-ink-muted leading-relaxed">
            En una distribución normal, solo el <strong className="text-ink font-medium">~2.27%</strong> de las
            transacciones superan las +2 desviaciones estándar de manera ordinaria.
          </p>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm p-4">
          <span className="text-ink-muted block mb-1.5">Perspectiva conductual</span>
          <p className="text-ink-muted leading-relaxed">
            Distingue entre imprevistos inevitables (reparaciones/salud) y sesgo del presente (compras de
            gratificación impulsiva).
          </p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <span className="text-xs text-ink-muted shrink-0 pr-1.5">Filtrar por categoría</span>
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition shrink-0 cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-accent text-white'
              : 'bg-surface text-ink-muted hover:text-ink shadow-sm'
          }`}
        >
          Todas ({anomalies.length})
        </button>
        {categoryStats.map((c) => {
          const count = anomalies.filter((a) => a.transaction.category === c.category).length;
          const isActive = selectedCategory === c.category;
          return (
            <button
              key={c.category}
              type="button"
              onClick={() => setSelectedCategory(c.category)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                isActive ? 'bg-accent text-white' : 'bg-surface text-ink-muted hover:text-ink shadow-sm'
              }`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
              <span>{c.category}</span>
              {count > 0 && (
                <span className={`text-[11px] font-mono ${isActive ? 'text-white/80' : 'text-ink-muted'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Anomalies List */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between flex-wrap gap-1.5">
          <h3 className="font-bold text-lg text-ink">
            Transacciones que superan el umbral estadístico ({filteredAnomalies.length})
          </h3>
          <span className="text-xs text-ink-muted">ordenadas por magnitud de desvío Z</span>
        </div>

        {filteredAnomalies.length === 0 ? (
          <div className="bg-surface rounded-2xl shadow-sm py-10 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-gain/10 text-gain flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <p className="text-sm text-ink">No se encontraron anomalías con este filtro</p>
            <p className="text-xs text-ink-muted">
              Todas las transacciones se encuentran dentro de las {currentThreshold} desviaciones estándar esperadas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAnomalies.map((anom) => (
              <div key={anom.id} className="bg-surface rounded-2xl shadow-sm p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-medium text-loss bg-loss/10 px-2 py-1 rounded-full flex items-center gap-1 font-mono">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Z = +{anom.zScore}σ
                  </span>
                  <span className="text-xs text-ink-muted font-mono">{anom.transaction.date}</span>
                </div>

                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <h4 className="font-medium text-ink text-sm">{anom.transaction.concept}</h4>
                    <span className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
                      <Tag className="w-3 h-3" /> {anom.transaction.merchant} <span className="text-rule">·</span> {anom.transaction.category}
                    </span>
                  </div>
                  <div className="font-bold text-xl text-loss shrink-0">
                    ${anom.transaction.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Mathematical context */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs py-3 border-y border-rule">
                  <div>
                    <span className="text-ink-muted block font-mono">Media (μ)</span>
                    <span className="text-ink font-mono">${anom.categoryMean}</span>
                  </div>
                  <div>
                    <span className="text-ink-muted block font-mono">Desv. est (σ)</span>
                    <span className="text-ink font-mono">±${anom.categoryStdDev}</span>
                  </div>
                  <div>
                    <span className="text-ink-muted block font-mono">Límite ({currentThreshold}σ)</span>
                    <span className="text-loss font-mono">${anom.threshold}</span>
                  </div>
                </div>

                <p className="text-xs text-ink-muted leading-relaxed italic">
                  "{anom.explanation}"
                </p>

                {anom.transaction.note && (
                  <p className="text-xs text-ink-muted">
                    <span className="text-ink-muted">Nota del usuario:</span> {anom.transaction.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Category Parameters Reference Table */}
      <section className="bg-surface rounded-2xl shadow-sm p-5 sm:p-6 space-y-3">
        <div className="flex items-baseline justify-between flex-wrap gap-1.5">
          <h3 className="font-bold text-lg text-ink">Parámetros estadísticos por categoría</h3>
          <span className="text-xs text-ink-muted">media y desviación estándar muestral</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-rule text-ink-muted text-xs">
                <th className="py-2.5 pr-4 font-medium">Categoría</th>
                <th className="py-2.5 px-4 text-right font-medium">Transacciones</th>
                <th className="py-2.5 px-4 text-right font-medium">Total acumulado</th>
                <th className="py-2.5 px-4 text-right font-medium">Media (μ)</th>
                <th className="py-2.5 px-4 text-right font-medium">Desv. estándar (σ)</th>
                <th className="py-2.5 pl-4 text-right font-medium">Umbral de alerta (μ + 2σ)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {categoryStats.map((stat) => {
                const threshold = stat.mean + 2 * stat.stdDev;
                return (
                  <tr key={stat.category}>
                    <td className="py-3 pr-4 font-medium text-ink flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stat.color }} />
                      <span>{stat.category}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-ink-muted">{stat.count}</td>
                    <td className="py-3 px-4 text-right font-mono text-ink">
                      ${stat.total.toLocaleString('es-MX')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-ink-muted">
                      ${stat.mean.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-ink-muted">
                      ±${stat.stdDev.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 pl-4 text-right font-mono text-loss">
                      ${threshold.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

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
    <div className="space-y-10 text-ink transition-colors duration-200">
      {/* Header + threshold control */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 pb-5 border-b border-rule">
        <div className="flex items-start gap-3.5 max-w-2xl">
          <div className="w-10 h-10 rounded-md bg-loss/10 text-loss flex items-center justify-center shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-2xl text-ink tracking-tight">
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
          <div className="flex items-center gap-2">
            {[1.5, 2.0, 2.5, 3.0].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => onThresholdChange(val)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition cursor-pointer border ${
                  currentThreshold === val
                    ? 'bg-ink text-paper border-ink'
                    : 'border-rule text-ink-muted hover:text-ink hover:border-ink/40'
                }`}
              >
                {val.toFixed(1)}σ {val === 2.0 ? '(estándar)' : ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Statistical formula note */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-4 border border-rule">
          <span className="text-ink-muted block mb-1.5">Fórmula Z-Score</span>
          <span className="text-ink font-mono text-xs block border border-rule px-2 py-1.5 my-1.5">
            Z = (Gasto - μ) / σ
          </span>
          <p className="text-ink-muted leading-relaxed">
            Donde <strong className="text-ink font-medium">μ</strong> es el promedio del gasto de la categoría y{' '}
            <strong className="text-ink font-medium">σ</strong> es la desviación estándar muestral.
          </p>
        </div>

        <div className="p-4 border border-rule">
          <span className="text-ink-muted block mb-1.5">Criterio estadístico</span>
          <p className="text-ink-muted leading-relaxed">
            En una distribución normal, solo el <strong className="text-ink font-medium">~2.27%</strong> de las
            transacciones superan las +2 desviaciones estándar de manera ordinaria.
          </p>
        </div>

        <div className="p-4 border border-rule">
          <span className="text-ink-muted block mb-1.5">Perspectiva conductual</span>
          <p className="text-ink-muted leading-relaxed">
            Distingue entre imprevistos inevitables (reparaciones/salud) y sesgo del presente (compras de
            gratificación impulsiva).
          </p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-rule">
        <span className="text-xs text-ink-muted shrink-0 pr-3">Filtrar por categoría</span>
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-2 text-xs font-medium transition shrink-0 cursor-pointer border-b-2 -mb-px ${
            selectedCategory === 'all'
              ? 'border-ink text-ink'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          Todas ({anomalies.length})
        </button>
        {categoryStats.map((c) => {
          const count = anomalies.filter((a) => a.transaction.category === c.category).length;
          return (
            <button
              key={c.category}
              type="button"
              onClick={() => setSelectedCategory(c.category)}
              className={`px-3 py-2 text-xs font-medium transition shrink-0 flex items-center gap-1.5 cursor-pointer border-b-2 -mb-px ${
                selectedCategory === c.category
                  ? 'border-ink text-ink'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
              <span>{c.category}</span>
              {count > 0 && (
                <span className={`text-[11px] font-mono ${selectedCategory === c.category ? 'text-loss' : 'text-ink-muted'}`}>
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
          <h3 className="font-display text-lg text-ink">
            Transacciones que superan el umbral estadístico ({filteredAnomalies.length})
          </h3>
          <span className="text-xs text-ink-muted">ordenadas por magnitud de desvío Z</span>
        </div>

        {filteredAnomalies.length === 0 ? (
          <div className="py-10 border-y border-rule text-center space-y-2">
            <CheckCircle className="w-8 h-8 text-gain mx-auto" />
            <p className="text-sm text-ink">No se encontraron anomalías con este filtro</p>
            <p className="text-xs text-ink-muted">
              Todas las transacciones se encuentran dentro de las {currentThreshold} desviaciones estándar esperadas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAnomalies.map((anom) => (
              <div key={anom.id} className="p-5 border border-rule space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-medium text-loss flex items-center gap-1 font-mono">
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
                  <div className="font-display text-xl text-loss shrink-0">
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
      <section className="space-y-3">
        <div className="flex items-baseline justify-between flex-wrap gap-1.5">
          <h3 className="font-display text-lg text-ink">Parámetros estadísticos por categoría</h3>
          <span className="text-xs text-ink-muted">media y desviación estándar muestral</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-rule text-ink-muted text-xs">
                <th className="py-2.5 pr-4 font-normal">Categoría</th>
                <th className="py-2.5 px-4 text-right font-normal">Transacciones</th>
                <th className="py-2.5 px-4 text-right font-normal">Total acumulado</th>
                <th className="py-2.5 px-4 text-right font-normal">Media (μ)</th>
                <th className="py-2.5 px-4 text-right font-normal">Desv. estándar (σ)</th>
                <th className="py-2.5 pl-4 text-right font-normal">Umbral de alerta (μ + 2σ)</th>
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

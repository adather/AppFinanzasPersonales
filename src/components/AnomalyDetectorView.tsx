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
    <div className="space-y-8 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Header Explainer Card */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 transition-colors duration-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Detección Estadística de Anomalías de Gasto
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl mt-0.5">
                Identifica gastos atípicos que se alejan significativamente del comportamiento habitual
                utilizando el puntaje Z (Z-Score) y la regla empírica de <strong>&gt; {currentThreshold.toFixed(1)} desviaciones estándar (σ)</strong>.
              </p>
            </div>
          </div>

          {/* Threshold adjustment control */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shrink-0">
            <div className="flex items-center justify-between gap-4 mb-1.5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                Sensibilidad de Anomalía:
              </span>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 font-mono bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded">
                &gt; {currentThreshold.toFixed(1)}σ
              </span>
            </div>
            <div className="flex items-center gap-2">
              {[1.5, 2.0, 2.5, 3.0].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => onThresholdChange(val)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition cursor-pointer ${
                    currentThreshold === val
                      ? 'bg-rose-600 text-white font-bold shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {val.toFixed(1)}σ {val === 2.0 ? '(Estándar)' : ''}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Statistical formula note */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800/80">
            <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5 font-mono">Fórmula Z-Score:</span>
            <span className="text-slate-600 dark:text-slate-300 font-mono text-[11px] block bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-800 my-1">
              Z = (Gasto - μ) / σ
            </span>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              Donde <strong>μ</strong> es el promedio del gasto de la categoría y <strong>σ</strong> es la desviación estándar muestral.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800/80">
            <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Criterio Estadístico:</span>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
              En una distribución normal, solo el <strong>~2.27%</strong> de las transacciones superan las +2 desviaciones estándar de manera ordinaria.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800/80">
            <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Perspectiva Conductual:</span>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
              Distingue entre imprevistos inevitables (reparaciones/salud) y sesgo del presente (compras de gratificación impulsiva).
            </p>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">Filtrar por categoría:</span>
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition shrink-0 cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
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
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                selectedCategory === c.category
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
              <span>{c.category}</span>
              {count > 0 && (
                <span className="bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Anomalies List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide flex items-center justify-between">
          <span>Transacciones que Superan el Umbral Estadístico ({filteredAnomalies.length})</span>
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Ordenadas por magnitud de desvío Z</span>
        </h3>

        {filteredAnomalies.length === 0 ? (
          <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-2 transition-colors">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="font-semibold text-slate-800 dark:text-white">No se encontraron anomalías con este filtro</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Todas las transacciones se encuentran dentro de las {currentThreshold} desviaciones estándar esperadas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAnomalies.map((anom) => (
              <div
                key={anom.id}
                className="p-5 bg-white dark:bg-slate-900 rounded-2xl border-2 border-rose-100 dark:border-rose-950/40 shadow-2xs hover:border-rose-300 dark:hover:border-rose-800 transition-colors duration-200 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md font-mono">
                      Z = +{anom.zScore}σ
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">{anom.transaction.date}</span>
                </div>

                <div className="flex items-baseline justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-base">{anom.transaction.concept}</h4>
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <Tag className="w-3 h-3" /> {anom.transaction.merchant} • {anom.transaction.category}
                    </span>
                  </div>
                  <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
                    ${anom.transaction.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Mathematical context table */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-mono">Media (μ)</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200 font-mono">${anom.categoryMean}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-mono">Desv. Est (σ)</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200 font-mono">±${anom.categoryStdDev}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-mono">Límite ({currentThreshold}σ)</span>
                    <span className="font-bold text-rose-700 dark:text-rose-400 font-mono">${anom.threshold}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic bg-rose-50/50 dark:bg-rose-950/20 p-2.5 rounded-lg border border-rose-100 dark:border-rose-900/40">
                  "{anom.explanation}"
                </p>

                {anom.transaction.note && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    <span className="font-medium text-slate-500 dark:text-slate-400">Nota del usuario:</span> {anom.transaction.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category Parameters Reference Table */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 transition-colors">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
          Parámetros Estadísticos por Categoría (Media y Desviación Estándar Muestral)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase font-semibold">
                <th className="py-2 px-3">Categoría</th>
                <th className="py-2 px-3 text-right">Transacciones</th>
                <th className="py-2 px-3 text-right">Total Acumulado</th>
                <th className="py-2 px-3 text-right">Media por Transacción (μ)</th>
                <th className="py-2 px-3 text-right">Desviación Estándar (σ)</th>
                <th className="py-2 px-3 text-right">Umbral de Alerta (μ + 2σ)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {categoryStats.map((stat) => {
                const threshold = stat.mean + 2 * stat.stdDev;
                return (
                  <tr key={stat.category} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stat.color }} />
                      <span>{stat.category}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">{stat.count}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                      ${stat.total.toLocaleString('es-MX')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      ${stat.mean.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500 dark:text-slate-400">
                      ±${stat.stdDev.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      ${threshold.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

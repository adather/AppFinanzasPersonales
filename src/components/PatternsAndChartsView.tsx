import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
  ReferenceLine,
  Line,
  ComposedChart,
} from 'recharts';
import {
  Sparkles,
  AlertTriangle,
  Coffee,
  Calendar,
  DollarSign,
  TrendingUp,
  Filter,
  Layers,
  ArrowRight,
  Info,
  Clock,
  PieChart as PieChartIcon,
  BarChart3,
  Sliders,
} from 'lucide-react';
import { CategoryStat, Transaction, AnomalyItem, CategoryName } from '../types';
import {
  analyzeBehavioralPatterns,
  buildTimelineData,
  buildSpendingRanges,
  detectAnomalies,
  CATEGORY_COLORS,
  TimelinePoint,
} from '../utils/statistics';

interface PatternsAndChartsViewProps {
  transactions: Transaction[];
  categoryStats: CategoryStat[];
  anomalies?: AnomalyItem[];
  onSelectCategory?: (category: CategoryName) => void;
}

export const PatternsAndChartsView: React.FC<PatternsAndChartsViewProps> = ({
  transactions,
  categoryStats,
  anomalies,
  onSelectCategory,
}) => {
  // Timeline interactive filters
  const [timelineMode, setTimelineMode] = useState<'daily' | 'cumulative'>('daily');
  const [timeRange, setTimeRange] = useState<'all' | '14d' | '7d'>('all');
  const [highlightAnomaliesOnly, setHighlightAnomaliesOnly] = useState(false);
  const [selectedTimelinePoint, setSelectedTimelinePoint] = useState<TimelinePoint | null>(null);

  // Category donut selection
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);

  // Bar chart mode
  const [barMetric, setBarMetric] = useState<'total' | 'vsBudget'>('vsBudget');

  // Compute anomalies if not provided
  const computedAnomalies = useMemo(() => {
    return anomalies || detectAnomalies(transactions, 2.0);
  }, [transactions, anomalies]);

  const behavioral = useMemo(() => {
    return analyzeBehavioralPatterns(transactions);
  }, [transactions]);

  // Timeline dataset
  const fullTimeline = useMemo(() => {
    return buildTimelineData(transactions, computedAnomalies);
  }, [transactions, computedAnomalies]);

  const filteredTimeline = useMemo(() => {
    let list = fullTimeline;
    if (timeRange === '14d') {
      list = list.slice(-14);
    } else if (timeRange === '7d') {
      list = list.slice(-7);
    }
    return list;
  }, [fullTimeline, timeRange]);

  // Spending tiers
  const spendingTiers = useMemo(() => {
    return buildSpendingRanges(transactions);
  }, [transactions]);

  // Prepare data for Category Budget vs Spent chart
  const categoryBarData = useMemo(() => {
    return categoryStats.map((c) => ({
      name: c.category.split('&')[0].trim(),
      fullName: c.category,
      Real: c.total,
      Presupuesto: c.budget,
      Diferencia: c.total - c.budget,
      overBudget: c.total > c.budget,
      color: c.color,
    }));
  }, [categoryStats]);

  // Prepare data for Category Breakdown Pie Chart
  const pieData = useMemo(() => {
    return categoryStats
      .filter((c) => c.total > 0)
      .map((c) => ({
        name: c.category,
        value: c.total,
        color: c.color,
        count: c.count,
        budget: c.budget,
        percent: c.budgetPercent,
      }));
  }, [categoryStats]);

  const selectedCategoryData = useMemo(() => {
    if (!selectedCategoryName) return null;
    return categoryStats.find((c) => c.category === selectedCategoryName) || null;
  }, [selectedCategoryName, categoryStats]);

  const totalSpent = useMemo(() => {
    return transactions.reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // Custom dot for the timeline to highlight statistical anomalies (>2σ)
  const renderAnomalyDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload || !payload.hasAnomaly) {
      if (highlightAnomaliesOnly) return null;
      return <circle cx={cx} cy={cy} r={3} fill="#3B82F6" stroke="#FFFFFF" strokeWidth={1.5} />;
    }

    return (
      <g key={`dot-${payload.date}`} className="cursor-pointer" onClick={() => setSelectedTimelinePoint(payload)}>
        <circle cx={cx} cy={cy} r={9} fill="#EF4444" fillOpacity={0.25} className="animate-ping" />
        <circle cx={cx} cy={cy} r={6} fill="#EF4444" stroke="#FFFFFF" strokeWidth={2} />
        <circle cx={cx} cy={cy} r={2} fill="#FFFFFF" />
      </g>
    );
  };

  return (
    <div className="space-y-8 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Top Behavioral Insights Ribbon */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-2xs space-y-4 transition-colors duration-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Patrón Conductual Detectado
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">Efecto Viernes & Fin de Semana</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Pico de Gasto Social y Recompensa Inmediata (+{behavioral.fridaySpikePct}% los Viernes)
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-3xl leading-relaxed">
                Tus consumos en restaurantes, cafeterías y ocio aumentan sistemáticamente al final de la semana
                laboral. El sesgo de recompensa inmediata ('trabajé duro toda la semana') concentra el{' '}
                <strong>{behavioral.weekendPct}%</strong> de tu presupuesto total en fines de semana.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-center min-w-[120px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block font-mono">
                Pico Viernes
              </span>
              <span className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono">
                +{behavioral.fridaySpikePct}%
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block">vs. días laborales</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-center min-w-[120px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block font-mono">
                Anomalías &gt;2σ
              </span>
              <span className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono">
                {computedAnomalies.length}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block">en la serie temporal</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: INTERACTIVE TIMELINE / TIME SERIES */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-5 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Línea de Tiempo Interactiva: Evolución de Gastos y Anomalías
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Haz clic en cualquier punto o anomalía para inspeccionar el desglose de compras de esa fecha.
            </p>
          </div>

          {/* Interactive Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Daily vs Cumulative toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTimelineMode('daily')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  timelineMode === 'daily'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Gasto Diario
              </button>
              <button
                type="button"
                onClick={() => setTimelineMode('cumulative')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  timelineMode === 'cumulative'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Acumulado
              </button>
            </div>

            {/* Time range selector */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800">
              {(['all', '14d', '7d'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTimeRange(r)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition cursor-pointer ${
                    timeRange === r
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {r === 'all' ? 'Todo' : r === '14d' ? '14 días' : '7 días'}
                </button>
              ))}
            </div>

            {/* Toggle Anomalies */}
            <button
              type="button"
              onClick={() => setHighlightAnomaliesOnly(!highlightAnomaliesOnly)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border cursor-pointer ${
                highlightAnomaliesOnly
                  ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              Solo Anomalías &gt;2σ
            </button>
          </div>
        </div>

        {/* Anomaly Legend Notice */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-2 pt-1 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500 border-2 border-white ring-2 ring-rose-200" />
              <strong className="text-slate-700 dark:text-slate-300">Puntos Rojos:</strong> Anomalía estadística detectada (&gt;2σ)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-blue-500" />
              <span>Gasto del día</span>
            </span>
            {timelineMode === 'daily' && (
              <span className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                <span className="w-3 h-0.5 bg-slate-400 border-dashed" />
                <span>Media móvil (3d)</span>
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            {filteredTimeline.length} días graficados
          </span>
        </div>

        {/* Timeline Chart Container */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={filteredTimeline}
              margin={{ top: 15, right: 15, left: -10, bottom: 0 }}
              onClick={(state: any) => {
                if (state && state.activePayload && state.activePayload[0]) {
                  setSelectedTimelinePoint(state.activePayload[0].payload as TimelinePoint);
                }
              }}
            >
              <defs>
                <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis
                dataKey="displayDate"
                tickLine={false}
                tick={{ fontSize: 11, fill: '#64748B' }}
              />
              <YAxis
                tickLine={false}
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload as TimelinePoint;
                  return (
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xl text-xs space-y-2 max-w-xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <span className="font-bold text-slate-800 font-mono">{data.date}</span>
                        <span className="text-slate-400 font-mono">{data.count} compra(s)</span>
                      </div>
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="text-slate-500">Total del día:</span>
                        <span className="font-black text-slate-900 font-mono text-sm">
                          ${data.dailyTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      {timelineMode === 'cumulative' && (
                        <div className="flex items-baseline justify-between gap-4 text-emerald-700 font-medium">
                          <span>Acumulado mes:</span>
                          <span className="font-mono font-bold">
                            ${data.cumulativeTotal.toLocaleString('es-MX')}
                          </span>
                        </div>
                      )}
                      {data.hasAnomaly && (
                        <div className="p-2 bg-rose-50 rounded-lg border border-rose-100 space-y-1 mt-1">
                          <div className="flex items-center gap-1 font-bold text-rose-700 text-[11px]">
                            <AlertTriangle className="w-3 h-3" />
                            Anomalía ({data.anomalyZScore ? `+${data.anomalyZScore}σ` : '>2σ'})
                          </div>
                          <div className="text-slate-700 font-medium truncate">
                            {data.anomalyConcept}
                          </div>
                          <div className="font-mono font-bold text-rose-600">
                            ${data.anomalyAmount?.toLocaleString('es-MX')}
                          </div>
                        </div>
                      )}
                      <p className="text-[10px] text-slate-400 italic text-center pt-1">
                        Haz clic para ver las compras de esta fecha
                      </p>
                    </div>
                  );
                }}
              />
              {timelineMode === 'daily' ? (
                <>
                  <Area
                    type="monotone"
                    dataKey="dailyTotal"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorDaily)"
                  />
                  <Line
                    type="monotone"
                    dataKey="rollingAvg"
                    stroke="#94A3B8"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="dailyTotal"
                    stroke="transparent"
                    dot={renderAnomalyDot}
                    activeDot={{ r: 6, fill: '#1E293B' }}
                  />
                </>
              ) : (
                <Area
                  type="monotone"
                  dataKey="cumulativeTotal"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorCumulative)"
                  dot={renderAnomalyDot}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Selected Date Detail Drawer / Card */}
        {selectedTimelinePoint && (
          <div className="p-4 bg-slate-50/80 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  Detalle del {selectedTimelinePoint.date} ({selectedTimelinePoint.transactions.length} transacciones)
                </h4>
                {selectedTimelinePoint.hasAnomaly && (
                  <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Anomalía detectada
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedTimelinePoint(null)}
                className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cerrar detalle
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {selectedTimelinePoint.transactions.map((tx) => (
                <div
                  key={tx.id}
                  className={`p-3 bg-white dark:bg-slate-900 rounded-xl border text-xs space-y-1 shadow-2xs ${
                    tx.isAnomaly ? 'border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-200 dark:ring-rose-950/40 bg-rose-50/30 dark:bg-rose-950/10' : 'border-slate-200 dark:border-slate-800/80'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate pr-2">{tx.concept}</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white shrink-0">
                      ${tx.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-[11px]">
                    <span>{tx.merchant}</span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                      style={{
                        backgroundColor: `${CATEGORY_COLORS[tx.category]}15`,
                        color: CATEGORY_COLORS[tx.category],
                      }}
                    >
                      {tx.category}
                    </span>
                  </div>
                  {tx.isAnomaly && (
                    <div className="text-[10px] font-bold text-rose-600 pt-0.5 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Desvío &gt; 2σ (Z-Score alto)
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: INTERACTIVE CATEGORY DONUT & BUDGET COMPARISON */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Pie / Donut Chart */}
        <div className="lg:col-span-5 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                  Composición por Categoría
                </h3>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500">Haz clic para filtrar</span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Distribución porcentual del gasto total (${totalSpent.toLocaleString('es-MX')})
            </p>
          </div>

          <div className="h-64 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={95}
                  paddingAngle={2.5}
                  dataKey="value"
                  onClick={(entry) => {
                    setSelectedCategoryName(
                      selectedCategoryName === entry.name ? null : entry.name
                    );
                  }}
                  className="cursor-pointer"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`pie-cell-${index}`}
                      fill={entry.color}
                      stroke={selectedCategoryName === entry.name ? '#0F172A' : '#1e293b'}
                      strokeWidth={selectedCategoryName === entry.name ? 3 : 1}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [
                    `$${Number(val).toLocaleString('es-MX')}`,
                    'Gasto',
                  ]}
                  contentStyle={{
                    borderRadius: '12px',
                    backgroundColor: '#1e293b',
                    color: '#ffffff',
                    border: '1px solid #334155',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Centered Donut Summary Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                {selectedCategoryData ? 'Categoría' : 'Gasto Total'}
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                ${selectedCategoryData
                  ? selectedCategoryData.total.toLocaleString('es-MX')
                  : totalSpent.toLocaleString('es-MX')}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[130px]">
                {selectedCategoryData ? selectedCategoryData.category : 'Todas'}
              </span>
            </div>
          </div>

          {/* Selected Category Dynamic Info Card */}
          {selectedCategoryData ? (
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: selectedCategoryData.color }}
                  />
                  {selectedCategoryData.category}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryName(null)}
                  className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline cursor-pointer"
                >
                  Ver todas
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-mono uppercase">Presupuesto</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                    ${selectedCategoryData.budget.toLocaleString('es-MX')}
                  </span>
                </div>
                <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-mono uppercase">% Consumido</span>
                  <span
                    className={`font-bold font-mono ${
                      selectedCategoryData.budgetPercent > 100 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'
                    }`}
                  >
                    {selectedCategoryData.budgetPercent}%
                  </span>
                </div>
                <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-mono uppercase">Media (μ)</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                    ${selectedCategoryData.mean.toLocaleString('es-MX')}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 dark:text-slate-500 text-center italic py-2">
              Haz clic en cualquier segmento del gráfico para ver detalles y parámetros estadísticos.
            </div>
          )}
        </div>

        {/* Real vs Budget Grouped Bar Chart */}
        <div className="lg:col-span-7 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-900 dark:text-white" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                  Gasto Real vs. Presupuesto por Partida
                </h3>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">Identificación visual de sobregiros</p>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-semibold">
                <span className="w-3 h-3 rounded-xs bg-slate-900 dark:bg-slate-100" /> Gasto Real
              </span>
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <span className="w-3 h-3 rounded-xs bg-slate-300 dark:bg-slate-700" /> Presupuesto
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryBarData}
                margin={{ top: 10, right: 10, left: -20, bottom: 45 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  angle={-35}
                  textAnchor="end"
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                />
                <YAxis
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  tickFormatter={(v) => `$${v >= 1000 ? `${v / 1000}k` : v}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl text-xs space-y-1.5 text-slate-800 dark:text-slate-200">
                        <span className="font-bold text-slate-900 dark:text-white block">{d.fullName}</span>
                        <div className="flex justify-between gap-4 text-slate-600 dark:text-slate-400">
                          <span>Gasto Real:</span>
                          <span className="font-bold font-mono text-slate-900 dark:text-white">
                            ${Number(d.Real).toLocaleString('es-MX')}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 text-slate-500 dark:text-slate-400">
                          <span>Presupuesto:</span>
                          <span className="font-mono">${Number(d.Presupuesto).toLocaleString('es-MX')}</span>
                        </div>
                        <div
                          className={`flex justify-between gap-4 font-bold pt-1 border-t border-slate-100 dark:border-slate-800/80 ${
                            d.overBudget ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          <span>{d.overBudget ? 'Sobregiro:' : 'Margen a favor:'}</span>
                          <span className="font-mono">
                            {d.overBudget ? '+' : ''}${Math.abs(d.Diferencia).toLocaleString('es-MX')}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="Real" fill="#0F172A" radius={[4, 4, 0, 0]}>
                  {categoryBarData.map((entry, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={entry.overBudget ? '#EF4444' : '#10B981'}
                    />
                  ))}
                </Bar>
                <Bar dataKey="Presupuesto" fill="#64748B" radius={[4, 4, 0, 0]} opacity={0.65} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between border border-transparent dark:border-slate-800">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              Barras rojas indican categorías que han superado el 100% del presupuesto asignado.
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 3: BEHAVIORAL DAY-OF-WEEK & TRANSACTION AMOUNT DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Day of Week with Friday Spike Highlight */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                Gasto por Día de la Semana
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Total acumulado en el mes</p>
            </div>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
              Pico en Viernes (+{behavioral.fridaySpikePct}%)
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={behavioral.dayOfWeekSummary}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                />
                <YAxis
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  tickFormatter={(v) => `$${v >= 1000 ? `${v / 1000}k` : v}`}
                />
                <Tooltip
                  formatter={(val: any) => [`$${Number(val).toLocaleString('es-MX')}`, 'Gasto Total']}
                  contentStyle={{ borderRadius: '12px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {behavioral.dayOfWeekSummary.map((entry, index) => (
                    <Cell
                      key={`day-cell-${index}`}
                      fill={
                        entry.day === 'Viernes'
                          ? '#F59E0B'
                          : entry.day === 'Sábado' || entry.day === 'Domingo'
                          ? '#3B82F6'
                          : '#64748B'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/25 rounded-xl border border-amber-100 dark:border-amber-900/40">
              <span className="font-bold text-amber-900 dark:text-amber-400 block">Viernes Social:</span>
              <p className="text-amber-800 dark:text-amber-300 text-[11px] mt-0.5 leading-relaxed">
                Sesgo de gratificación inmediata ('trabajé duro'). Eleva el gasto promedio por transacción un 42%.
              </p>
            </div>
            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/25 rounded-xl border border-blue-100 dark:border-blue-900/40">
              <span className="font-bold text-blue-900 dark:text-blue-400 block">Fines de Semana:</span>
              <p className="text-blue-800 dark:text-blue-300 text-[11px] mt-0.5 leading-relaxed">
                Representa el <strong>{behavioral.weekendPct}%</strong> del flujo monetario mensual total.
              </p>
            </div>
          </div>
        </div>

        {/* Transaction Size Distribution (Histogram) */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                Distribución por Magnitud de Gasto
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Microgastos vs. compras extraordinarias</p>
            </div>
            <span className="text-xs font-semibold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800">
              The Latte Factor
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendingTiers} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  angle={-15}
                  textAnchor="end"
                  tick={{ fontSize: 9.5, fill: '#94A3B8' }}
                />
                <YAxis tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <Tooltip
                  formatter={(val: any, name: any, item: any) => [
                    `${val} compras ($${item.payload.total.toLocaleString('es-MX')} en total)`,
                    'Frecuencia',
                  ]}
                  contentStyle={{ borderRadius: '12px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {spendingTiers.map((entry, index) => (
                    <Cell key={`tier-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 bg-purple-50/70 dark:bg-purple-950/25 rounded-xl border border-purple-100 dark:border-purple-900/40 text-xs flex items-center justify-between">
            <div>
              <span className="font-bold text-purple-900 dark:text-purple-400 block">Microgastos (&lt;$150):</span>
              <span className="text-purple-800 dark:text-purple-300 text-[11px]">
                {behavioral.microExpensesCount} transacciones suman ${behavioral.microExpensesTotal.toLocaleString('es-MX')}.
              </span>
            </div>
            <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-purple-200 dark:border-purple-800 font-mono">
              Fácil de optimizar
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

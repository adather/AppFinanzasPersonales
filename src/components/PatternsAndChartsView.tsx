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
      return <circle cx={cx} cy={cy} r={3} fill="var(--ink-muted)" stroke="var(--paper)" strokeWidth={1.5} />;
    }

    return (
      <g key={`dot-${payload.date}`} className="cursor-pointer" onClick={() => setSelectedTimelinePoint(payload)}>
        <circle cx={cx} cy={cy} r={9} fill="var(--loss)" fillOpacity={0.25} className="animate-ping" />
        <circle cx={cx} cy={cy} r={6} fill="var(--loss)" stroke="var(--paper)" strokeWidth={2} />
        <circle cx={cx} cy={cy} r={2} fill="var(--paper)" />
      </g>
    );
  };

  return (
    <div className="space-y-8 text-ink transition-colors duration-200">
      {/* Top Behavioral Insights Ribbon */}
      <div className="p-6 border border-insight/30 bg-insight/5 space-y-4 transition-colors duration-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 border border-insight/40 bg-insight/10 text-insight flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-6 h-6 text-insight" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-insight">
                  Patrón conductual detectado
                </span>
                <span className="text-rule">·</span>
                <span className="text-xs text-ink-muted font-mono">Efecto viernes &amp; fin de semana</span>
              </div>
              <h2 className="font-display text-lg text-ink">
                Pico de gasto social y recompensa inmediata (+{behavioral.fridaySpikePct}% los viernes)
              </h2>
              <p className="text-xs text-ink-muted mt-1 max-w-3xl leading-relaxed">
                Tus consumos en restaurantes, cafeterías y ocio aumentan sistemáticamente al final de la semana
                laboral. El sesgo de recompensa inmediata ('trabajé duro toda la semana') concentra el{' '}
                <strong className="text-ink">{behavioral.weekendPct}%</strong> de tu presupuesto total en fines de semana.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="p-3 border border-rule text-center min-w-[120px]">
              <span className="text-xs text-ink-muted block">
                Pico viernes
              </span>
              <span className="font-display text-lg text-insight font-mono">
                +{behavioral.fridaySpikePct}%
              </span>
              <span className="text-[10px] text-ink-muted block">vs. días laborales</span>
            </div>
            <div className="p-3 border border-rule text-center min-w-[120px]">
              <span className="text-xs text-ink-muted block">
                Anomalías &gt;2σ
              </span>
              <span className="font-display text-lg text-loss font-mono">
                {computedAnomalies.length}
              </span>
              <span className="text-[10px] text-ink-muted block">en la serie temporal</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: INTERACTIVE TIMELINE / TIME SERIES */}
      <div className="p-6 border border-rule space-y-5 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-ink-muted" />
              <h3 className="font-display text-lg text-ink">
                Línea de tiempo interactiva: evolución de gastos y anomalías
              </h3>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Haz clic en cualquier punto o anomalía para inspeccionar el desglose de compras de esa fecha.
            </p>
          </div>

          {/* Interactive Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Daily vs Cumulative toggle */}
            <div className="flex items-center border border-rule p-1 rounded-md">
              <button
                type="button"
                onClick={() => setTimelineMode('daily')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                  timelineMode === 'daily'
                    ? 'bg-ink text-paper'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Gasto diario
              </button>
              <button
                type="button"
                onClick={() => setTimelineMode('cumulative')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                  timelineMode === 'cumulative'
                    ? 'bg-ink text-paper'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Acumulado
              </button>
            </div>

            {/* Time range selector */}
            <div className="flex items-center border border-rule p-1 rounded-md">
              {(['all', '14d', '7d'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTimeRange(r)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                    timeRange === r
                      ? 'bg-ink text-paper'
                      : 'text-ink-muted hover:text-ink'
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
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition border cursor-pointer ${
                highlightAnomaliesOnly
                  ? 'bg-loss/10 text-loss border-loss/40'
                  : 'text-ink-muted border-rule hover:text-ink hover:border-ink/40'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              Solo anomalías &gt;2σ
            </button>
          </div>
        </div>

        {/* Anomaly Legend Notice */}
        <div className="flex items-center justify-between text-xs text-ink-muted px-2 pt-1 border-t border-rule flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-loss" />
              <strong className="text-ink font-medium">Puntos rojos:</strong> anomalía estadística detectada (&gt;2σ)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-ink" />
              <span>Gasto del día</span>
            </span>
            {timelineMode === 'daily' && (
              <span className="flex items-center gap-1.5 text-ink-muted">
                <span className="w-3 h-0.5 bg-ink-muted border-dashed" />
                <span>Media móvil (3d)</span>
              </span>
            )}
          </div>
          <span className="text-[11px] text-ink-muted">
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
                  <stop offset="5%" stopColor="var(--ink)" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="var(--ink)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--ink)" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="var(--ink)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--rule)" />
              <XAxis
                dataKey="displayDate"
                tickLine={false}
                tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
              />
              <YAxis
                tickLine={false}
                tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload as TimelinePoint;
                  return (
                    <div className="bg-paper p-3.5 rounded-md border border-rule text-xs space-y-2 max-w-xs text-ink">
                      <div className="flex items-center justify-between border-b border-rule pb-1.5">
                        <span className="font-semibold text-ink font-mono">{data.date}</span>
                        <span className="text-ink-muted font-mono">{data.count} compra(s)</span>
                      </div>
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="text-ink-muted">Total del día:</span>
                        <span className="font-semibold text-ink font-mono text-sm">
                          ${data.dailyTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      {timelineMode === 'cumulative' && (
                        <div className="flex items-baseline justify-between gap-4 text-ink font-medium">
                          <span>Acumulado mes:</span>
                          <span className="font-mono font-semibold">
                            ${data.cumulativeTotal.toLocaleString('es-MX')}
                          </span>
                        </div>
                      )}
                      {data.hasAnomaly && (
                        <div className="p-2 bg-loss/10 rounded border border-loss/30 space-y-1 mt-1">
                          <div className="flex items-center gap-1 font-medium text-loss text-[11px]">
                            <AlertTriangle className="w-3 h-3" />
                            Anomalía ({data.anomalyZScore ? `+${data.anomalyZScore}σ` : '>2σ'})
                          </div>
                          <div className="text-ink font-medium truncate">
                            {data.anomalyConcept}
                          </div>
                          <div className="font-mono font-semibold text-loss">
                            ${data.anomalyAmount?.toLocaleString('es-MX')}
                          </div>
                        </div>
                      )}
                      <p className="text-[10px] text-ink-muted italic text-center pt-1">
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
                    stroke="var(--ink)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorDaily)"
                  />
                  <Line
                    type="monotone"
                    dataKey="rollingAvg"
                    stroke="var(--ink-muted)"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="dailyTotal"
                    stroke="transparent"
                    dot={renderAnomalyDot}
                    activeDot={{ r: 6, fill: 'var(--ink)' }}
                  />
                </>
              ) : (
                <Area
                  type="monotone"
                  dataKey="cumulativeTotal"
                  stroke="var(--ink)"
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
          <div className="p-4 bg-surface border border-rule space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-ink" />
                <h4 className="font-medium text-ink text-sm">
                  Detalle del {selectedTimelinePoint.date} ({selectedTimelinePoint.transactions.length} transacciones)
                </h4>
                {selectedTimelinePoint.hasAnomaly && (
                  <span className="text-xs font-medium text-loss flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Anomalía detectada
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedTimelinePoint(null)}
                className="text-xs text-ink-muted hover:text-ink underline cursor-pointer"
              >
                Cerrar detalle
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {selectedTimelinePoint.transactions.map((tx) => (
                <div
                  key={tx.id}
                  className={`p-3 border text-xs space-y-1 ${
                    tx.isAnomaly ? 'border-loss/50 bg-loss/5' : 'border-rule'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-medium text-ink truncate pr-2">{tx.concept}</span>
                    <span className="font-mono font-semibold text-ink shrink-0">
                      ${tx.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-ink-muted text-[11px]">
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
                    <div className="text-[10px] font-medium text-loss pt-0.5 flex items-center gap-1">
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
        <div className="lg:col-span-5 p-6 border border-rule space-y-4 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-ink-muted" />
                <h3 className="font-display text-lg text-ink">
                  Composición por categoría
                </h3>
              </div>
              <span className="text-xs text-ink-muted">Haz clic para filtrar</span>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
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
                      stroke={selectedCategoryName === entry.name ? 'var(--ink)' : 'var(--paper)'}
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
                    borderRadius: '4px',
                    backgroundColor: 'var(--paper)',
                    color: 'var(--ink)',
                    border: '1px solid var(--rule)',
                    boxShadow: 'none',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Centered Donut Summary Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              <span className="text-xs text-ink-muted">
                {selectedCategoryData ? 'Categoría' : 'Gasto total'}
              </span>
              <span className="font-display text-lg text-ink font-mono">
                ${selectedCategoryData
                  ? selectedCategoryData.total.toLocaleString('es-MX')
                  : totalSpent.toLocaleString('es-MX')}
              </span>
              <span className="text-[11px] text-ink-muted font-medium truncate max-w-[130px]">
                {selectedCategoryData ? selectedCategoryData.category : 'Todas'}
              </span>
            </div>
          </div>

          {/* Selected Category Dynamic Info Card */}
          {selectedCategoryData ? (
            <div className="p-3.5 border border-rule bg-surface space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: selectedCategoryData.color }}
                  />
                  {selectedCategoryData.category}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryName(null)}
                  className="text-[11px] text-ink-muted hover:text-ink underline cursor-pointer"
                >
                  Ver todas
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2 border border-rule">
                  <span className="text-[10px] text-ink-muted block font-mono">Presupuesto</span>
                  <span className="font-semibold text-ink font-mono">
                    ${selectedCategoryData.budget.toLocaleString('es-MX')}
                  </span>
                </div>
                <div className="p-2 border border-rule">
                  <span className="text-[10px] text-ink-muted block font-mono">% consumido</span>
                  <span
                    className={`font-semibold font-mono ${
                      selectedCategoryData.budgetPercent > 100 ? 'text-loss' : 'text-gain'
                    }`}
                  >
                    {selectedCategoryData.budgetPercent}%
                  </span>
                </div>
                <div className="p-2 border border-rule">
                  <span className="text-[10px] text-ink-muted block font-mono">Media (μ)</span>
                  <span className="font-semibold text-ink font-mono">
                    ${selectedCategoryData.mean.toLocaleString('es-MX')}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-ink-muted text-center italic py-2">
              Haz clic en cualquier segmento del gráfico para ver detalles y parámetros estadísticos.
            </div>
          )}
        </div>

        {/* Real vs Budget Grouped Bar Chart */}
        <div className="lg:col-span-7 p-6 border border-rule space-y-4 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-ink-muted" />
                <h3 className="font-display text-lg text-ink">
                  Gasto real vs. presupuesto por partida
                </h3>
              </div>
              <p className="text-xs text-ink-muted">Identificación visual de sobregiros</p>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-ink font-medium">
                <span className="w-3 h-3 bg-ink" /> Gasto real
              </span>
              <span className="flex items-center gap-1.5 text-ink-muted">
                <span className="w-3 h-3 bg-rule" /> Presupuesto
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryBarData}
                margin={{ top: 10, right: 10, left: -20, bottom: 45 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--rule)" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  angle={-35}
                  textAnchor="end"
                  tick={{ fontSize: 10, fill: 'var(--ink-muted)' }}
                />
                <YAxis
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'var(--ink-muted)' }}
                  tickFormatter={(v) => `$${v >= 1000 ? `${v / 1000}k` : v}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-paper p-3 rounded-md border border-rule text-xs space-y-1.5 text-ink">
                        <span className="font-semibold text-ink block">{d.fullName}</span>
                        <div className="flex justify-between gap-4 text-ink-muted">
                          <span>Gasto real:</span>
                          <span className="font-semibold font-mono text-ink">
                            ${Number(d.Real).toLocaleString('es-MX')}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 text-ink-muted">
                          <span>Presupuesto:</span>
                          <span className="font-mono">${Number(d.Presupuesto).toLocaleString('es-MX')}</span>
                        </div>
                        <div
                          className={`flex justify-between gap-4 font-semibold pt-1 border-t border-rule ${
                            d.overBudget ? 'text-loss' : 'text-gain'
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
                <Bar dataKey="Real" fill="var(--ink)" radius={[2, 2, 0, 0]}>
                  {categoryBarData.map((entry, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={entry.overBudget ? 'var(--loss)' : 'var(--gain)'}
                    />
                  ))}
                </Bar>
                <Bar dataKey="Presupuesto" fill="var(--ink-muted)" radius={[2, 2, 0, 0]} opacity={0.35} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-2.5 border border-rule text-xs text-ink-muted flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-loss" />
              Barras rojas indican categorías que han superado el 100% del presupuesto asignado.
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 3: BEHAVIORAL DAY-OF-WEEK & TRANSACTION AMOUNT DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Day of Week with Friday Spike Highlight */}
        <div className="p-6 border border-rule space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg text-ink">
                Gasto por día de la semana
              </h3>
              <p className="text-xs text-ink-muted">Total acumulado en el mes</p>
            </div>
            <span className="text-xs font-medium text-insight border border-insight/40 px-2.5 py-1">
              Pico en viernes (+{behavioral.fridaySpikePct}%)
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={behavioral.dayOfWeekSummary}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--rule)" />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                />
                <YAxis
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                  tickFormatter={(v) => `$${v >= 1000 ? `${v / 1000}k` : v}`}
                />
                <Tooltip
                  formatter={(val: any) => [`$${Number(val).toLocaleString('es-MX')}`, 'Gasto Total']}
                  contentStyle={{ borderRadius: '4px', backgroundColor: 'var(--paper)', border: '1px solid var(--rule)', color: 'var(--ink)', boxShadow: 'none', fontSize: '12px' }}
                />
                <Bar dataKey="total" radius={[3, 3, 0, 0]}>
                  {behavioral.dayOfWeekSummary.map((entry, index) => (
                    <Cell
                      key={`day-cell-${index}`}
                      fill={
                        entry.day === 'Viernes'
                          ? 'var(--insight)'
                          : entry.day === 'Sábado' || entry.day === 'Domingo'
                          ? 'var(--ink-muted)'
                          : 'var(--rule)'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div className="p-3 border border-insight/30 bg-insight/5">
              <span className="font-medium text-insight block">Viernes social:</span>
              <p className="text-ink-muted text-[11px] mt-0.5 leading-relaxed">
                Sesgo de gratificación inmediata ('trabajé duro'). Eleva el gasto promedio por transacción un 42%.
              </p>
            </div>
            <div className="p-3 border border-rule">
              <span className="font-medium text-ink block">Fines de semana:</span>
              <p className="text-ink-muted text-[11px] mt-0.5 leading-relaxed">
                Representa el <strong className="text-ink">{behavioral.weekendPct}%</strong> del flujo monetario mensual total.
              </p>
            </div>
          </div>
        </div>

        {/* Transaction Size Distribution (Histogram) */}
        <div className="p-6 border border-rule space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg text-ink">
                Distribución por magnitud de gasto
              </h3>
              <p className="text-xs text-ink-muted">Microgastos vs. compras extraordinarias</p>
            </div>
            <span className="text-xs font-medium text-insight border border-insight/40 px-2.5 py-1">
              The Latte Factor
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendingTiers} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--rule)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  angle={-15}
                  textAnchor="end"
                  tick={{ fontSize: 9.5, fill: 'var(--ink-muted)' }}
                />
                <YAxis tickLine={false} tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} />
                <Tooltip
                  formatter={(val: any, name: any, item: any) => [
                    `${val} compras ($${item.payload.total.toLocaleString('es-MX')} en total)`,
                    'Frecuencia',
                  ]}
                  contentStyle={{ borderRadius: '4px', backgroundColor: 'var(--paper)', border: '1px solid var(--rule)', color: 'var(--ink)', boxShadow: 'none', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {spendingTiers.map((entry, index) => (
                    <Cell key={`tier-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 border border-insight/30 bg-insight/5 text-xs flex items-center justify-between">
            <div>
              <span className="font-medium text-insight block">Microgastos (&lt;$150):</span>
              <span className="text-ink-muted text-[11px]">
                {behavioral.microExpensesCount} transacciones suman ${behavioral.microExpensesTotal.toLocaleString('es-MX')}.
              </span>
            </div>
            <span className="text-[11px] font-medium text-insight border border-insight/30 px-2 py-1 font-mono">
              Fácil de optimizar
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

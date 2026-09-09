import React, { useState } from 'react';
import {
  Search,
  Filter,
  Trash2,
  AlertTriangle,
  Camera,
  Mic,
  FileText,
  Calendar,
  DollarSign,
  Tag,
  ArrowUpDown,
  Download,
  Check,
  FileSpreadsheet,
} from 'lucide-react';
import { Transaction, CategoryName } from '../types';
import { CATEGORY_COLORS } from '../utils/statistics';

interface TransactionListViewProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
}

const CATEGORIES: CategoryName[] = [
  'Alimentos & Supermercado',
  'Transporte & Movilidad',
  'Entretenimiento & Ocio',
  'Servicios & Hogar',
  'Salud & Bienestar',
  'Educación & Libros',
  'Ropa & Compras',
  'Restaurantes & Cafeterías',
  'Otros',
];

export const TransactionListView: React.FC<TransactionListViewProps> = ({
  transactions,
  onDeleteTransaction,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyAnomalies, setOnlyAnomalies] = useState(false);
  const [sortAsc, setSortAsc] = useState(false);
  const [exportedSuccess, setExportedSuccess] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);

  const filtered = transactions.filter((t) => {
    const matchesSearch =
      t.concept.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.note && t.note.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesAnomaly = !onlyAnomalies || Boolean(t.isAnomaly);

    return matchesSearch && matchesCategory && matchesAnomaly;
  });

  const sorted = [...filtered].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return sortAsc ? dateA - dateB : dateB - dateA;
  });

  const totalFiltered = sorted.reduce((sum, t) => sum + t.amount, 0);

  const escapeCsvCell = (value: string | number | boolean | null | undefined): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleExportCSV = (exportAll = false) => {
    const listToExport = exportAll ? transactions : sorted;
    if (listToExport.length === 0) return;

    const headers = [
      'ID',
      'Fecha',
      'Concepto',
      'Comercio',
      'Categoría',
      'Monto (MXN)',
      'Origen',
      'Es Anomalía (>2σ)',
      'Puntaje Z',
      'Notas',
    ];

    const rows = listToExport.map((t) => [
      t.id,
      t.date,
      t.concept,
      t.merchant,
      t.category,
      t.amount.toFixed(2),
      t.rawSource === 'receipt'
        ? 'Recibo (IA)'
        : t.rawSource === 'verbal'
        ? 'Verbal (IA)'
        : t.rawSource === 'seed'
        ? 'Demo / Histórico'
        : 'Manual',
      t.isAnomaly ? 'SÍ' : 'NO',
      t.zScore ? t.zScore.toFixed(2) : '0.00',
      t.note || '',
    ]);

    const csvContent = [
      headers.map(escapeCsvCell).join(','),
      ...rows.map((row) => row.map(escapeCsvCell).join(',')),
    ].join('\r\n');

    // Prepend UTF-8 BOM so Excel and spreadsheet apps render accents correctly
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const todayStr = new Date().toISOString().slice(0, 10);
    const isFilteredExport = !exportAll && sorted.length < transactions.length;
    const filterSuffix = isFilteredExport ? '_filtradas' : '';
    link.setAttribute('href', url);
    link.setAttribute('download', `registro_gastos_${todayStr}${filterSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportedSuccess(true);
    setShowExportOptions(false);
    setTimeout(() => setExportedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-200">
      {/* Filters & Search Header */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Search box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por concepto o comercio..."
              className="w-full pl-10 pr-4 py-2 text-xs border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap justify-end">
            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Todas las categorías</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Anomalies Only Toggle */}
            <button
              type="button"
              onClick={() => setOnlyAnomalies(!onlyAnomalies)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                onlyAnomalies
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Solo anomalías &gt;2σ
            </button>

            {/* Sort direction */}
            <button
              type="button"
              onClick={() => setSortAsc(!sortAsc)}
              className="p-2 border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition text-xs flex items-center gap-1 cursor-pointer"
              title={sortAsc ? 'Más antiguas primero' : 'Más recientes primero'}
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>

            {/* Export CSV Button */}
            <div className="relative">
              <button
                id="export-transactions-csv-btn"
                type="button"
                onClick={() => {
                  if (sorted.length < transactions.length) {
                    setShowExportOptions(!showExportOptions);
                  } else {
                    handleExportCSV(false);
                  }
                }}
                disabled={transactions.length === 0}
                className="px-3.5 py-2 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                title={`Descargar ${sorted.length} transacciones en formato CSV compatible con Excel y Google Sheets`}
              >
                {exportedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">¡Descargado!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Exportar CSV</span>
                  </>
                )}
              </button>

              {/* Dropdown if filters are active */}
              {showExportOptions && sorted.length < transactions.length && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowExportOptions(false)}
                  />
                  <div
                    id="export-csv-dropdown"
                    className="absolute right-0 mt-1.5 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-2 z-20 space-y-1 animate-in fade-in zoom-in-95 duration-100"
                  >
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 px-2 py-1">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Exportar a CSV / Excel</span>
                    </div>
                    <button
                      type="button"
                      id="export-filtered-csv-btn"
                      onClick={() => handleExportCSV(false)}
                      className="w-full text-left px-2.5 py-2 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">Filtradas actuales</span>
                        <span className="text-[10px] text-slate-400">Según búsqueda y categorías</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs ml-2">
                        {sorted.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      id="export-all-csv-btn"
                      onClick={() => handleExportCSV(true)}
                      className="w-full text-left px-2.5 py-2 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">Historial completo</span>
                        <span className="text-[10px] text-slate-400">Todas sin aplicar filtros</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs ml-2">
                        {transactions.length}
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Counter badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-wrap">
            <span>Mostrando <strong>{sorted.length}</strong> de {transactions.length} transacciones</span>
            <span>•</span>
            <span>Suma del filtro: <strong className="text-slate-900 dark:text-white font-mono">${totalFiltered.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></span>
          </div>
          {sorted.length !== transactions.length && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              * Filtros activos ({transactions.length - sorted.length} transacciones ocultas)
            </span>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Fecha</th>
                <th className="py-3.5 px-4">Concepto / Comercio</th>
                <th className="py-3.5 px-4">Categoría</th>
                <th className="py-3.5 px-4 text-center">Origen</th>
                <th className="py-3.5 px-4 text-right">Monto</th>
                <th className="py-3.5 px-4 text-center">Estado Estadístico</th>
                <th className="py-3.5 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                    No se encontraron transacciones con los criterios de búsqueda actuales.
                  </td>
                </tr>
              ) : (
                sorted.map((tx) => {
                  const catColor = CATEGORY_COLORS[tx.category] || '#6B7280';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/40 transition group">
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white text-sm">{tx.concept}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                          <span>{tx.merchant}</span>
                          {tx.note && <span className="italic">• {tx.note}</span>}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${catColor}15`,
                            color: catColor,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: catColor }}
                          />
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {tx.rawSource === 'receipt' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md" title="Extraído con IA desde Recibo">
                            <Camera className="w-3 h-3" /> Recibo
                          </span>
                        ) : tx.rawSource === 'verbal' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-md" title="Dictado verbal o texto natural">
                            <Mic className="w-3 h-3" /> Verbal
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            <FileText className="w-3 h-3" /> Manual
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white font-mono">
                        ${tx.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {tx.isAnomaly ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 px-2.5 py-1 rounded-full border border-rose-200/80 dark:border-rose-900/40">
                            <AlertTriangle className="w-3 h-3" />
                            Anomalía ({tx.zScore ? `+${tx.zScore}σ` : '>2σ'})
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">Normal (dentro de 2σ)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => onDeleteTransaction(tx.id)}
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition cursor-pointer"
                          title="Eliminar transacción"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

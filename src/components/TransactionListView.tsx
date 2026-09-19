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
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
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
    <div className="space-y-6 text-ink">
      {/* Filters & Search Header */}
      <div className="space-y-4 pb-5 border-b border-rule">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Search box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por concepto o comercio..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-rule bg-paper text-ink rounded-md focus:ring-1 focus:ring-ink/30 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs px-3 py-2 border border-rule rounded-md bg-paper text-ink focus:outline-none focus:ring-1 focus:ring-ink/30 cursor-pointer"
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
              className={`px-3 py-2 rounded-md text-xs font-medium flex items-center gap-1.5 transition cursor-pointer border ${
                onlyAnomalies
                  ? 'bg-ink text-paper border-ink'
                  : 'border-rule text-ink-muted hover:text-ink hover:border-ink/40'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Solo anomalías &gt;2σ
            </button>

            {/* Sort direction */}
            <button
              type="button"
              onClick={() => setSortAsc(!sortAsc)}
              className="p-2 border border-rule text-ink-muted hover:text-ink hover:border-ink/40 bg-paper rounded-md transition text-xs flex items-center gap-1 cursor-pointer"
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
                className="px-3.5 py-2 border border-rule text-ink-muted hover:text-ink hover:border-ink/40 bg-paper rounded-md transition text-xs font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title={`Descargar ${sorted.length} transacciones en formato CSV compatible con Excel y Google Sheets`}
              >
                {exportedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-gain" />
                    <span className="text-gain font-medium">¡Descargado!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
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
                    className="absolute right-0 mt-1.5 w-64 bg-paper border border-rule rounded-md p-2 z-20 space-y-1"
                  >
                    <div className="flex items-center gap-1.5 text-xs text-ink-muted px-2 py-1">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Exportar a CSV / Excel</span>
                    </div>
                    <button
                      type="button"
                      id="export-filtered-csv-btn"
                      onClick={() => handleExportCSV(false)}
                      className="w-full text-left px-2.5 py-2 rounded-md text-xs hover:bg-surface flex items-center justify-between text-ink cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">Filtradas actuales</span>
                        <span className="text-xs text-ink-muted">Según búsqueda y categorías</span>
                      </div>
                      <span className="font-mono font-medium text-ink px-2 py-1 border border-rule rounded-md text-xs ml-2">
                        {sorted.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      id="export-all-csv-btn"
                      onClick={() => handleExportCSV(true)}
                      className="w-full text-left px-2.5 py-2 rounded-md text-xs hover:bg-surface flex items-center justify-between text-ink cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">Historial completo</span>
                        <span className="text-xs text-ink-muted">Todas sin aplicar filtros</span>
                      </div>
                      <span className="font-mono font-medium text-ink px-2 py-1 border border-rule rounded-md text-xs ml-2">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-ink-muted pt-3 border-t border-rule">
          <div className="flex items-center gap-2 flex-wrap">
            <span>Mostrando <strong className="text-ink font-medium">{sorted.length}</strong> de {transactions.length} transacciones</span>
            <span className="text-rule">·</span>
            <span>Suma del filtro: <strong className="text-ink font-mono font-medium">${totalFiltered.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></span>
          </div>
          {sorted.length !== transactions.length && (
            <span className="text-xs text-ink-muted">
              * Filtros activos ({transactions.length - sorted.length} transacciones ocultas)
            </span>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="border border-rule overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-rule text-ink-muted text-xs">
                <th className="py-3 px-4 font-normal">Fecha</th>
                <th className="py-3 px-4 font-normal">Concepto / Comercio</th>
                <th className="py-3 px-4 font-normal">Categoría</th>
                <th className="py-3 px-4 text-center font-normal">Origen</th>
                <th className="py-3 px-4 text-right font-normal">Monto</th>
                <th className="py-3 px-4 text-center font-normal">Estado estadístico</th>
                <th className="py-3 px-4 text-center font-normal">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-ink-muted text-xs">
                    No se encontraron transacciones con los criterios de búsqueda actuales.
                  </td>
                </tr>
              ) : (
                sorted.map((tx) => {
                  const catColor = CATEGORY_COLORS[tx.category] || '#6B7280';
                  return (
                    <tr key={tx.id} className="hover:bg-surface transition group">
                      <td className="py-3.5 px-4 text-xs font-mono text-ink-muted whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-ink text-sm">{tx.concept}</div>
                        <div className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
                          <span>{tx.merchant}</span>
                          {tx.note && (
                            <span className="italic flex items-center gap-1">
                              <span className="text-rule">·</span> {tx.note}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 text-xs text-ink">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: catColor }}
                          />
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {tx.rawSource === 'receipt' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-insight" title="Extraído con IA desde Recibo">
                            <Camera className="w-3 h-3" /> Recibo
                          </span>
                        ) : tx.rawSource === 'verbal' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-insight" title="Dictado verbal o texto natural">
                            <Mic className="w-3 h-3" /> Verbal
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
                            <FileText className="w-3 h-3" /> Manual
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-ink font-mono">
                        ${tx.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {tx.isAnomaly ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-loss font-mono">
                            <AlertTriangle className="w-3 h-3" />
                            Anomalía ({tx.zScore ? `+${tx.zScore}σ` : '>2σ'})
                          </span>
                        ) : (
                          <span className="text-xs text-ink-muted">Normal (dentro de 2σ)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => onDeleteTransaction(tx.id)}
                          className="p-1.5 text-ink-muted hover:text-loss hover:bg-loss/10 rounded-md transition cursor-pointer"
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

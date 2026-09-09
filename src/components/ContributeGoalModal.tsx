import React, { useState } from 'react';
import { X, DollarSign, PlusCircle, CheckCircle, Sparkles, TrendingDown } from 'lucide-react';
import { SavingsGoal } from '../types';
import { calculateGoalProgress } from '../utils/statistics';

interface ContributeGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: SavingsGoal | null;
  onAddContribution: (goalId: string, amount: number, note?: string) => void;
}

export const ContributeGoalModal: React.FC<ContributeGoalModalProps> = ({
  isOpen,
  onClose,
  goal,
  onAddContribution,
}) => {
  const [amountStr, setAmountStr] = useState('1000');
  const [note, setNote] = useState('');

  if (!isOpen || !goal) return null;

  const currentAmount = goal.currentAmount;
  const targetAmount = goal.targetAmount;
  const deposit = parseFloat(amountStr) || 0;
  const newCurrent = currentAmount + deposit;

  const beforeCalc = calculateGoalProgress(targetAmount, currentAmount, goal.targetDate);
  const afterCalc = calculateGoalProgress(targetAmount, newCurrent, goal.targetDate);

  const monthlyReduction = Math.max(0, beforeCalc.monthlyRequired - afterCalc.monthlyRequired);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (deposit <= 0) return;
    onAddContribution(goal.id, deposit, note.trim() || undefined);
    onClose();
  };

  const quickAmounts = [500, 1000, 2000, 5000];

  return (
    <div id="contribute-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div id="contribute-modal-card" className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Registrar Aporte
            </span>
            <h3 className="font-bold text-slate-800 dark:text-white text-base">{goal.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Current Status */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Ahorro acumulado</span>
              <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                ${currentAmount.toLocaleString('es-MX')}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Meta total</span>
              <span className="font-bold text-slate-700 dark:text-slate-300 font-mono text-sm">
                ${targetAmount.toLocaleString('es-MX')}
              </span>
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Monto a Aportar ($)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold">$</span>
              <input
                type="number"
                required
                min="1"
                step="50"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 text-base border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Quick buttons */}
            <div className="flex items-center gap-2 mt-2">
              {quickAmounts.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmountStr(String(q))}
                  className="flex-1 py-1 text-[11px] font-semibold font-mono bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-lg transition cursor-pointer"
                >
                  +${q}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Impact Simulation Card */}
          {deposit > 0 && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/50 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-400">
                <TrendingDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Impacto Positivo Inmediato:</span>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
                Tu nuevo saldo alcanzará el{' '}
                <strong>{afterCalc.percentComplete}%</strong> de la meta.
                {monthlyReduction > 0 && (
                  <>
                    {' '}Tu cuota mensual requerida se reducirá en{' '}
                    <strong>${monthlyReduction.toLocaleString('es-MX')}/mes</strong> (ahora necesitarás solo{' '}
                    <strong>${afterCalc.monthlyRequired.toLocaleString('es-MX')}/mes</strong>).
                  </>
                )}
              </p>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Nota o concepto (opcional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ej. Ahorro de la quincena, venta de artículo, etc."
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-850 dark:hover:text-white rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-700 dark:hover:bg-emerald-600 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              Confirmar Aporte
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

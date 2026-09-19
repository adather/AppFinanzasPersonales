import React, { useState } from 'react';
import { X, CheckCircle, TrendingDown } from 'lucide-react';
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
    <div id="contribute-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div id="contribute-modal-card" className="bg-surface rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rule">
          <div>
            <span className="text-xs text-ink-muted">
              Registrar aporte
            </span>
            <h3 className="font-bold text-lg text-ink">{goal.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-ink-muted hover:text-ink hover:bg-rule/50 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Current Status */}
          <div className="p-3 bg-paper rounded-lg flex items-center justify-between">
            <div>
              <span className="text-ink-muted block text-[11px]">Ahorro acumulado</span>
              <span className="font-medium text-ink font-mono text-sm">
                ${currentAmount.toLocaleString('es-MX')}
              </span>
            </div>
            <div className="text-right">
              <span className="text-ink-muted block text-[11px]">Meta total</span>
              <span className="font-medium text-ink-muted font-mono text-sm">
                ${targetAmount.toLocaleString('es-MX')}
              </span>
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label className="text-xs font-medium text-ink-muted block mb-1">Monto a aportar ($)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted font-medium">$</span>
              <input
                type="number"
                required
                min="1"
                step="50"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 text-base border border-rule bg-paper rounded-lg font-mono font-medium text-ink focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none"
              />
            </div>

            {/* Quick buttons */}
            <div className="flex items-center gap-2 mt-2">
              {quickAmounts.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmountStr(String(q))}
                  className="flex-1 py-1 text-[11px] font-medium font-mono bg-rule/50 hover:bg-accent-soft text-ink-muted hover:text-accent rounded-lg transition cursor-pointer"
                >
                  +${q}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Impact Simulation Card */}
          {deposit > 0 && (
            <div className="p-3.5 bg-gain/10 text-ink rounded-lg space-y-1.5">
              <div className="flex items-center gap-1.5 font-medium text-gain">
                <TrendingDown className="w-4 h-4" />
                <span>Impacto positivo inmediato</span>
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                Tu nuevo saldo alcanzará el{' '}
                <strong className="text-ink">{afterCalc.percentComplete}%</strong> de la meta.
                {monthlyReduction > 0 && (
                  <>
                    {' '}Tu cuota mensual requerida se reducirá en{' '}
                    <strong className="text-ink">${monthlyReduction.toLocaleString('es-MX')}/mes</strong> (ahora necesitarás solo{' '}
                    <strong className="text-ink">${afterCalc.monthlyRequired.toLocaleString('es-MX')}/mes</strong>).
                  </>
                )}
              </p>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="text-xs font-medium text-ink-muted block mb-1">Nota o concepto (opcional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ej. Ahorro de la quincena, venta de artículo, etc."
              className="w-full px-3 py-2 text-xs border border-rule bg-paper text-ink rounded-lg focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium bg-rule/50 hover:bg-rule text-ink-muted hover:text-ink rounded-lg transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-semibold bg-accent text-white hover:bg-accent/90 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              Confirmar aporte
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

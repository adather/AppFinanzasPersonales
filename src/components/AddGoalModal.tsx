import React, { useState } from 'react';
import {
  X,
  Target,
  Home,
  Shield,
  Plane,
  GraduationCap,
  Car,
  Sparkles,
} from 'lucide-react';
import { SavingsGoal } from '../types';
import { calculateGoalProgress } from '../utils/statistics';

interface AddGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveGoal: (goal: Omit<SavingsGoal, 'id' | 'createdAt'>) => void;
  editingGoal?: SavingsGoal | null;
}

const PRESETS = [
  {
    title: 'Pago inicial para una casa',
    category: 'vivienda' as const,
    targetAmount: 200000,
    color: '#3B82F6',
    icon: Home,
    defaultMonths: 24,
  },
  {
    title: 'Fondo de emergencia (3-6 meses)',
    category: 'emergencia' as const,
    targetAmount: 40000,
    color: '#10B981',
    icon: Shield,
    defaultMonths: 6,
  },
  {
    title: 'Vacaciones soñadas',
    category: 'viajes' as const,
    targetAmount: 25000,
    color: '#F59E0B',
    icon: Plane,
    defaultMonths: 4,
  },
  {
    title: 'Educación / Certificaciones',
    category: 'educacion' as const,
    targetAmount: 15000,
    color: '#8B5CF6',
    icon: GraduationCap,
    defaultMonths: 6,
  },
  {
    title: 'Enganche de auto',
    category: 'vehiculo' as const,
    targetAmount: 60000,
    color: '#EC4899',
    icon: Car,
    defaultMonths: 12,
  },
];

export const AddGoalModal: React.FC<AddGoalModalProps> = ({
  isOpen,
  onClose,
  onSaveGoal,
  editingGoal,
}) => {
  const getDefaultTargetDate = (monthsAhead = 6) => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthsAhead);
    return d.toISOString().split('T')[0];
  };

  const [title, setTitle] = useState(editingGoal?.title || '');
  const [category, setCategory] = useState<SavingsGoal['category']>(
    editingGoal?.category || 'emergencia'
  );
  const [targetAmount, setTargetAmount] = useState<string>(
    editingGoal?.targetAmount ? String(editingGoal.targetAmount) : '30000'
  );
  const [currentAmount, setCurrentAmount] = useState<string>(
    editingGoal?.currentAmount ? String(editingGoal.currentAmount) : '0'
  );
  const [targetDate, setTargetDate] = useState<string>(
    editingGoal?.targetDate || getDefaultTargetDate(6)
  );
  const [notes, setNotes] = useState(editingGoal?.notes || '');
  const [color, setColor] = useState(editingGoal?.color || '#10B981');

  if (!isOpen) return null;

  const numTarget = parseFloat(targetAmount) || 0;
  const numCurrent = parseFloat(currentAmount) || 0;

  // Live calculation of requirements
  const calculated = calculateGoalProgress(numTarget, numCurrent, targetDate);

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setTitle(preset.title);
    setCategory(preset.category);
    setTargetAmount(String(preset.targetAmount));
    setColor(preset.color);
    setTargetDate(getDefaultTargetDate(preset.defaultMonths));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || numTarget <= 0) return;

    onSaveGoal({
      title: title.trim(),
      category,
      targetAmount: numTarget,
      currentAmount: Math.max(0, numCurrent),
      targetDate,
      notes: notes.trim(),
      color,
      contributions: editingGoal?.contributions || (numCurrent > 0 ? [
        {
          id: `contrib-init-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          amount: numCurrent,
          note: 'Saldo inicial registrado al crear la meta',
        },
      ] : []),
      customAdvice: editingGoal?.customAdvice,
    });
    onClose();
  };

  return (
    <div id="add-goal-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div id="add-goal-modal-card" className="bg-surface rounded-2xl shadow-xl w-full max-w-xl overflow-hidden my-6 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rule">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl text-white flex items-center justify-center shrink-0"
              style={{ backgroundColor: color }}
            >
              <Target className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-ink">
                {editingGoal ? 'Editar meta de ahorro' : 'Definir nueva meta de ahorro'}
              </h3>
              <p className="text-xs text-ink-muted">
                Calcula la disciplina mensual y semanal requerida para alcanzar tu objetivo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-ink-muted hover:text-ink hover:bg-rule/50 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets (only when creating) */}
        {!editingGoal && (
          <div className="px-6 pt-4 pb-4 border-b border-rule">
            <span className="text-xs font-medium text-ink-muted block mb-2">
              Metas populares (clic para autocompletar)
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {PRESETS.map((p) => {
                const IconComponent = p.icon;
                return (
                  <button
                    key={p.title}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="px-3 py-1.5 rounded-lg border border-rule bg-paper hover:bg-accent-soft hover:border-accent/40 text-ink-muted hover:text-accent text-xs font-medium flex items-center gap-1.5 shrink-0 transition cursor-pointer"
                  >
                    <IconComponent className="w-3.5 h-3.5" style={{ color: p.color }} />
                    <span>{p.title.split('(')[0].trim()}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-ink-muted block mb-1">Nombre de la meta</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ej. Pago inicial para una casa, Vacaciones, Fondo de emergencia..."
              className="w-full px-3.5 py-2.5 text-xs border border-rule bg-paper text-ink rounded-lg focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none"
            />
          </div>

          {/* Category & Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-ink-muted block mb-1">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-rule rounded-lg bg-paper text-ink focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none cursor-pointer"
              >
                <option value="vivienda">Vivienda (Casa / Depto)</option>
                <option value="emergencia">Fondo de Emergencia</option>
                <option value="viajes">Vacaciones & Viajes</option>
                <option value="educacion">Educación / Carrera</option>
                <option value="vehiculo">Vehículo / Transporte</option>
                <option value="tecnologia">Tecnología / Equipamiento</option>
                <option value="otro">Otro Proyecto</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-ink-muted block mb-1">Color distintivo</label>
              <div className="flex items-center gap-2 pt-1">
                {['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#0F172A'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition cursor-pointer ${
                      color === c ? 'ring-2 ring-offset-2 ring-offset-surface ring-accent scale-110' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Target Amount & Initial Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-ink-muted block mb-1">Monto objetivo ($)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted font-medium">$</span>
                <input
                  type="number"
                  required
                  min="1"
                  step="100"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-xs border border-rule bg-paper rounded-lg font-mono font-medium text-ink focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-ink-muted block mb-1">Ahorro actual / inicial ($)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted font-medium">$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-xs border border-rule bg-paper rounded-lg font-mono text-ink focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Target Date */}
          <div>
            <label className="text-xs font-medium text-ink-muted block mb-1">Fecha límite deseada</label>
            <div className="relative">
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-rule bg-paper text-ink rounded-lg focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Live Calculated Metric Box */}
          {numTarget > 0 && (
            <div className="p-4 bg-accent text-white rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Cálculo automático de esfuerzo requerido
                </span>
                <span className="font-mono opacity-90">
                  {calculated.monthsRemaining} meses restantes
                </span>
              </div>

              <div className="grid grid-cols-2 gap-px bg-white/15 rounded-xl overflow-hidden">
                <div className="p-3 bg-accent">
                  <span className="text-[11px] opacity-70 block">
                    Ahorro requerido por mes
                  </span>
                  <div className="font-bold text-lg mt-0.5">
                    ${calculated.monthlyRequired.toLocaleString('es-MX')}
                    <span className="text-xs opacity-70 font-sans font-normal"> / mes</span>
                  </div>
                </div>

                <div className="p-3 bg-accent">
                  <span className="text-[11px] opacity-70 block">
                    Ahorro requerido por semana
                  </span>
                  <div className="font-bold text-lg mt-0.5">
                    ${calculated.weeklyRequired.toLocaleString('es-MX')}
                    <span className="text-xs opacity-70 font-sans font-normal"> / sem</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs opacity-80 pt-2 border-t border-white/15">
                <span>Faltan por ahorrar: <strong className="font-mono">${calculated.remainingAmount.toLocaleString('es-MX')}</strong></span>
                <span>Avance: <strong className="font-mono">{calculated.percentComplete}%</strong></span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-ink-muted block mb-1">Notas o motivación personal (opcional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivación, cuenta bancaria asignada o recordatorio..."
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
              className="px-5 py-2.5 text-xs font-semibold bg-accent text-white hover:bg-accent/90 rounded-lg transition cursor-pointer"
            >
              {editingGoal ? 'Guardar cambios' : 'Crear meta de ahorro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { PlusCircle, X, Check } from 'lucide-react';
import { CategoryName, Transaction } from '../types';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
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

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onAddTransaction,
}) => {
  const today = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(today);
  const [concept, setConcept] = useState('');
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<CategoryName>('Alimentos & Supermercado');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!concept.trim()) {
      setError('Por favor indica un concepto.');
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('El monto debe ser un número positivo.');
      return;
    }

    onAddTransaction({
      date,
      concept: concept.trim(),
      merchant: merchant.trim() || concept.trim(),
      amount: numAmount,
      category,
      note: note.trim() || undefined,
      rawSource: 'manual',
    });

    // Reset form
    setConcept('');
    setMerchant('');
    setAmount('');
    setNote('');
    setError(null);
    onClose();
  };

  return (
    <div id="add-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div id="add-modal-card" className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Nuevo Gasto Manual</h3>
              <p className="text-xs text-slate-500">Ingresa los datos para alimentar el modelo estadístico</p>
            </div>
          </div>
          <button
            id="close-add-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Concepto o Descripción *</label>
            <input
              type="text"
              required
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Ej: Despensa semanal, Gasolina, Cena familiar..."
              className="w-full text-sm px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Monto ($) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full text-sm font-semibold px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-sm px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryName)}
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Comercio o Lugar</label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="Ej: Walmart, Starbucks, Pemex..."
                className="w-full text-sm px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notas adicionales (opcional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej: Salida especial, pago con tarjeta de crédito..."
              className="w-full text-sm px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-600 font-medium">{error}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition flex items-center gap-2"
            >
              <Check className="w-4 h-4" /> Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

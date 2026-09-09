import React from 'react';
import {
  Sparkles,
  Zap,
  Cpu,
  Brain,
  CheckCircle2,
  X,
  Gauge,
  HelpCircle,
  ArrowRight,
  Info,
} from 'lucide-react';
import { GeminiModelId, GeminiModelOption, AVAILABLE_GEMINI_MODELS } from '../types';

interface ModelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: GeminiModelId;
  onSelectModel: (modelId: GeminiModelId) => void;
  onReanalyzeWithModel?: (modelId: GeminiModelId) => void;
}

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedModel,
  onSelectModel,
  onReanalyzeWithModel,
}) => {
  if (!isOpen) return null;

  const currentOption = AVAILABLE_GEMINI_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_GEMINI_MODELS[0];

  const getModelIcon = (id: GeminiModelId) => {
    switch (id) {
      case 'gemini-3.1-pro-preview':
        return <Brain className="w-5 h-5 text-purple-600" />;
      case 'gemini-3.1-flash-lite':
        return <Zap className="w-5 h-5 text-amber-500" />;
      case 'gemini-flash-latest':
        return <Cpu className="w-5 h-5 text-blue-500" />;
      case 'gemini-3.8-flash':
      default:
        return <Sparkles className="w-5 h-5 text-emerald-500" />;
    }
  };

  const getSpeedBadgeClass = (speed: GeminiModelOption['speed']) => {
    switch (speed) {
      case 'Ultra Rápido':
        return 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40';
      case 'Profundo':
        return 'bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/40';
      case 'Rápido':
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40';
    }
  };

  return (
    <div
      id="model-selector-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="model-selector-modal"
        className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center shadow-xs">
              <Cpu className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Selección de Modelo de Inteligencia Artificial
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configura el motor neuronal que ejecutará los análisis y el asesor conductual
              </p>
            </div>
          </div>
          <button
            id="close-model-selector-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content & Model Options */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800/80 flex items-start gap-3">
            <Info className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Todos los modelos se ejecutan en el servidor de forma segura con el SDK oficial de{' '}
              <strong className="text-slate-800 dark:text-slate-100 font-semibold">@google/genai</strong>. Puedes alternar libremente según tus prioridades de velocidad o exhaustividad analítica.
            </p>
          </div>

          <div className="space-y-3">
            {AVAILABLE_GEMINI_MODELS.map((model) => {
              const isSelected = selectedModel === model.id;
              return (
                <div
                  key={model.id}
                  id={`model-card-${model.id}`}
                  onClick={() => onSelectModel(model.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col gap-2 ${
                    isSelected
                      ? 'border-slate-900 dark:border-slate-200 bg-slate-50/70 dark:bg-slate-800/50 ring-1 ring-slate-900 dark:ring-slate-200 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/40 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                        {getModelIcon(model.id)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{model.name}</span>
                          {model.isDefault && (
                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 rounded-md">
                              Recomendado
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 text-[10px] font-medium rounded-md border ${getSpeedBadgeClass(
                              model.speed
                            )}`}
                          >
                            {model.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{model.description}</p>
                      </div>
                    </div>

                    <div className="shrink-0 mt-1">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500" />
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="italic">{model.details}</span>
                    <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{model.id}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span>Modelo activo:</span>
            <strong className="text-slate-800 dark:text-white font-semibold">{currentOption.name}</strong>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onReanalyzeWithModel && (
              <button
                id="apply-and-reanalyze-btn"
                type="button"
                onClick={() => {
                  onReanalyzeWithModel(selectedModel);
                  onClose();
                }}
                className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition shadow-2xs cursor-pointer"
              >
                Guardar y Reanalizar
              </button>
            )}
            <button
              id="confirm-model-selection-btn"
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold text-white dark:text-slate-900 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Aplicar Configuración</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

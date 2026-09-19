import React from 'react';
import {
  Sparkles,
  Zap,
  Cpu,
  Brain,
  CheckCircle2,
  X,
  Info,
  ArrowRight,
} from 'lucide-react';
import { GeminiModelId, AVAILABLE_GEMINI_MODELS } from '../types';

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
        return <Brain className="w-4 h-4" />;
      case 'gemini-3.1-flash-lite':
        return <Zap className="w-4 h-4" />;
      case 'gemini-flash-latest':
        return <Cpu className="w-4 h-4" />;
      case 'gemini-3.8-flash':
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  return (
    <div
      id="model-selector-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="model-selector-modal"
        className="bg-surface w-full max-w-xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-rule flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center shrink-0">
              <Cpu className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-ink leading-tight">
                Selección de modelo de inteligencia artificial
              </h3>
              <p className="text-xs text-ink-muted">
                Configura el motor neuronal que ejecutará los análisis y el asesor conductual
              </p>
            </div>
          </div>
          <button
            id="close-model-selector-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 text-ink-muted hover:text-ink hover:bg-rule/50 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content & Model Options */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="p-3.5 bg-accent-soft rounded-lg flex items-start gap-3">
            <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <p className="text-xs text-ink-muted leading-relaxed">
              Todos los modelos se ejecutan en el servidor de forma segura con el SDK oficial de{' '}
              <strong className="text-ink font-semibold">google-genai</strong> (Python). Puedes alternar libremente según tus prioridades de velocidad o exhaustividad analítica.
            </p>
          </div>

          <div className="space-y-2.5">
            {AVAILABLE_GEMINI_MODELS.map((model) => {
              const isSelected = selectedModel === model.id;
              return (
                <div
                  key={model.id}
                  id={`model-card-${model.id}`}
                  onClick={() => onSelectModel(model.id)}
                  className={`p-4 rounded-xl transition-all cursor-pointer relative flex flex-col gap-2 ${
                    isSelected
                      ? 'ring-2 ring-accent bg-accent-soft'
                      : 'bg-surface shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-accent-soft text-accent shrink-0">
                        {getModelIcon(model.id)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-ink">{model.name}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              model.isDefault
                                ? 'bg-insight/15 text-insight'
                                : 'bg-rule/60 text-ink-muted'
                            }`}
                          >
                            {model.badge}
                          </span>
                        </div>
                        <p className="text-xs text-ink-muted mt-0.5">{model.description}</p>
                      </div>
                    </div>

                    <div className="shrink-0 mt-1">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-rule" />
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-rule flex items-center justify-between text-[11px] text-ink-muted">
                    <span className="italic">{model.details}</span>
                    <span className="font-mono text-[10px]">{model.id}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-rule flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-ink-muted flex items-center gap-1.5">
            <span>Modelo activo:</span>
            <strong className="text-ink font-semibold">{currentOption.name}</strong>
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
                className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-medium bg-rule/50 hover:bg-rule text-ink-muted hover:text-ink rounded-lg transition cursor-pointer"
              >
                Guardar y reanalizar
              </button>
            )}
            <button
              id="confirm-model-selection-btn"
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold bg-accent text-white hover:bg-accent/90 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Aplicar configuración</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

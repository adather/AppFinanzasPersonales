import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Sparkles, Check, AlertCircle, Loader2, X, HelpCircle, Bot, RefreshCw } from 'lucide-react';
import { CategoryName, Transaction, GeminiModelId, AVAILABLE_GEMINI_MODELS } from '../types';

interface VerbalExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  selectedModel?: GeminiModelId;
}

export const VerbalExpenseModal: React.FC<VerbalExpenseModalProps> = ({
  isOpen,
  onClose,
  onAddTransaction,
  selectedModel = 'gemini-3.8-flash',
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingPrompt, setMissingPrompt] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<{ role: 'user' | 'agent'; text: string }[]>([]);

  const modelMeta = AVAILABLE_GEMINI_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_GEMINI_MODELS[0];
  const recognitionRef = useRef<any>(null);

  // Extracted transaction proposal
  const [proposal, setProposal] = useState<{
    fecha: string;
    concepto: string;
    cantidad: number;
    categoria: CategoryName;
    lugar: string;
  } | null>(null);

  useEffect(() => {
    // Setup Web Speech API if supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'es-ES';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsRecording(false);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  if (!isOpen) return null;

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      setError('El reconocimiento de voz no está disponible en este navegador. Puedes escribir tu gasto directamente.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setError(null);
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Recording start error', err);
        setIsRecording(false);
      }
    }
  };

  const handleSend = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim()) return;

    setIsProcessing(true);
    setError(null);

    const updatedHistory = [...conversationHistory, { role: 'user' as const, text: textToSend }];
    setConversationHistory(updatedHistory);
    setInputText('');

    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch('/api/gemini/parse-verbal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: updatedHistory.map(h => `${h.role === 'user' ? 'Usuario' : 'Agente'}: ${h.text}`).join('\n'),
          currentDate: today,
          model: selectedModel,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Error al procesar el mensaje.');
      }

      const data = json.data;

      // Check if missing details need to be requested
      if (data.isComplete === false && data.missingDetailsPrompt) {
        setMissingPrompt(data.missingDetailsPrompt);
        setConversationHistory([
          ...updatedHistory,
          { role: 'agent', text: data.missingDetailsPrompt },
        ]);
        setProposal(null);
      } else {
        // Complete data extracted
        setMissingPrompt(null);
        setProposal({
          fecha: data.fecha || today,
          concepto: data.concepto || 'Gasto registrado',
          cantidad: Number(data.cantidad) || 0,
          categoria: (data.categoria as CategoryName) || 'Otros',
          lugar: data.lugar || data.concepto || 'Comercio local',
        });
        setConversationHistory([
          ...updatedHistory,
          {
            role: 'agent',
            text: `¡Listo! He clasificado tu gasto de $${Number(data.cantidad) || 0} en "${data.concepto || data.lugar}" bajo la categoría "${data.categoria || 'Otros'}". ¿Deseas confirmarlo?`,
          },
        ]);
      }
    } catch (err: any) {
      setError(err.message || 'Error al comunicarse con el asistente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSave = () => {
    if (!proposal || proposal.cantidad <= 0) return;
    onAddTransaction({
      date: proposal.fecha,
      concept: proposal.concepto,
      merchant: proposal.lugar || proposal.concepto,
      amount: proposal.cantidad,
      category: proposal.categoria,
      rawSource: 'verbal',
      note: 'Registrado mediante dictado / lenguaje natural',
    });
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setInputText('');
    setProposal(null);
    setMissingPrompt(null);
    setConversationHistory([]);
    setError(null);
    setIsProcessing(false);
  };

  const quickExamples = [
    'Me compré un café latte de $85 en Starbucks hoy',
    'Ayer gasté 650 en la despensa de Chedraui',
    'Pagué 380 en Farmacia del Ahorro el lunes',
    'Gasté 250 en tacos con mis amigos anoche',
  ];

  return (
    <div id="verbal-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div id="verbal-modal-card" className="bg-paper rounded-lg shadow-xl border border-rule w-full max-w-xl overflow-hidden my-8 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rule">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md border border-rule text-insight flex items-center justify-center">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg text-ink">Registro de Gasto Verbal o Rápido</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-ink-muted border border-rule">
                  <Sparkles className="w-3 h-3 text-insight" />
                  {modelMeta.name}
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                Dicta o escribe en tus propias palabras; el agente solicitará detalles si faltan
              </p>
            </div>
          </div>
          <button
            id="close-verbal-modal-btn"
            onClick={onClose}
            className="p-2 text-ink-muted hover:text-ink rounded-md hover:bg-surface transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Conversational timeline */}
          {conversationHistory.length > 0 ? (
            <div className="space-y-3 max-h-56 overflow-y-auto p-3 border border-rule rounded-md">
              {conversationHistory.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-md px-4 py-2.5 text-sm ${
                      item.role === 'user'
                        ? 'bg-ink text-paper'
                        : 'bg-paper text-ink border border-rule'
                    }`}
                  >
                    {item.role === 'agent' && (
                      <div className="flex items-center gap-1.5 text-[10px] text-insight mb-1">
                        <Sparkles className="w-3 h-3" />
                        Agente IA
                      </div>
                    )}
                    {item.text}
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-paper text-ink-muted text-xs px-3 py-2 rounded-md border border-rule flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-insight" />
                    Interpretando detalles...
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-ink-muted">
                Ejemplos que puedes probar o dictar:
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {quickExamples.map((ex, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setInputText(ex);
                      handleSend(ex);
                    }}
                    className="text-left text-xs text-ink-muted hover:text-ink border border-rule hover:border-ink/40 rounded-md px-3 py-2 transition flex items-center justify-between group cursor-pointer"
                  >
                    <span>"{ex}"</span>
                    <Sparkles className="w-3 h-3 text-insight opacity-0 group-hover:opacity-100 transition" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Missing details indicator */}
          {missingPrompt && (
            <div className="p-3 border border-insight/30 rounded-md flex items-start gap-2 text-ink">
              <HelpCircle className="w-4 h-4 shrink-0 text-insight mt-0.5" />
              <div>
                <span className="font-medium">Detalles requeridos: </span>
                <span className="text-ink-muted">{missingPrompt}</span>
              </div>
            </div>
          )}

          {/* Extracted Proposal Confirmation Card */}
          {proposal && (
            <div className="p-4 border border-rule rounded-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gain flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Transacción lista para registrar
                </span>
                <span className="font-display text-xl text-ink">
                  ${proposal.cantidad.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs border-t border-rule pt-3">
                <div>
                  <span className="text-ink-muted block mb-0.5">Concepto</span>
                  <span className="text-ink">{proposal.concepto}</span>
                </div>
                <div>
                  <span className="text-ink-muted block mb-0.5">Categoría</span>
                  <span className="text-ink">{proposal.categoria}</span>
                </div>
                <div>
                  <span className="text-ink-muted block mb-0.5">Lugar / Comercio</span>
                  <span className="text-ink">{proposal.lugar}</span>
                </div>
                <div>
                  <span className="text-ink-muted block mb-0.5">Fecha</span>
                  <span className="font-mono text-ink">{proposal.fecha}</span>
                </div>
              </div>
            </div>
          )}

          {/* Input control with Mic and Send */}
          <div className="relative flex items-center gap-2">
            <button
              id="toggle-mic-btn"
              type="button"
              onClick={toggleRecording}
              className={`p-3 rounded-md border transition shrink-0 cursor-pointer ${
                isRecording
                  ? 'border-loss/40 text-loss'
                  : 'border-rule text-ink-muted hover:text-ink'
              }`}
              title={isRecording ? 'Detener grabación' : 'Dictar por voz'}
            >
              {isRecording ? (
                <span className="relative flex items-center justify-center">
                  <span className="absolute w-2 h-2 rounded-full bg-loss animate-pulse -top-1 -right-1" />
                  <MicOff className="w-5 h-5" />
                </span>
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
            <input
              id="verbal-expense-input"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                missingPrompt
                  ? 'Responde con la fecha, monto o lugar que faltan...'
                  : 'Ej: "Ayer pagué 350 de súper en Walmart"...'
              }
              className="flex-1 px-4 py-2.5 text-sm border border-rule bg-paper text-ink rounded-md focus:ring-1 focus:ring-ink focus:outline-none"
            />
            <button
              id="send-verbal-expense-btn"
              type="button"
              disabled={!inputText.trim() || isProcessing}
              onClick={() => handleSend()}
              className="p-2.5 bg-ink hover:bg-ink/85 disabled:opacity-40 text-paper rounded-md transition shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="p-3 border border-loss/30 rounded-md text-loss text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              {conversationHistory.length > 0 && !isProcessing && (
                <button
                  type="button"
                  id="retry-verbal-btn"
                  onClick={() => {
                    const lastUserMsg = [...conversationHistory].reverse().find(m => m.role === 'user');
                    if (lastUserMsg) {
                      handleSend(lastUserMsg.text);
                    }
                  }}
                  className="px-2.5 py-1 border border-loss/40 text-loss hover:bg-loss/10 rounded-md text-xs font-medium flex items-center justify-center gap-1 transition shrink-0 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reintentar
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-rule">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-ink-muted hover:text-ink font-medium cursor-pointer"
          >
            Reiniciar conversación
          </button>
          <div className="flex items-center gap-3">
            <button
              id="cancel-verbal-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium border border-rule text-ink-muted hover:text-ink rounded-md transition cursor-pointer"
            >
              Cerrar
            </button>
            {proposal && (
              <button
                id="confirm-verbal-save-btn"
                type="button"
                onClick={handleConfirmSave}
                className="px-5 py-2 text-sm font-medium text-paper bg-ink hover:bg-ink/85 rounded-md transition flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" /> Registrar Gasto
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

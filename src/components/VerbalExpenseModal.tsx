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
      <div id="verbal-modal-card" className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden my-8 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 flex items-center justify-center">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 dark:text-white text-lg">Registro de Gasto Verbal o Rápido</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-400 border border-transparent dark:border-blue-900/20">
                  <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  {modelMeta.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dicta o escribe en tus propias palabras; el agente solicitará detalles si faltan
              </p>
            </div>
          </div>
          <button
            id="close-verbal-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Conversational timeline */}
          {conversationHistory.length > 0 ? (
            <div className="space-y-3 max-h-56 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/70 dark:border-slate-800/80">
              {conversationHistory.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      item.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800/80 shadow-2xs rounded-bl-xs'
                    }`}
                  >
                    {item.text}
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800/80 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
                    Interpretando detalles...
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
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
                    className="text-left text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 hover:bg-blue-50/70 dark:hover:bg-blue-950/30 hover:text-blue-700 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 transition flex items-center justify-between group cursor-pointer"
                  >
                    <span>"{ex}"</span>
                    <Sparkles className="w-3 h-3 text-slate-400 dark:text-slate-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Missing details indicator */}
          {missingPrompt && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl flex items-start gap-2 text-amber-800 dark:text-amber-400">
              <HelpCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <span className="font-semibold">Detalles requeridos: </span>
                <span>{missingPrompt}</span>
              </div>
            </div>
          )}

          {/* Extracted Proposal Confirmation Card */}
          {proposal && (
            <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Transacción Lista para Registrar
                </span>
                <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  ${proposal.cantidad.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block">Concepto:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{proposal.concepto}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block">Categoría:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{proposal.categoria}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block">Lugar / Comercio:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{proposal.lugar}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block">Fecha:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{proposal.fecha}</span>
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
              className={`p-3 rounded-xl transition shrink-0 cursor-pointer ${
                isRecording
                  ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-200 dark:shadow-none'
                  : 'bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
              title={isRecording ? 'Detener grabación' : 'Dictar por voz'}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
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
              className="flex-1 px-4 py-2.5 text-sm border border-slate-300 dark:border-slate-850 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button
              id="send-verbal-expense-btn"
              type="button"
              disabled={!inputText.trim() || isProcessing}
              onClick={() => handleSend()}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition shrink-0 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reintentar
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white font-medium cursor-pointer"
          >
            Reiniciar conversación
          </button>
          <div className="flex items-center gap-3">
            <button
              id="cancel-verbal-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
            >
              Cerrar
            </button>
            {proposal && (
              <button
                id="confirm-verbal-save-btn"
                type="button"
                onClick={handleConfirmSave}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
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

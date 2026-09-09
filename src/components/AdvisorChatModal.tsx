import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, X, Bot, User, Loader2, Lightbulb, TrendingDown, HelpCircle } from 'lucide-react';
import { ChatMessage, Transaction, CategoryStat, GeminiModelId, AVAILABLE_GEMINI_MODELS } from '../types';

interface AdvisorChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  categoryStats: CategoryStat[];
  totalSpent: number;
  initialMessage?: string;
  selectedModel?: GeminiModelId;
  onOpenModelSelector?: () => void;
}

export const AdvisorChatModal: React.FC<AdvisorChatModalProps> = ({
  isOpen,
  onClose,
  transactions,
  categoryStats,
  totalSpent,
  initialMessage,
  selectedModel = 'gemini-3.8-flash',
  onOpenModelSelector,
}) => {
  const modelMeta = AVAILABLE_GEMINI_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_GEMINI_MODELS[0];
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content:
        '¡Hola! Soy tu asesor experto en análisis financiero y economía conductual (Behavioral Economics). Mi objetivo es ayudarte a entender por qué gastas como gastas, detectar patrones como el "Efecto Viernes" o compras por gratificación instantánea, y sugerirte nudges para ahorrar sin sentir privaciones. ¿En qué hábito o categoría te gustaría que profundicemos hoy?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialMessage && isOpen) {
      handleSend(initialMessage);
    }
  }, [isOpen, initialMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const userText = textToSend || input;
    if (!userText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const financialContext = {
        totalSpent,
        categories: categoryStats.map((c) => ({
          name: c.category,
          total: c.total,
          budget: c.budget,
          percent: c.budgetPercent,
          trend: c.trend,
        })),
        recentTransactions: transactions.slice(0, 10).map((t) => ({
          date: t.date,
          concept: t.concept,
          amount: t.amount,
          category: t.category,
          isAnomaly: t.isAnomaly,
        })),
      };

      const res = await fetch('/api/gemini/chat-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          financialContext,
          model: selectedModel,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Error al comunicarse con el asesor.');
      }

      const botMessage: ChatMessage = {
        id: `m-${Date.now()}`,
        role: 'model',
        content: json.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          content: 'Disculpa, ocurrió un error al procesar la respuesta. Por favor intenta de nuevo.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const samplePrompts = [
    '¿Por qué gasto tanto los viernes en cafeterías?',
    '¿Cómo puedo recortar un 10% sin sentir que me privo?',
    'Explícame la anomalía en compras de ropa',
    'Dame un nudge conductual para controlar compras online',
  ];

  return (
    <div id="advisor-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div id="advisor-modal-card" className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl h-[620px] flex flex-col overflow-hidden my-4 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 dark:text-white text-base">Asesor de Behavioral Economics</h3>
                <button
                  type="button"
                  onClick={onOpenModelSelector}
                  title="Cambiar modelo de IA"
                  className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-950/80 px-2 py-0.5 rounded-full transition flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  {modelMeta.shortName}
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pregunta sobre tus gastos, sesgos cognitivos o arquitectura de decisiones
              </p>
            </div>
          </div>
          <button
            id="close-advisor-chat-btn"
            onClick={onClose}
            className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/40 dark:bg-slate-950/20">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'model' && (
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-2xs ${
                  m.role === 'user'
                    ? 'bg-slate-900 dark:bg-slate-800 text-white rounded-br-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-800/80 rounded-bl-xs'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
                <div
                  className={`text-[10px] mt-1.5 font-mono ${
                    m.role === 'user' ? 'text-slate-400 dark:text-slate-500 text-right' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>

              {m.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800/80 rounded-2xl px-4 py-2.5 text-xs flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
                El asesor está formulando una recomendación conductual...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-6 py-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 shrink-0 flex items-center gap-1">
            <Lightbulb className="w-3 h-3 text-amber-500" /> Sugerencias:
          </span>
          {samplePrompts.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(p)}
              className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 whitespace-nowrap transition cursor-pointer"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <input
            id="advisor-chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Escribe tu duda sobre tus patrones de gasto o economía conductual..."
            className="flex-1 px-4 py-2.5 text-sm border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
          <button
            id="send-advisor-chat-btn"
            type="button"
            disabled={!input.trim() || isLoading}
            onClick={() => handleSend()}
            className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl transition shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

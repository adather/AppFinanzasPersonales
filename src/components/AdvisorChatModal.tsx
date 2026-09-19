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
      <div id="advisor-modal-card" className="bg-paper rounded-lg shadow-xl border border-rule w-full max-w-2xl h-[620px] flex flex-col overflow-hidden my-4 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rule">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md border border-rule text-insight flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg text-ink">Asesor de Behavioral Economics</h3>
                <button
                  type="button"
                  onClick={onOpenModelSelector}
                  title="Cambiar modelo de IA"
                  className="text-[10px] font-medium text-ink-muted hover:text-ink border border-rule px-2 py-0.5 rounded-md transition flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-2.5 h-2.5 text-insight" />
                  {modelMeta.shortName}
                </button>
              </div>
              <p className="text-xs text-ink-muted">
                Pregunta sobre tus gastos, sesgos cognitivos o arquitectura de decisiones
              </p>
            </div>
          </div>
          <button
            id="close-advisor-chat-btn"
            onClick={onClose}
            className="p-2 text-ink-muted hover:text-ink rounded-md hover:bg-surface transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'model' && (
                <div className="w-8 h-8 rounded-md border border-rule text-insight flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[82%] rounded-md px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-ink text-paper'
                    : 'bg-paper text-ink border border-rule'
                }`}
              >
                {m.role === 'model' && (
                  <div className="flex items-center gap-1.5 text-[10px] text-insight mb-1.5">
                    <Sparkles className="w-3 h-3" />
                    Respuesta del asesor IA
                  </div>
                )}
                <div className="whitespace-pre-wrap">{m.content}</div>
                <div
                  className={`text-[10px] mt-1.5 font-mono ${
                    m.role === 'user' ? 'text-paper/60 text-right' : 'text-ink-muted'
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>

              {m.role === 'user' && (
                <div className="w-8 h-8 rounded-md border border-rule text-ink-muted flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-8 h-8 rounded-md border border-rule text-insight flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-paper text-ink-muted border border-rule rounded-md px-4 py-2.5 text-xs flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-insight" />
                El asesor está formulando una recomendación conductual...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-6 py-2 border-t border-rule flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] text-ink-muted shrink-0 flex items-center gap-1">
            <Lightbulb className="w-3 h-3 text-insight" /> Sugerencias:
          </span>
          {samplePrompts.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(p)}
              className="text-[11px] text-ink-muted hover:text-ink border border-rule hover:border-ink/40 rounded-md px-2.5 py-1 whitespace-nowrap transition cursor-pointer"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-rule flex items-center gap-2">
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
            className="flex-1 px-4 py-2.5 text-sm border border-rule bg-paper text-ink rounded-md focus:ring-1 focus:ring-ink focus:outline-none"
          />
          <button
            id="send-advisor-chat-btn"
            type="button"
            disabled={!input.trim() || isLoading}
            onClick={() => handleSend()}
            className="p-2.5 bg-ink hover:bg-ink/85 disabled:opacity-40 text-paper rounded-md transition shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

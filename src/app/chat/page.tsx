'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { TalentCard, type TalentCardData } from '@/components/chat/talent-card';
import { ContentCardStrip, type ContentCardData } from '@/components/chat/content-card';
import { MessageErrorBoundary } from '@/components/chat/message-error-boundary';

// ── Types ───────────────────────────────

interface Attachment {
  type: 'talent_card' | 'content_card';
  data: TalentCardData | ContentCardData;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
  meta?: {
    confidence?: string;
    followUp?: string;
    references?: any[];
  };
}

// ── Constants ───────────────────────────

const WELCOME_MESSAGE_ID = 'welcome-initial';

const WELCOME_MESSAGE: Message = {
  id: WELCOME_MESSAGE_ID,
  role: 'assistant',
  content: 'היי! 👋 אני העוזר החכם של ישראל בידור. יש לי גישה לכל התוכן — פוסטים, הייליטס וסרטונים מתומללים. שאל אותי כל דבר!',
  timestamp: new Date(),
  meta: { followUp: '' },
};

const INITIAL_ACTIONS = ['מה הפוסטים הפופולריים? 🔥', 'ספר לי על ישראל בידור', 'מה הנושאים העיקריים? 🎯'];

// ── Component ───────────────────────────

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ── API call ───────────────────────────

  const handleSend = async (text?: string) => {
    const messageText = (text || input).trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          history: messages
            .filter((m) => m.id !== WELCOME_MESSAGE_ID)
            .map((m) => ({
              role: m.role === 'user' ? 'user' : 'model',
              parts: [{ text: m.content }],
            })),
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || data.message || 'שגיאה כללית');
      }

      const aiMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply ?? '',
        timestamp: new Date(data.timestamp ?? Date.now()),
        attachments: data.attachments ?? [],
        meta: data.meta ?? {},
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('[Chat] error:', error);
      toast.error('משהו השתבש, נסה שוב 🙏');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Key handler ────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Suggested actions ──────────────────

  function buildSuggestions(msg: Message, isLast: boolean): string[] {
    if (!isLast || msg.role !== 'assistant') return [];
    if (msg.id === WELCOME_MESSAGE_ID) return INITIAL_ACTIONS;
    const followUp = msg.meta?.followUp?.trim();
    return followUp ? [followUp] : [];
  }

  // ── Render ─────────────────────────────

  return (
    <div dir="rtl" className="min-h-screen font-sans flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      {/* רקע פרימיום עדין למסך הצ'אט */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[40rem] h-[40rem] bg-indigo-500/10 dark:bg-indigo-900/20 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-lighten"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-fuchsia-500/10 dark:bg-fuchsia-900/20 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-lighten"></div>
      </div>

      {/* Header - Glassmorphism עמוק */}
      <header className="sticky top-0 z-50 bg-white/60 dark:bg-slate-950/60 backdrop-blur-2xl border-b border-white/50 dark:border-white/5 shadow-sm shadow-indigo-500/5">
        <div className="max-w-2xl mx-auto flex items-center justify-between p-4 h-18">
          <Link
            href="/"
            className="flex items-center justify-center w-11 h-11 rounded-full bg-white/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-300 shadow-sm"
          >
            <span className="text-xl text-slate-700 dark:text-slate-300 hover:-translate-x-1 transition-transform">←</span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="text-center">
              <h1 className="text-lg font-black bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-orange-500 bg-clip-text text-transparent">
                ישראל בידור AI
              </h1>
              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">מחובר ומוכן</span>
              </div>
            </div>
            
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-fuchsia-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                <span className="text-xl">🤖</span>
              </div>
            </div>
          </div>
          
          <div className="w-11" /> {/* Spacer for flex centering */}
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto pb-40 relative z-10 scroll-smooth custom-scrollbar">
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
          {/* Date Badge */}
          <div className="flex justify-center mb-8">
            <span className="px-4 py-1.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-full text-[11px] font-bold tracking-wide text-slate-500 dark:text-slate-400 border border-white/40 dark:border-white/5 shadow-sm">
              {new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>

          <AnimatePresence mode="popLayout">
            {messages.map((msg, index) => {
              const isLast = index === messages.length - 1;
              const suggestions = buildSuggestions(msg, isLast);

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4, type: "spring", stiffness: 250, damping: 25 }}
                  layout
                >
                  {msg.role === 'assistant' ? (
                    // עיצוב הודעת AI
                    <div className="flex items-start gap-3 max-w-[92%] md:max-w-[85%]">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white shadow-md shrink-0 mt-1">
                        <span className="text-sm">✨</span>
                      </div>
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mr-2">ישראל בידור AI</span>
                        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-4 md:p-5 rounded-3xl rounded-tr-sm shadow-sm border border-white/60 dark:border-white/5">
                          <p className="text-[15px] leading-relaxed whitespace-pre-line text-slate-800 dark:text-slate-200 font-medium">
                            {msg.content}
                          </p>
                        </div>

                        {/* Attachments Area — compact inline links */}
                        {msg.attachments && msg.attachments.length > 0 && isLast && (
                          <div className="flex flex-col gap-2 mt-2 max-w-full">
                            <MessageErrorBoundary>
                              {msg.attachments
                                .filter((a) => a.type === 'talent_card')
                                .slice(0, 1)
                                .map((a, i) => (
                                  <TalentCard key={`tc-${i}`} data={a.data as TalentCardData} />
                                ))}
                            </MessageErrorBoundary>

                            <MessageErrorBoundary>
                              <ContentCardStrip
                                items={msg.attachments
                                  .filter((a) => a.type === 'content_card')
                                  .slice(0, 2)
                                  .map((a) => a.data as ContentCardData)}
                                title="פוסטים קשורים"
                                onAskAbout={handleSend}
                              />
                            </MessageErrorBoundary>
                          </div>
                        )}

                        {/* הצעות פעולה (Suggestions) */}
                        {suggestions.length > 0 && (
                          <motion.div
                            className="flex gap-2 mt-3 flex-wrap"
                            initial="hidden"
                            animate="visible"
                            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
                          >
                            {suggestions.map((action) => (
                              <motion.button
                                key={action}
                                variants={{
                                  hidden: { opacity: 0, y: 10 },
                                  visible: { opacity: 1, y: 0 },
                                }}
                                onClick={() => handleSend(action)}
                                className="px-5 py-2.5 bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-700 backdrop-blur-md border border-indigo-100 dark:border-slate-700 rounded-full text-[13px] font-bold text-indigo-700 dark:text-indigo-300 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95"
                              >
                                {action}
                              </motion.button>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    </div>
                  ) : (
                    // עיצוב הודעת משתמש
                    <div className="flex justify-end">
                      <div className="max-w-[85%]">
                        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 text-white p-4 md:p-5 rounded-3xl rounded-tl-sm shadow-lg shadow-indigo-500/25">
                          <p className="text-[15px] leading-relaxed whitespace-pre-line font-medium">{msg.content}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* אנימציית טעינה (Skeleton) כשהבוט חושב */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 max-w-[92%]"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center shrink-0 mt-1 animate-pulse"></div>
              <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-5 rounded-3xl rounded-tr-sm shadow-sm border border-white/40 dark:border-white/5 min-w-[120px]">
                <div className="flex gap-1.5 items-center justify-center h-4">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-fuchsia-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} className="h-4" />
        </div>
      </main>

      {/* אזור הקלדה צף - Floating Input Bar */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent dark:from-slate-950 dark:via-slate-950/90 pb-8 md:pb-8 pointer-events-none"
      >
        <div className="max-w-2xl mx-auto pointer-events-auto">
          <div className="relative flex items-center p-1.5 shadow-2xl shadow-indigo-500/10 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 focus-within:ring-4 focus-within:ring-indigo-500/20 focus-within:border-indigo-300 dark:focus-within:border-indigo-500/50 transition-all duration-300">
            <input
              dir="rtl"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="שאל אותי משהו, למשל: על מה מדברים היום?"
              className="w-full h-12 md:h-14 pr-6 pl-16 rounded-full bg-transparent border-none focus:outline-none focus:ring-0 text-[15px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
              disabled={isLoading}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="absolute left-1.5 md:left-2 w-10 h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-tr from-indigo-600 to-fuchsia-500 text-white flex items-center justify-center disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all duration-300 shadow-md shadow-indigo-500/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 md:w-6 md:h-6 -rotate-90">
                <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95l14.095-5.633a.75.75 0 0 0 0-1.394L3.105 2.288Z" />
              </svg>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
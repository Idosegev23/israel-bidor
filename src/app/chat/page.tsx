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
  content: 'היי! 👋 אני העוזר החכם של ישראל בידור. יש לי גישה לכל התוכן שלו — פוסטים, הייליטס וסרטונים מתומללים. שאל אותי כל דבר!',
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
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-violet-50/50 via-zinc-50 to-orange-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-violet-950/50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
        <div className="max-w-lg mx-auto flex items-center justify-between p-4 h-16">
          <Link
            href="/"
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <span className="text-xl">←</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-orange-500 flex items-center justify-center text-white shadow-md">
                <span className="text-lg">🤖</span>
              </div>
              <div className="absolute bottom-0 left-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-zinc-950" />
            </div>
            <div className="text-center">
              <h1 className="text-base font-bold bg-gradient-to-r from-violet-700 to-orange-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-orange-400">
                ישראל בידור AI
              </h1>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">🟢 מחובר ומוכן</span>
            </div>
          </div>

          <div className="w-10" />
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto pb-36">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
          {/* Date */}
          <div className="flex justify-center">
            <span className="px-3 py-1 bg-white/60 dark:bg-zinc-800/50 backdrop-blur-sm rounded-full text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>

          {/* Message list */}
          <AnimatePresence mode="popLayout">
            {messages.map((msg, index) => {
              const isLast = index === messages.length - 1;
              const suggestions = buildSuggestions(msg, isLast);

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  layout
                >
                  {msg.role === 'assistant' ? (
                    <div className="flex items-start gap-3 max-w-[92%]">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-orange-500 flex items-center justify-center text-white shadow-md shrink-0 mt-0.5">
                        <span className="text-sm">🤖</span>
                      </div>
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <span className="text-[11px] font-medium text-zinc-400 mr-1">ישראל בידור AI</span>
                        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm p-4 rounded-2xl rounded-tr-sm shadow-soft border border-zinc-100/80 dark:border-zinc-800/80">
                          <p className="text-sm leading-relaxed whitespace-pre-line text-zinc-800 dark:text-zinc-200">
                            {msg.content}
                          </p>
                        </div>

                        {/* Attachments */}
                        {msg.attachments && msg.attachments.length > 0 && isLast && (
                          <div className="flex flex-col gap-2 mt-1 max-w-[90%]">
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
                                  .slice(0, 4)
                                  .map((a) => a.data as ContentCardData)}
                                title="תוכן שכדאי לך לראות"
                                onAskAbout={handleSend}
                              />
                            </MessageErrorBoundary>
                          </div>
                        )}

                        {/* Suggested actions / follow-up */}
                        {suggestions.length > 0 && (
                          <motion.div
                            className="flex gap-2 mt-2 flex-wrap"
                            initial="hidden"
                            animate="visible"
                            variants={{
                              visible: { transition: { staggerChildren: 0.08 } },
                            }}
                          >
                            {suggestions.map((action) => (
                              <motion.button
                                key={action}
                                variants={{
                                  hidden: { opacity: 0, y: 8 },
                                  visible: { opacity: 1, y: 0 },
                                }}
                                onClick={() => handleSend(action)}
                                className="px-4 py-2 bg-violet-500/10 hover:bg-violet-500/20 dark:bg-violet-400/15 dark:hover:bg-violet-400/25 rounded-full text-sm font-medium text-violet-700 dark:text-violet-300 transition-colors active:scale-95"
                              >
                                {action}
                              </motion.button>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <div className="max-w-[85%]">
                        <div className="bg-gradient-to-br from-violet-600 to-violet-700 text-white p-4 rounded-2xl rounded-tl-sm shadow-lg shadow-violet-500/20">
                          <p className="text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Skeleton loader */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 max-w-[92%]"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-orange-500 flex items-center justify-center text-white shadow-md shrink-0 mt-0.5 opacity-70">
                <span className="text-sm">🤖</span>
              </div>
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm p-4 rounded-2xl rounded-tr-sm shadow-soft border border-zinc-100/80 dark:border-zinc-800/80">
                  <div className="space-y-2.5">
                    <div className="h-3 skeleton-shimmer rounded-full w-[85%]" />
                    <div className="h-3 skeleton-shimmer rounded-full w-[65%]" style={{ animationDelay: '150ms' }} />
                    <div className="h-3 skeleton-shimmer rounded-full w-[45%]" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-48 h-24 skeleton-shimmer rounded-xl" style={{ animationDelay: '200ms' }} />
                  <div className="w-48 h-24 skeleton-shimmer rounded-xl" style={{ animationDelay: '400ms' }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input area */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-zinc-950 dark:via-zinc-950/95 z-20 p-6 pt-12"
      >
        <div className="max-w-lg mx-auto">
          <div className="relative flex items-center shadow-lg shadow-violet-500/5 rounded-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800">
            <input
              dir="rtl"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="שאל אותי כל דבר על ישראל בידור..."
              className="w-full h-14 pr-5 pl-14 rounded-full bg-transparent border-none focus:ring-2 focus:ring-violet-500/20 text-sm placeholder:text-zinc-400"
              disabled={isLoading}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="absolute left-2 w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-violet-700 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:from-violet-700 hover:to-violet-800 active:scale-95 transition-all shadow-md shadow-violet-500/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 rotate-180">
                <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95l14.095-5.633a.75.75 0 0 0 0-1.394L3.105 2.288Z" />
              </svg>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

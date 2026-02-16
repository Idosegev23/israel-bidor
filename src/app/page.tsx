'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-orange-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-violet-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          {/* Logo/Image */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8"
          >
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-orange-500 rounded-[3rem] blur-3xl opacity-30 animate-pulse"></div>
              <img
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRtRzqtO7L2aeb5BNk4HGSP7hBi7-xjfS4wYQ&s"
                alt="Israel Bidur"
                className="relative h-40 md:h-48 mx-auto rounded-[3rem] shadow-2xl ring-4 ring-white dark:ring-zinc-800 object-cover"
              />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-violet-600 via-purple-600 to-orange-500 bg-clip-text text-transparent leading-tight"
          >
            ישראל בידור
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="text-xl md:text-2xl text-zinc-700 dark:text-zinc-300 mb-4 leading-relaxed font-medium"
          >
            הבוט החכם שלך לכל מה שקורה אצל ישראל בידור 🎬
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="text-base md:text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto"
          >
            שאל אותי כל דבר על התוכן, הפוסטים והסרטונים האחרונים 💬
          </motion.p>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
          className="flex justify-center"
        >
          <Link
            href="/chat"
            className="group relative inline-flex items-center justify-center gap-3 px-10 py-5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-[2rem] font-bold text-xl shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/50 transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <span className="text-3xl group-hover:rotate-12 transition-transform">💬</span>
            <span>בואו נדבר!</span>
            <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-r from-violet-400 to-purple-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity"></div>
          </Link>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.2 }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="text-center p-6 rounded-2xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800">
            <div className="text-4xl mb-3">🎥</div>
            <h3 className="font-bold text-zinc-900 dark:text-zinc-50 mb-2">תוכן מלא</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">גישה לכל הפוסטים, הייליטס וסרטונים מתומללים</p>
          </div>

          <div className="text-center p-6 rounded-2xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800">
            <div className="text-4xl mb-3">🤖</div>
            <h3 className="font-bold text-zinc-900 dark:text-zinc-50 mb-2">AI חכם</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">מופעל על ידי Gemini 3 Pro - תשובות מדויקות ומהירות</p>
          </div>

          <div className="text-center p-6 rounded-2xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800">
            <div className="text-4xl mb-3">⚡</div>
            <h3 className="font-bold text-zinc-900 dark:text-zinc-50 mb-2">תמיד עדכני</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">מעודכן באופן קבוע עם התוכן האחרון</p>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.4 }}
          className="mt-12 text-center text-sm text-zinc-500 dark:text-zinc-400"
        >
          <p>© 2026 Israel Bidur Bot - Powered by Gemini AI</p>
        </motion.div>
      </div>
    </div>
  );
}

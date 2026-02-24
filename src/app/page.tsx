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
    // שינוי קריטי ברקע: שימוש בגרדיאנט קוני מורכב ליצירת עומק ואווירת פרימיום
    <div 
      dir="rtl" 
      className="min-h-screen flex items-center justify-center p-4 md:p-8 font-sans overflow-hidden
      bg-[conic-gradient(at_top,_var(--tw-gradient-stops))] from-orange-50 via-slate-50 to-indigo-100
      dark:bg-[conic-gradient(at_top,_var(--tw-gradient-stops))] dark:from-slate-950 dark:via-indigo-950/30 dark:to-slate-950"
    >
      {/* אלמנטי רקע מרחפים להוספת אווירה */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-purple-500/20 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-soft-light animate-blob"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-orange-500/20 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-soft-light animate-blob animation-delay-2000"></div>
      </div>

      <div className="max-w-3xl w-full relative z-10">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-14"
        >
          {/* Logo/Image area */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1, type: "spring" }}
            className="mb-10 relative"
          >
             <div className="relative inline-block">
              {/* אפקט הילה חזק יותר מאחורי התמונה */}
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600 to-pink-500 rounded-[3rem] blur-2xl opacity-30 animate-pulse scale-110"></div>
              {/* Placeholder for high-res image - החלף בתמונה האיכותית שלך */}
              <img
                src="https://via.placeholder.com/220x220/4F46E5/FFFFFF?text=Israel+Bidur" 
                alt="Israel Bidur"
                className="relative h-48 w-48 md:h-56 md:w-56 mx-auto rounded-[2.5rem] shadow-2xl shadow-indigo-500/20 ring-4 ring-white/90 dark:ring-white/10 object-cover backdrop-blur-md"
              />
            </div>
          </motion.div>

          {/* Title - גרדיאנט "תכשיט" עשיר יותר */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-6xl md:text-8xl font-black mb-6 leading-tight tracking-tight bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-orange-400 bg-clip-text text-transparent drop-shadow-sm"
          >
            ישראל בידור
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-xl md:text-3xl text-slate-700 dark:text-slate-200 mb-4 leading-relaxed font-bold"
          >
            הבוט החכם שלך לכל מה שקורה אצל ישראל בידור <span className="inline-block animate-bounce">🎬</span>
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-xl mx-auto font-medium"
          >
            שאל אותי כל דבר על התוכן, הפוסטים והסרטונים האחרונים
          </motion.p>
        </motion.div>

        {/* CTA Button - כפתור ראשי עם גרדיאנט יוקרתי וצל זוהר */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6, type: "spring", stiffness: 200 }}
          className="flex justify-center"
        >
          <Link
            href="/chat"
            className="group relative inline-flex items-center justify-center gap-4 px-14 py-6 rounded-full font-black text-2xl text-white transition-all duration-300 
            bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-800
            hover:scale-105 hover:shadow-[0_20px_35px_-15px_rgba(79,70,229,0.45)] active:scale-95"
          >
            <span className="text-3xl group-hover:rotate-12 transition-transform duration-300">✨</span>
            <span className="relative z-10">בואו נדבר!</span>
            {/* שכבת ברק נוספת במעבר עכבר */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-t from-white/0 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </Link>
        </motion.div>

        {/* Features - Glassmorphism משודרג */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8"
        >
          {/* Feature 1 */}
          <div className="text-center p-8 rounded-[2rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-xl shadow-indigo-100/30 dark:shadow-none hover:-translate-y-2 transition-all duration-300 group">
            <div className="text-5xl mb-5 bg-gradient-to-br from-indigo-500 to-purple-500 bg-clip-text text-transparent group-hover:scale-110 transition-transform">🎥</div>
            <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-3">תוכן מלא</h3>
            <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed font-medium">גישה לכל הפוסטים, הייליטס וסרטונים מתומללים</p>
          </div>

           {/* Feature 2 */}
          <div className="text-center p-8 rounded-[2rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-xl shadow-indigo-100/30 dark:shadow-none hover:-translate-y-2 transition-all duration-300 group">
            <div className="text-5xl mb-5 bg-gradient-to-br from-purple-500 to-pink-500 bg-clip-text text-transparent group-hover:scale-110 transition-transform">🤖</div>
            <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-3">AI חכם</h3>
            <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed font-medium">מופעל על ידי Gemini 3.1 Pro - תשובות מדויקות ומהירות</p>
          </div>

           {/* Feature 3 */}
          <div className="text-center p-8 rounded-[2rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-xl shadow-indigo-100/30 dark:shadow-none hover:-translate-y-2 transition-all duration-300 group">
            <div className="text-5xl mb-5 bg-gradient-to-br from-pink-500 to-orange-500 bg-clip-text text-transparent group-hover:scale-110 transition-transform">⚡</div>
            <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-3">תמיד עדכני</h3>
            <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed font-medium">מעודכן באופן קבוע עם התוכן האחרון והחם ביותר</p>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.2 }}
          className="mt-20 text-center text-sm font-semibold text-slate-500 dark:text-slate-600/80"
        >
          <p>© 2026 Israel Bidur Bot - Powered by Gemini AI</p>
        </motion.div>
      </div>
    </div>
  );
}
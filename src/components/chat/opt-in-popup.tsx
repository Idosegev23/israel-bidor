'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OptInPopupProps {
  onClose: () => void;
  onComplete: (userId: string) => void;
}

const INTERESTS = [
  { id: 'reality', label: 'ריאליטי', icon: '🎭' },
  { id: 'music', label: 'מוזיקה', icon: '🎵' },
  { id: 'gossip', label: 'רכילות סלבס', icon: '💬' },
  { id: 'tv_series', label: 'סדרות', icon: '📺' },
  { id: 'sports', label: 'ספורט', icon: '⚽' },
  { id: 'cinema', label: 'קולנוע', icon: '🎬' },
];

type Step = 'ask' | 'interests' | 'contact' | 'done';

export function OptInPopup({ onClose, onComplete }: OptInPopupProps) {
  const [step, setStep] = useState<Step>('ask');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSubmit = async () => {
    if (!phone.trim()) {
      setError('הכנס מספר טלפון');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          email: email.trim() || undefined,
          interests: selectedInterests,
          whatsapp_pref: 'daily',
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'שגיאה בשמירה');
        return;
      }

      // Save to localStorage
      localStorage.setItem('ib_user_id', data.userId);
      localStorage.setItem('ib_opted_in', 'true');

      setStep('done');
      setTimeout(() => onComplete(data.userId), 1500);
    } catch {
      setError('שגיאת רשת, נסה שוב');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = () => {
    localStorage.setItem('ib_opted_in', 'dismissed');
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleDecline();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          dir="rtl"
          className="w-full max-w-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-indigo-500/20 border border-white/60 dark:border-slate-700/50 overflow-hidden"
        >
          {/* Step: Initial Ask */}
          {step === 'ask' && (
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-tr from-indigo-500 to-fuchsia-500 flex items-center justify-center text-3xl shadow-lg shadow-indigo-500/30">
                🔔
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                רוצה לקבל עדכונים חמים?
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                נעדכן אותך ישירות כשמשהו חם קורה — בדיוק בנושאים שמעניינים אותך
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('interests')}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-fuchsia-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 hover:shadow-xl active:scale-[0.97] transition-all"
                >
                  כן, בטח!
                </button>
                <button
                  onClick={handleDecline}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium text-sm hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.97] transition-all"
                >
                  לא תודה
                </button>
              </div>
            </div>
          )}

          {/* Step: Choose Interests */}
          {step === 'interests' && (
            <div className="p-6">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1 text-center">
                מה מעניין אותך?
              </h3>
              <p className="text-xs text-slate-400 mb-5 text-center">
                אפשר לבחור כמה שרוצים
              </p>

              <div className="grid grid-cols-2 gap-2.5 mb-6">
                {INTERESTS.map((interest) => {
                  const selected = selectedInterests.includes(interest.id);
                  return (
                    <button
                      key={interest.id}
                      onClick={() => toggleInterest(interest.id)}
                      className={`flex items-center gap-2.5 p-3 rounded-2xl border-2 text-right transition-all active:scale-[0.96] ${
                        selected
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <span className="text-xl">{interest.icon}</span>
                      <span
                        className={`text-sm font-semibold ${
                          selected
                            ? 'text-indigo-700 dark:text-indigo-300'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {interest.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setStep('contact')}
                disabled={selectedInterests.length === 0}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-fuchsia-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-xl active:scale-[0.97] transition-all"
              >
                המשך
              </button>
            </div>
          )}

          {/* Step: Contact Info */}
          {step === 'contact' && (
            <div className="p-6">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1 text-center">
                איך לשלוח לך?
              </h3>
              <p className="text-xs text-slate-400 mb-5 text-center">
                הטלפון ישמש לוואטסאפ בלבד
              </p>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                    📱 וואטסאפ (חובה)
                  </label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setError('');
                    }}
                    placeholder="05X-XXX-XXXX"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                    📧 מייל (אופציונלי)
                  </label>
                  <input
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-500 font-medium mb-3 text-center">
                  {error}
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-fuchsia-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 disabled:opacity-60 hover:shadow-xl active:scale-[0.97] transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'שמור ותתחיל לעדכן אותי ✅'
                )}
              </button>

              <button
                onClick={() => setStep('interests')}
                className="w-full mt-2 py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                חזרה
              </button>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div className="p-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center text-3xl shadow-lg"
              >
                ✅
              </motion.div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">
                מעולה!
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                נעדכן אותך כשמשהו חם קורה 🔥
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

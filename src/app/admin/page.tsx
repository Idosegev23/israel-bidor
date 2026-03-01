'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Types ────────────────────────────

interface Segment {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
}

interface Subscriber {
  id: string;
  phone: string | null;
  email: string | null;
  whatsapp_opt_in: boolean;
  whatsapp_pref: string | null;
  created_at: string;
  profile: {
    interests: string[] | null;
    engagement_score: number | null;
  } | null;
  segments: string[];
}

interface USTrend {
  id: string;
  trend_topic: string;
  trend_score: number;
  sources: string;
  supporting_items: string;
  israel_angles: string | null;
  status: string;
  detected_at: string;
}

type Tab = 'subscribers' | 'segments' | 'us-trends';

// ── Main Page ────────────────────────

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const handleLogin = () => {
    // Simple client-side check — real auth done on API routes
    if (password.trim().length >= 4) {
      localStorage.setItem('admin_pw', password.trim());
      setAuthed(true);
    } else {
      setAuthError('סיסמה לא תקינה');
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('admin_pw');
    if (saved) setAuthed(true);
  }, []);

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-xs bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 dark:border-slate-800 p-6" dir="rtl">
          <h1 className="text-xl font-black text-slate-900 dark:text-white mb-1 text-center">
            אדמין
          </h1>
          <p className="text-xs text-slate-400 mb-5 text-center">הכנס סיסמה כדי להיכנס</p>

          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setAuthError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="סיסמה"
            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />

          {authError && (
            <p className="text-xs text-red-500 mb-3 text-center">{authError}</p>
          )}

          <button
            onClick={handleLogin}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-fuchsia-500 text-white font-bold text-sm shadow-lg"
          >
            כניסה
          </button>
        </div>
      </div>
    );
  }

  return <AdminDashboard />;
}

// ── Dashboard ────────────────────────

function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('subscribers');

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'subscribers', label: 'מנויים', icon: '👥' },
    { key: 'segments', label: 'סגמנטים', icon: '🏷️' },
    { key: 'us-trends', label: 'ארה״ב', icon: '🇺🇸' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-black text-slate-900 dark:text-white">
            ישראל בידור <span className="text-indigo-500">Admin</span>
          </h1>
          <button
            onClick={() => { localStorage.removeItem('admin_pw'); window.location.reload(); }}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            יציאה
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <div className="flex gap-2 mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === t.key
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                  : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 pb-12">
        {tab === 'subscribers' && <SubscribersTab />}
        {tab === 'segments' && <SegmentsTab />}
        {tab === 'us-trends' && <USTrendsTab />}
      </div>
    </div>
  );
}

// ── Subscribers Tab ──────────────────

function SubscribersTab() {
  const [data, setData] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch('/api/admin/subscribers')
      .then((r) => r.json())
      .then((d) => {
        setData(d.subscribers ?? []);
        setTotal(d.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
          {total} מנויים
        </h2>
      </div>

      {data.length === 0 ? (
        <EmptyState text="אין מנויים עדיין" />
      ) : (
        <div className="space-y-2">
          {data.map((sub) => (
            <div
              key={sub.id}
              className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-800/50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-slate-900 dark:text-white" dir="ltr">
                      {sub.phone || 'ללא טלפון'}
                    </span>
                    {sub.whatsapp_opt_in && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                        WhatsApp
                      </span>
                    )}
                  </div>

                  {sub.email && (
                    <p className="text-xs text-slate-400 mb-1" dir="ltr">{sub.email}</p>
                  )}

                  {sub.profile?.interests && sub.profile.interests.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {sub.profile.interests.map((i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-medium"
                        >
                          {i}
                        </span>
                      ))}
                    </div>
                  )}

                  {sub.segments.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {sub.segments.map((s) => (
                        <span
                          key={s}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-50 dark:bg-fuchsia-950/50 text-fuchsia-600 dark:text-fuchsia-400 font-medium"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                  {new Date(sub.created_at).toLocaleDateString('he-IL')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Segments Tab ─────────────────────

function SegmentsTab() {
  const [data, setData] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/segments')
      .then((r) => r.json())
      .then((d) => setData(d.segments ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div>
      <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4">
        {data.length} סגמנטים
      </h2>

      {data.length === 0 ? (
        <EmptyState text="אין סגמנטים עדיין" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.map((seg) => (
            <div
              key={seg.id}
              className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-800/50 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {seg.name}
                </h3>
                <span className="text-lg font-black text-indigo-500">
                  {seg.member_count}
                </span>
              </div>
              {seg.description && (
                <p className="text-xs text-slate-400">{seg.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── US Trends Tab ────────────────────

function USTrendsTab() {
  const [data, setData] = useState<USTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchTrends = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/trends')
      .then((r) => r.json())
      .then((d) => setData(d.trends ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchTrends(); }, [fetchTrends]);

  const updateStatus = async (id: string, status: 'used' | 'ignored') => {
    setUpdating(id);
    try {
      await fetch('/api/admin/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trendId: id, status }),
      });
      fetchTrends();
    } catch {}
    setUpdating(null);
  };

  if (loading) return <LoadingState />;

  return (
    <div>
      <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4">
        {data.length} טרנדים אמריקאיים
      </h2>

      {data.length === 0 ? (
        <EmptyState text="אין טרנדים עדיין — רוץ את ה-cron job ידנית" />
      ) : (
        <div className="space-y-3">
          {data.map((trend) => {
            let sources: string[] = [];
            let items: { title: string; url: string; source: string }[] = [];
            let angles: string[] = [];
            try { sources = JSON.parse(trend.sources); } catch {}
            try { items = JSON.parse(trend.supporting_items); } catch {}
            try { angles = trend.israel_angles ? JSON.parse(trend.israel_angles) : []; } catch {}

            return (
              <div
                key={trend.id}
                className={`bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-2xl border p-4 transition-all ${
                  trend.status === 'used'
                    ? 'border-green-300/50 dark:border-green-800/50'
                    : trend.status === 'ignored'
                      ? 'border-slate-200/30 dark:border-slate-800/30 opacity-50'
                      : 'border-slate-200/50 dark:border-slate-800/50'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {trend.trend_topic}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                        ציון: {trend.trend_score}
                      </span>
                      {sources.map((s) => (
                        <span
                          key={s}
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium"
                        >
                          {s}
                        </span>
                      ))}
                      {trend.status !== 'new' && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          trend.status === 'used'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-200 text-slate-500'
                        }`}>
                          {trend.status === 'used' ? 'בשימוש' : 'הותעלם'}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {trend.detected_at
                      ? new Date(trend.detected_at).toLocaleDateString('he-IL')
                      : ''}
                  </span>
                </div>

                {/* Supporting items */}
                {items.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-bold text-slate-400 mb-1">כתבות קשורות:</p>
                    <div className="space-y-1">
                      {items.slice(0, 3).map((item, idx) => (
                        <a
                          key={idx}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-indigo-500 hover:text-indigo-600 truncate"
                        >
                          {item.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Israel angles */}
                {angles.length > 0 && (
                  <div className="mb-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-indigo-500 mb-1.5">
                      זוויות ישראליות:
                    </p>
                    <ul className="space-y-1">
                      {angles.map((angle, idx) => (
                        <li key={idx} className="text-xs text-slate-700 dark:text-slate-300">
                          • {angle}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                {trend.status === 'new' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatus(trend.id, 'used')}
                      disabled={updating === trend.id}
                      className="flex-1 py-2 rounded-xl bg-green-500 text-white text-xs font-bold hover:bg-green-600 disabled:opacity-50 transition-all"
                    >
                      השתמש
                    </button>
                    <button
                      onClick={() => updateStatus(trend.id, 'ignored')}
                      disabled={updating === trend.id}
                      className="flex-1 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 transition-all"
                    >
                      התעלם
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Shared components ────────────────

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-sm text-slate-400">{text}</p>
    </div>
  );
}

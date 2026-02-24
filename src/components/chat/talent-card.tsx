'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Users } from 'lucide-react';

export interface TalentCardData {
  username: string;
  full_name?: string | null;
  profile_pic_url?: string | null;
  followers_count?: number;
  category?: string | null;
  is_verified?: boolean;
}

export function TalentCard({ data }: { data: TalentCardData }) {
  const displayName = data.full_name || data.username;
  
  // פירמוט מספר העוקבים בצורה קריאה
  const formattedFollowers = data.followers_count
    ? data.followers_count >= 1_000_000
      ? `${(data.followers_count / 1_000_000).toFixed(1)}M`
      : data.followers_count >= 1_000
      ? `${(data.followers_count / 1_000).toFixed(0)}K`
      : data.followers_count.toLocaleString()
    : null;

  return (
    <motion.a
      href={`/talent/${data.username}`}
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, type: "spring", stiffness: 200, damping: 20 }}
      className="group flex items-center gap-4 p-3.5 md:p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 max-w-sm w-full"
    >
      {/* אזור תמונת הפרופיל */}
      <div className="relative shrink-0">
        {/* טבעת גרדיאנט חיצונית (סגנון סטורי) */}
        <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-full p-[2px] bg-gradient-to-tr from-indigo-500 via-purple-500 to-fuchsia-500 group-hover:shadow-lg group-hover:shadow-fuchsia-500/30 transition-all duration-300">
          <div className="w-full h-full rounded-full border-2 border-white dark:border-slate-900 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center overflow-hidden">
            <span className="text-indigo-600 dark:text-indigo-400 font-black text-lg">
              {displayName.charAt(0)}
            </span>
            {data.profile_pic_url && (
              <img
                src={data.profile_pic_url}
                alt={displayName}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
          </div>
        </div>

        {/* וי כחול בולט */}
        {data.is_verified && (
          <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-[2px] shadow-sm">
            <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-sky-500 fill-white dark:fill-slate-900" />
          </div>
        )}
      </div>

      {/* אזור הטקסט והמידע */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[15px] md:text-base text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {displayName}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-[12px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
          <span className="truncate" dir="ltr">@{data.username}</span>
          
          {formattedFollowers && (
            <>
              <span className="text-slate-300 dark:text-slate-600 text-[10px]">●</span>
              <span className="flex items-center gap-1 shrink-0">
                <Users className="h-3.5 w-3.5" />
                <span dir="ltr">{formattedFollowers}</span>
              </span>
            </>
          )}
        </div>

        {/* תגית קטגוריה אלגנטית */}
        {data.category && (
          <div className="mt-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 text-[10px] md:text-[11px] font-bold text-slate-600 dark:text-slate-300 tracking-wide">
              {data.category}
            </span>
          </div>
        )}
      </div>
    </motion.a>
  );
}
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
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200"
    >
      <div className="relative shrink-0">
        <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-violet-600 to-orange-500 flex items-center justify-center text-white font-semibold text-lg overflow-hidden ring-1 ring-zinc-200 dark:ring-zinc-700">
          {data.profile_pic_url ? (
            <img
              src={data.profile_pic_url}
              alt={displayName}
              className="absolute inset-0 w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : null}
          <span className="relative z-10">{displayName.charAt(0)}</span>
        </div>
        {data.is_verified && (
          <div className="absolute -bottom-0.5 -right-0.5">
            <CheckCircle2 className="h-4 w-4 text-blue-600 fill-white dark:fill-zinc-900" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-50 truncate">
            {displayName}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
          <span>@{data.username}</span>
          {formattedFollowers && (
            <>
              <span className="text-zinc-300 dark:text-zinc-600">|</span>
              <span className="flex items-center gap-0.5">
                <Users className="h-3 w-3" />
                {formattedFollowers}
              </span>
            </>
          )}
        </div>
        {data.category && (
          <span className="inline-block mt-1 text-[10px] font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
            {data.category}
          </span>
        )}
      </div>
    </motion.a>
  );
}

'use client';

import { motion } from 'framer-motion';
import { ExternalLink, Heart } from 'lucide-react';

export interface ContentCardData {
  id: string;
  title: string;
  url: string;
  thumbnail_url?: string | null;
  source: string;
  category?: string | null;
  heat_score?: number;
  views_30m?: number;
  talent_name?: string | null;
  talent_username?: string | null;
  reason?: string | null;
}

interface ContentCardProps {
  data: ContentCardData;
  compact?: boolean;
  onAskAbout?: (question: string) => void;
}

export function ContentCard({ data }: ContentCardProps) {
  const likes = data.views_30m ?? 0;
  const displayTitle = (data.title || 'פוסט מישראל בידור').slice(0, 60);

  const formattedLikes = likes >= 1000
    ? `${(likes / 1000).toFixed(1)}K`
    : likes > 0
    ? likes.toLocaleString()
    : null;

  return (
    <motion.a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className="group flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/80 dark:border-slate-700/50 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all duration-200 shadow-sm hover:shadow-md max-w-sm"
    >
      {/* Compact info */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {displayTitle}
        </p>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
          {data.reason && (
            <span className="text-indigo-500 dark:text-indigo-400 font-medium truncate max-w-[140px]">
              {data.reason}
            </span>
          )}
          {formattedLikes && (
            <span className="flex items-center gap-0.5 shrink-0">
              <Heart className="h-3 w-3" />
              {formattedLikes}
            </span>
          )}
        </div>
      </div>

      {/* Link icon */}
      <div className="shrink-0 w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
        <ExternalLink className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
      </div>
    </motion.a>
  );
}

export function ContentCardStrip({
  items,
  title,
  onAskAbout
}: {
  items: ContentCardData[];
  title?: string;
  onAskAbout?: (question: string) => void;
}) {
  if (!items.length) return null;

  return (
    <div className="flex flex-col gap-1.5 mt-1">
      {title && items.length > 1 && (
        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mr-1">
          {title}
        </span>
      )}
      {items.map((item, i) => (
        <ContentCard key={item.id || i} data={item} onAskAbout={onAskAbout} />
      ))}
    </div>
  );
}

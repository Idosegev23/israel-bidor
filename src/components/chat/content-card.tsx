'use client';

import { motion } from 'framer-motion';
import { Eye, Flame, ExternalLink, MessageCircle, TrendingUp, Sparkles } from 'lucide-react';

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
}

interface ContentCardProps {
  data: ContentCardData;
  compact?: boolean;
  onAskAbout?: (question: string) => void;
}

export function ContentCard({ data, compact = false, onAskAbout }: ContentCardProps) {
  const heatLevel = (data.heat_score || 0) > 200
    ? 'text-red-600 dark:text-red-400'
    : (data.heat_score || 0) > 100
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-zinc-500 dark:text-zinc-400';

  // Create an engaging title teaser
  const createTeaser = (title: string): string => {
    // If title is too short, just return it
    if (title.length < 60) return title;
    
    // Find a natural break point (sentence end or emoji)
    const naturalBreak = title.slice(0, 100).lastIndexOf('.');
    if (naturalBreak > 40) {
      return title.slice(0, naturalBreak + 1) + ' 🔥';
    }
    
    // Otherwise, cut at ~80 chars and add intrigue
    return title.slice(0, 80).trim() + '... 👀';
  };

  const displayTitle = createTeaser(data.title);

  // Generate conversation starters based on content
  // Include a hint about which post this is (for context continuity)
  const postHint = data.title.slice(0, 40);
  const starters = [
    { icon: MessageCircle, text: 'ספר לי עוד', query: `ספר לי עוד על: "${postHint}..."` },
    { icon: TrendingUp, text: 'למה זה חם?', query: `למה הפוסט על "${postHint}..." כל כך פופולרי?` },
    { icon: Sparkles, text: 'מה הסיפור?', query: `מה הסיפור מאחורי הפוסט על "${postHint}..."?` },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`group rounded-xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-violet-300 dark:hover:border-violet-700 transition-all duration-200 ${compact ? 'w-48' : 'w-full'}`}
    >
      {/* Image with link overlay */}
      <a 
        href={data.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {data.thumbnail_url && (
          <div className="relative aspect-[16/10] bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <img
              src={data.thumbnail_url}
              alt={data.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              referrerPolicy="no-referrer"
            />
            {data.heat_score != null && data.heat_score > 0 && (
              <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm px-2 py-0.5 text-[11px] font-medium">
                <Flame className={`h-3 w-3 ${heatLevel}`} />
                <span className={heatLevel}>{data.heat_score.toFixed(0)}</span>
              </div>
            )}
            <div className="absolute bottom-2 right-2 rounded-full bg-zinc-900/70 backdrop-blur-sm px-2 py-0.5 text-[10px] text-white font-medium">
              {data.talent_username ? `@${data.talent_username}` : data.source}
            </div>
            {/* Link indicator */}
            <div className="absolute top-2 right-2 rounded-full bg-zinc-900/70 backdrop-blur-sm p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink className="h-3 w-3 text-white" />
            </div>
          </div>
        )}
      </a>

      <div className={compact ? 'p-2.5' : 'p-3'}>
        {data.talent_name && (
          <p className="text-[11px] font-medium text-violet-600 dark:text-violet-400 mb-0.5 truncate">
            {data.talent_name}
          </p>
        )}
        <h4 className={`font-medium text-zinc-900 dark:text-zinc-50 leading-snug ${compact ? 'text-xs line-clamp-2' : 'text-sm line-clamp-3'}`}>
          {compact ? data.title.slice(0, 60) + (data.title.length > 60 ? '...' : '') : displayTitle}
        </h4>
        {!compact && data.views_30m != null && data.views_30m > 0 && (
          <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {data.views_30m.toLocaleString()}
            </span>
            {data.category && <span className="text-violet-500 dark:text-violet-400">#{data.category}</span>}
          </div>
        )}

        {/* Conversation starters */}
        {!compact && onAskAbout && (
          <div className="flex gap-1.5 mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800">
            {starters.slice(0, 2).map((starter, i) => {
              const Icon = starter.icon;
              return (
                <button
                  key={i}
                  onClick={() => onAskAbout(starter.query)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/30 dark:hover:bg-violet-950/50 rounded-lg text-[11px] font-medium text-violet-700 dark:text-violet-300 transition-all active:scale-95"
                >
                  <Icon className="h-3 w-3" />
                  <span>{starter.text}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
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
    <div className="mb-4">
      {title && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="h-1 w-1 rounded-full bg-violet-500"></div>
          <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            {title}
          </h3>
        </div>
      )}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
        {items.map((item) => (
          <div key={item.id} className="snap-start shrink-0 w-64">
            <ContentCard data={item} onAskAbout={onAskAbout} />
          </div>
        ))}
      </div>
    </div>
  );
}

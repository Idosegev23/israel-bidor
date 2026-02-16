/**
 * Spike Detection — Identifies velocity spikes in US content
 * A valid trend must be cross-source (>=2 different sources within 12h)
 */

import { createServerClient } from '@/lib/supabase/server';
import { type ContentCluster } from './clustering';

// ============================================
// Types
// ============================================

export interface DetectedTrend {
  topic: string;
  trend_score: number;
  sources: string[];
  supporting_items: Array<{ title: string; url: string; source: string }>;
}

// ============================================
// Spike Detection Config
// ============================================

interface SpikeConfig {
  min_sources: number;     // Minimum distinct sources for a valid trend
  spike_multiplier: number; // current_velocity > avg_7d * multiplier
  window_hours: number;    // Time window for cross-source validation
}

const DEFAULT_CONFIG: SpikeConfig = {
  min_sources: 2,
  spike_multiplier: 2.5,
  window_hours: 12,
};

// ============================================
// Detect Trends from Clusters
// ============================================

/**
 * Takes content clusters and validates them as trends
 * A cluster becomes a trend when it has cross-source validation
 */
export async function detectTrendsFromClusters(
  clusters: ContentCluster[]
): Promise<DetectedTrend[]> {
  const supabase = createServerClient();

  // Load config
  const config = await loadConfig(supabase);
  const trends: DetectedTrend[] = [];

  for (const cluster of clusters) {
    // Validate: must have items from >= min_sources different sources
    const uniqueSources = [...new Set(cluster.items.map((i) => i.source.replace(/^reddit_/, 'reddit')))];

    if (uniqueSources.length < config.min_sources) {
      continue; // Not a valid trend — single source
    }

    // Calculate trend score
    const trend_score =
      0.5 * (cluster.items.length / 10) + // avg_velocity proxy
      0.3 * (uniqueSources.length / 5) +   // num_sources normalized
      0.2 * 0.5; // growth_rate placeholder

    trends.push({
      topic: cluster.topic,
      trend_score: Math.round(trend_score * 100) / 100,
      sources: uniqueSources,
      supporting_items: cluster.items.map((i) => ({
        title: i.title,
        url: i.url,
        source: i.source,
      })),
    });
  }

  // Sort by score
  trends.sort((a, b) => b.trend_score - a.trend_score);

  console.log(`[SpikeDetection] ${trends.length} valid trends from ${clusters.length} clusters`);

  return trends;
}

/**
 * Save detected trends to the database
 */
export async function saveTrends(trends: DetectedTrend[]): Promise<{
  saved: number;
  errors: string[];
}> {
  const supabase = createServerClient();
  let saved = 0;
  const errors: string[] = [];

  for (const trend of trends) {
    try {
      const { error } = await supabase.from('us_trends').insert({
        trend_topic: trend.topic,
        trend_score: trend.trend_score,
        sources: trend.sources,
        supporting_items: trend.supporting_items,
        status: 'new',
      });

      if (error) {
        errors.push(`[${trend.topic}] ${error.message}`);
      } else {
        saved++;
      }
    } catch (error: any) {
      errors.push(`[${trend.topic}] ${error.message}`);
    }
  }

  return { saved, errors };
}

// ============================================
// Helpers
// ============================================

async function loadConfig(supabase: ReturnType<typeof createServerClient>): Promise<SpikeConfig> {
  try {
    const { data } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'us_trend_config')
      .single();

    if (data?.value) {
      const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch {
    // fallback
  }
  return DEFAULT_CONFIG;
}

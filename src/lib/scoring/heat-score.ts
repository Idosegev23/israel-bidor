/**
 * IL Heat Score Engine
 * Calculates how "hot" a content item is and whether it's "breaking"
 *
 * Formula: heat = 0.4*views_30m + 0.3*shares_30m + 0.2*comments_30m + 0.1*growth_rate
 * Breaking: heat > dynamic_threshold AND published within last 6 hours
 */

import { createServerClient } from '@/lib/supabase/server';
import { calculateVelocity, type MetricSnapshot } from './velocity';

// ============================================
// Types
// ============================================

export interface HeatScoreWeights {
  views: number;
  shares: number;
  comments: number;
  growth: number;
}

export interface HeatResult {
  content_id: string;
  heat_score: number;
  growth_rate: number;
  is_breaking: boolean;
  title: string;
  url: string;
}

// Default weights (can be overridden by system_config)
const DEFAULT_WEIGHTS: HeatScoreWeights = {
  views: 0.4,
  shares: 0.3,
  comments: 0.2,
  growth: 0.1,
};

// ============================================
// Core Heat Score Calculation
// ============================================

/**
 * Calculate heat score for a single content item
 */
export function computeHeatScore(
  views30m: number,
  shares30m: number,
  comments30m: number,
  growthRate: number,
  weights: HeatScoreWeights = DEFAULT_WEIGHTS
): number {
  const heat =
    weights.views * views30m +
    weights.shares * shares30m +
    weights.comments * comments30m +
    weights.growth * Math.abs(growthRate);

  return Math.round(heat * 100) / 100;
}

/**
 * Get dynamic threshold based on 7-day average + 2*stddev
 */
export async function getDynamicThreshold(supabase: ReturnType<typeof createServerClient>): Promise<number> {
  // Check if mode is manual
  const { data: modeConfig } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'heat_threshold_mode')
    .single();

  if (modeConfig?.value === 'manual' || modeConfig?.value === '"manual"') {
    const { data: manualConfig } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'heat_threshold_manual')
      .single();

    return Number(manualConfig?.value) || 100;
  }

  // Dynamic: mean + 2*stddev of last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: metrics } = await supabase
    .from('il_content_metrics')
    .select('heat_score')
    .gte('snapshot_at', sevenDaysAgo)
    .gt('heat_score', 0);

  if (!metrics || metrics.length < 5) {
    // Not enough data — use manual fallback
    return 100;
  }

  const scores = metrics.map((m) => m.heat_score);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const stddev = Math.sqrt(variance);

  const threshold = mean + 2 * stddev;
  console.log(`[HeatScore] Dynamic threshold: ${threshold.toFixed(2)} (mean=${mean.toFixed(2)}, std=${stddev.toFixed(2)}, n=${scores.length})`);

  return threshold;
}

// ============================================
// Batch Processing
// ============================================

/**
 * Compute heat scores for all recent IL content items
 * Called by cron/il-scoring every 15 minutes
 */
export async function computeAllHeatScores(): Promise<{
  processed: number;
  breakingItems: HeatResult[];
  errors: string[];
}> {
  const supabase = createServerClient();
  const errors: string[] = [];
  const results: HeatResult[] = [];

  // Get weights from config
  const { data: weightsConfig } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'heat_score_weights')
    .single();

  const weights: HeatScoreWeights = weightsConfig?.value
    ? (typeof weightsConfig.value === 'string' ? JSON.parse(weightsConfig.value) : weightsConfig.value)
    : DEFAULT_WEIGHTS;

  // Get all content items from the last 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: contentItems, error: fetchError } = await supabase
    .from('il_content_items')
    .select('id, title, url, published_at')
    .gte('published_at', oneDayAgo)
    .order('published_at', { ascending: false });

  if (fetchError || !contentItems) {
    errors.push(`Failed to fetch content: ${fetchError?.message}`);
    return { processed: 0, breakingItems: [], errors };
  }

  // Get dynamic threshold
  const threshold = await getDynamicThreshold(supabase);
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  for (const item of contentItems) {
    try {
      // Get the last 2 metric snapshots for velocity calculation
      const { data: snapshots } = await supabase
        .from('il_content_metrics')
        .select('views_30m, shares_30m, comments_30m, growth_rate, snapshot_at')
        .eq('content_id', item.id)
        .order('snapshot_at', { ascending: false })
        .limit(2);

      const current: MetricSnapshot = snapshots?.[0] || {
        views_30m: 0,
        shares_30m: 0,
        comments_30m: 0,
        snapshot_at: new Date().toISOString(),
      };

      const previous: MetricSnapshot | null = snapshots?.[1] || null;

      // Calculate velocity
      const velocity = calculateVelocity(current, previous);

      // Calculate heat score
      const heatScore = computeHeatScore(
        current.views_30m,
        current.shares_30m,
        current.comments_30m,
        velocity.growth_rate,
        weights
      );

      // Save new metric snapshot
      await supabase.from('il_content_metrics').insert({
        content_id: item.id,
        views_30m: current.views_30m,
        shares_30m: current.shares_30m,
        comments_30m: current.comments_30m,
        growth_rate: velocity.growth_rate,
        heat_score: heatScore,
      });

      // Check if breaking
      const isBreaking =
        heatScore > threshold &&
        item.published_at &&
        new Date(item.published_at) > new Date(sixHoursAgo);

      const result: HeatResult = {
        content_id: item.id,
        heat_score: heatScore,
        growth_rate: velocity.growth_rate,
        is_breaking: isBreaking,
        title: item.title,
        url: item.url,
      };

      results.push(result);
    } catch (error: any) {
      errors.push(`[${item.id}] ${error.message}`);
    }
  }

  const breakingItems = results.filter((r) => r.is_breaking);

  console.log(
    `[HeatScore] Processed ${results.length} items, ${breakingItems.length} breaking (threshold=${threshold.toFixed(2)})`
  );

  return {
    processed: results.length,
    breakingItems,
    errors,
  };
}

/**
 * Velocity Calculation
 * Measures the rate of change in engagement metrics over time
 */

export interface MetricSnapshot {
  views_30m: number;
  shares_30m: number;
  comments_30m: number;
  snapshot_at: string;
}

/**
 * Calculate velocity: rate of change between two metric snapshots
 * Returns change per hour for each metric
 */
export function calculateVelocity(
  current: MetricSnapshot,
  previous: MetricSnapshot | null
): {
  views_velocity: number;
  shares_velocity: number;
  comments_velocity: number;
  growth_rate: number;
} {
  if (!previous) {
    return {
      views_velocity: current.views_30m,
      shares_velocity: current.shares_30m,
      comments_velocity: current.comments_30m,
      growth_rate: 0,
    };
  }

  const timeDiffMs = new Date(current.snapshot_at).getTime() - new Date(previous.snapshot_at).getTime();
  const timeDiffHours = Math.max(timeDiffMs / (1000 * 60 * 60), 0.1); // min 6 minutes

  const viewsDiff = current.views_30m - previous.views_30m;
  const sharesDiff = current.shares_30m - previous.shares_30m;
  const commentsDiff = current.comments_30m - previous.comments_30m;

  const views_velocity = viewsDiff / timeDiffHours;
  const shares_velocity = sharesDiff / timeDiffHours;
  const comments_velocity = commentsDiff / timeDiffHours;

  // Growth rate: weighted average of velocity ratios
  const prevTotal = (previous.views_30m || 1) + (previous.shares_30m || 1) + (previous.comments_30m || 1);
  const currTotal = current.views_30m + current.shares_30m + current.comments_30m;
  const growth_rate = prevTotal > 0 ? ((currTotal - prevTotal) / prevTotal) * 100 : 0;

  return {
    views_velocity: Math.round(views_velocity * 100) / 100,
    shares_velocity: Math.round(shares_velocity * 100) / 100,
    comments_velocity: Math.round(comments_velocity * 100) / 100,
    growth_rate: Math.round(growth_rate * 100) / 100,
  };
}

/**
 * Calculate US velocity score for a single content item
 */
export function calculateUSVelocity(
  current: { views: number; likes: number; comments: number; shares: number },
  previous: { views: number; likes: number; comments: number; shares: number } | null,
  timeDiffHours: number
): number {
  if (!previous || timeDiffHours <= 0) {
    return current.views + current.likes * 2 + current.comments * 3 + current.shares * 5;
  }

  const viewsVel = (current.views - previous.views) / timeDiffHours;
  const likesVel = (current.likes - previous.likes) / timeDiffHours;
  const commentsVel = (current.comments - previous.comments) / timeDiffHours;
  const sharesVel = (current.shares - previous.shares) / timeDiffHours;

  // Weighted velocity score
  return Math.round(
    viewsVel * 0.2 + likesVel * 0.2 + commentsVel * 0.3 + sharesVel * 0.3
  );
}

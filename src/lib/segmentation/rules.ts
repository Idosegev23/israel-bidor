/**
 * Segmentation Rules — Defines how users are matched to segments
 */

// ============================================
// Types
// ============================================

export interface SegmentRule {
  name: string;
  match: (profile: UserProfileData) => boolean;
  score: (profile: UserProfileData) => number; // 0-1 confidence
}

export interface UserProfileData {
  interests: string[];
  entities: string[];
  sensitivities: string[];
  tone_preference: string | null;
  engagement_score: number;
}

// ============================================
// Built-in Rules
// ============================================

export const SEGMENT_RULES: SegmentRule[] = [
  {
    name: 'reality_lovers',
    match: (p) =>
      p.interests.some((i) =>
        ['reality', 'survivor', 'big_brother', 'the_next_star', 'married_at_first_sight'].includes(i)
      ) ||
      p.entities.some((e) =>
        e.toLowerCase().includes('סורווייבר') ||
        e.toLowerCase().includes('האח הגדול') ||
        e.toLowerCase().includes('הישרדות') ||
        e.toLowerCase().includes('ריאליטי')
      ),
    score: (p) => {
      const realityInterests = p.interests.filter((i) =>
        ['reality', 'survivor', 'big_brother', 'the_next_star'].includes(i)
      );
      return Math.min(realityInterests.length * 0.3 + 0.2, 1);
    },
  },

  {
    name: 'music_fans',
    match: (p) =>
      p.interests.some((i) =>
        ['music', 'concerts', 'eurovision', 'singing', 'hip_hop'].includes(i)
      ) ||
      p.entities.some((e) =>
        e.toLowerCase().includes('מוזיקה') ||
        e.toLowerCase().includes('אירוויזיון') ||
        e.toLowerCase().includes('הכוכב הבא')
      ),
    score: (p) => {
      const musicInterests = p.interests.filter((i) =>
        ['music', 'concerts', 'eurovision'].includes(i)
      );
      return Math.min(musicInterests.length * 0.3 + 0.2, 1);
    },
  },

  {
    name: 'celebs_gossip',
    match: (p) =>
      p.interests.some((i) =>
        ['gossip', 'celebrities', 'relationships', 'drama', 'fashion'].includes(i)
      ),
    score: (p) => {
      const gossipInterests = p.interests.filter((i) =>
        ['gossip', 'celebrities', 'relationships'].includes(i)
      );
      return Math.min(gossipInterests.length * 0.3 + 0.2, 1);
    },
  },

  {
    name: 'tv_series',
    match: (p) =>
      p.interests.some((i) =>
        ['tv_series', 'drama', 'comedy', 'streaming', 'netflix'].includes(i)
      ),
    score: (p) => {
      const tvInterests = p.interests.filter((i) =>
        ['tv_series', 'drama', 'comedy', 'streaming'].includes(i)
      );
      return Math.min(tvInterests.length * 0.3 + 0.2, 1);
    },
  },

  {
    name: 'no_politics',
    match: (p) =>
      p.sensitivities.some((s) =>
        ['politics', 'political'].includes(s)
      ),
    score: (p) => {
      return p.sensitivities.includes('politics') ? 1 : 0;
    },
  },
];

// ============================================
// Match user to segments
// ============================================

export function matchUserToSegments(
  profile: UserProfileData
): Array<{ segmentName: string; score: number }> {
  const matches: Array<{ segmentName: string; score: number }> = [];

  for (const rule of SEGMENT_RULES) {
    if (rule.match(profile)) {
      matches.push({
        segmentName: rule.name,
        score: rule.score(profile),
      });
    }
  }

  // Sort by score descending, limit to top 3
  return matches.sort((a, b) => b.score - a.score).slice(0, 3);
}

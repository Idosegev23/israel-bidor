/**
 * Segmentation Engine — Assigns users to segments based on their profiles
 */

import { createServerClient } from '@/lib/supabase/server';
import { matchUserToSegments, type UserProfileData } from './rules';

// ============================================
// Batch Segment Assignment
// ============================================

/**
 * Assign all users with profiles to appropriate segments
 * Called daily by cron/segment-assign
 */
export async function assignAllSegments(): Promise<{
  usersProcessed: number;
  assignmentsCreated: number;
  errors: string[];
}> {
  const supabase = createServerClient();
  const errors: string[] = [];
  let usersProcessed = 0;
  let assignmentsCreated = 0;

  // Get all user profiles
  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('user_id, interests, entities, sensitivities, tone_preference, engagement_score');

  if (profileError || !profiles) {
    return { usersProcessed: 0, assignmentsCreated: 0, errors: [`Failed to fetch profiles: ${profileError?.message}`] };
  }

  // Get segment name→id mapping
  const { data: segments } = await supabase
    .from('segments')
    .select('id, name');

  if (!segments) {
    return { usersProcessed: 0, assignmentsCreated: 0, errors: ['No segments found'] };
  }

  const segmentMap = new Map(segments.map((s) => [s.name, s.id]));

  for (const profile of profiles) {
    try {
      usersProcessed++;

      const profileData: UserProfileData = {
        interests: (profile.interests as string[]) || [],
        entities: (profile.entities as string[]) || [],
        sensitivities: (profile.sensitivities as string[]) || [],
        tone_preference: profile.tone_preference,
        engagement_score: profile.engagement_score || 0,
      };

      // Match to segments
      const matches = matchUserToSegments(profileData);

      if (matches.length === 0) continue;

      // Clear existing assignments for this user
      await supabase
        .from('user_segments')
        .delete()
        .eq('user_id', profile.user_id);

      // Insert new assignments
      const assignments = matches
        .map((m) => {
          const segmentId = segmentMap.get(m.segmentName);
          if (!segmentId) return null;
          return {
            user_id: profile.user_id,
            segment_id: segmentId,
            score: m.score,
            assigned_at: new Date().toISOString(),
          };
        })
        .filter(Boolean);

      if (assignments.length > 0) {
        const { error } = await supabase
          .from('user_segments')
          .insert(assignments);

        if (error) {
          errors.push(`[${profile.user_id}] Insert error: ${error.message}`);
        } else {
          assignmentsCreated += assignments.length;
        }
      }
    } catch (error: any) {
      errors.push(`[${profile.user_id}] ${error.message}`);
    }
  }

  console.log(
    `[Segmentation] ${usersProcessed} users, ${assignmentsCreated} assignments, ${errors.length} errors`
  );

  return { usersProcessed, assignmentsCreated, errors };
}

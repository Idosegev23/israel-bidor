import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = createServerClient();

    // Get all users with profiles and segments
    const { data: users, error } = await supabase
      .from('users')
      .select('id, phone, email, whatsapp_opt_in, whatsapp_pref, email_opt_in, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    // Get profiles for all users
    const userIds = (users ?? []).map((u) => u.id);
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, interests, entities, sensitivities, tone_preference, engagement_score')
      .in('user_id', userIds);

    // Get segment memberships
    const { data: memberships } = await supabase
      .from('user_segments')
      .select('user_id, segment_id')
      .in('user_id', userIds);

    const { data: segments } = await supabase
      .from('segments')
      .select('id, name');

    const segmentNames = new Map((segments ?? []).map((s) => [s.id, s.name]));
    const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

    // Group segment names per user
    const userSegments = new Map<string, string[]>();
    for (const m of memberships ?? []) {
      const list = userSegments.get(m.user_id) ?? [];
      const name = segmentNames.get(m.segment_id);
      if (name) list.push(name);
      userSegments.set(m.user_id, list);
    }

    const enriched = (users ?? []).map((u) => ({
      ...u,
      profile: profileMap.get(u.id) ?? null,
      segments: userSegments.get(u.id) ?? [],
    }));

    return NextResponse.json({
      success: true,
      subscribers: enriched,
      total: enriched.length,
    });
  } catch (error: any) {
    console.error('[Admin/Subscribers]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = createServerClient();

    // Get all segments with member counts
    const { data: segments, error } = await supabase
      .from('segments')
      .select('id, name, description, rules, created_at');

    if (error) throw error;

    // Get member counts per segment
    const { data: counts } = await supabase
      .from('user_segments')
      .select('segment_id');

    const countMap = new Map<string, number>();
    for (const row of counts ?? []) {
      countMap.set(row.segment_id, (countMap.get(row.segment_id) ?? 0) + 1);
    }

    const enriched = (segments ?? []).map((s) => ({
      ...s,
      member_count: countMap.get(s.id) ?? 0,
    }));

    return NextResponse.json({ success: true, segments: enriched });
  } catch (error: any) {
    console.error('[Admin/Segments]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * GET /api/talent/[username]
 * Get full talent data from Supabase
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('talent_profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Talent not found' }, { status: 404 });
    }

    // Get posts
    const { data: posts } = await supabase
      .from('talent_posts')
      .select('*')
      .eq('talent_id', profile.id)
      .order('posted_at', { ascending: false })
      .limit(50);

    // Get highlights
    const { data: highlights } = await supabase
      .from('talent_highlights')
      .select('*')
      .eq('talent_id', profile.id);

    // Get latest insights
    const { data: latestInsights } = await supabase
      .from('talent_insights')
      .select('*')
      .eq('talent_id', profile.id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      profile,
      posts: posts || [],
      highlights: highlights || [],
      insights: latestInsights,
      stats: {
        totalPosts: posts?.length || 0,
        totalHighlights: highlights?.length || 0,
        lastUpdated: profile.last_scraped_at,
        lastProcessed: profile.last_processed_at,
      },
    });
  } catch (error: any) {
    console.error('[API Talent] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

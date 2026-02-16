import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/stats
 * Admin dashboard statistics from Supabase
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Get all profiles
    const { data: profiles } = await supabase
      .from('talent_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    // Get recent jobs
    const { data: jobs } = await supabase
      .from('scrape_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get total counts
    const { count: totalPosts } = await supabase
      .from('talent_posts')
      .select('*', { count: 'exact', head: true });

    const { count: totalInsights } = await supabase
      .from('talent_insights')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      stats: {
        totalProfiles: profiles?.length || 0,
        totalPosts: totalPosts || 0,
        totalInsights: totalInsights || 0,
        totalJobs: jobs?.length || 0,
        profilesCompleted:
          profiles?.filter((p) => p.scrape_status === 'completed').length || 0,
        profilesPending: profiles?.filter((p) => p.scrape_status === 'pending').length || 0,
      },
      profiles: profiles || [],
      recentJobs: jobs || [],
    });
  } catch (error: any) {
    console.error('[API Admin Stats] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

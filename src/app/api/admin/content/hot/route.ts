import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/content/hot
 * Returns hot IL content items sorted by heat score
 */
export async function GET() {
  try {
    const supabase = createServerClient();

    // Get content from last 48 hours with latest metrics
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: content } = await supabase
      .from('il_content_items')
      .select('id, source, title, url, content_type, category, published_at, thumbnail_url, talent_name, talent_username')
      .gte('published_at', twoDaysAgo)
      .order('published_at', { ascending: false })
      .limit(50);

    // Get latest metrics for each content item + talent info for Instagram
    const contentWithMetrics = [];
    for (const item of content || []) {
      const { data: metrics } = await supabase
        .from('il_content_metrics')
        .select('heat_score, views_30m, shares_30m, comments_30m, growth_rate, snapshot_at')
        .eq('content_id', item.id)
        .order('snapshot_at', { ascending: false })
        .limit(1)
        .single();

      // Enrich Instagram content with talent data
      let talentInfo = null;
      if (item.source?.startsWith('instagram:')) {
        const username = item.source.replace('instagram:', '');
        const { data: talent } = await supabase
          .from('talent_profiles')
          .select('full_name, username, followers_count, is_verified, category, profile_pic_url')
          .eq('username', username)
          .single();

        if (talent) {
          talentInfo = {
            name: talent.full_name || talent.username,
            username: talent.username,
            followers: talent.followers_count || 0,
            verified: talent.is_verified || false,
            category: talent.category,
            pic: talent.profile_pic_url,
          };
        }
      }

      contentWithMetrics.push({
        ...item,
        heat_score: metrics?.heat_score || 0,
        views_30m: metrics?.views_30m || 0,
        shares_30m: metrics?.shares_30m || 0,
        comments_30m: metrics?.comments_30m || 0,
        growth_rate: metrics?.growth_rate || 0,
        talent: talentInfo,
      });
    }

    // Sort by heat score
    contentWithMetrics.sort((a, b) => b.heat_score - a.heat_score);

    return NextResponse.json({ success: true, content: contentWithMetrics });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

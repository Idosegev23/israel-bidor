import { NextRequest, NextResponse } from 'next/server';
import { getOrchestrator } from '@/lib/scrape/orchestrator';
import { createServerClient } from '@/lib/supabase/server';

/**
 * GET /api/cron/daily-scrape
 * Daily cron job - scrapes new content for all tracked talents
 * Runs every day at 5:00 AM
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Security check
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Daily scrape job started');

    const supabase = createServerClient();
    const orchestrator = getOrchestrator();

    // Create cron log
    const { data: cronLog } = await supabase
      .from('cron_logs')
      .insert({
        cron_type: 'daily_scrape',
        status: 'running',
      })
      .select()
      .single();

    const logs: string[] = [];
    const results: any[] = [];

    // Get target talents from config
    const { data: config } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'target_talents')
      .single();

    const targetTalents: string[] = config?.value || [
      'noa_kirel',
      'staticben',
      'shira_haas',
      'gal_gadot',
    ];

    logs.push(`Target talents: ${targetTalents.join(', ')}`);

    // Process each talent (quick rescan - only recent posts)
    for (const username of targetTalents) {
      try {
        logs.push(`Processing @${username}...`);

        const result = await orchestrator.quickRescan(username);

        results.push({
          username,
          success: result.success,
          stats: result.stats,
          duration: result.duration,
        });

        logs.push(`✅ @${username}: ${result.stats.postsSaved} new posts`);

        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error: any) {
        logs.push(`❌ @${username}: ${error.message}`);
        results.push({
          username,
          success: false,
          error: error.message,
        });
      }
    }

    // Calculate stats
    const successCount = results.filter((r) => r.success).length;
    const totalNewPosts = results.reduce((sum, r) => sum + (r.stats?.postsSaved || 0), 0);
    const totalInsights = results.filter((r) => r.stats?.insightsGenerated).length;

    const duration = Date.now() - startTime;

    // Update cron log
    if (cronLog) {
      await supabase
        .from('cron_logs')
        .update({
          status: 'success',
          talents_processed: targetTalents.length,
          new_posts_found: totalNewPosts,
          insights_generated: totalInsights,
          completed_at: new Date().toISOString(),
          duration_seconds: Math.floor(duration / 1000),
          logs: { results, logs },
        })
        .eq('id', cronLog.id);
    }

    console.log(`[Cron] Daily scrape completed in ${(duration / 1000).toFixed(1)}s`);
    console.log(
      `[Cron] Results: ${successCount}/${targetTalents.length} talents, ${totalNewPosts} new posts`
    );

    return NextResponse.json({
      success: true,
      stats: {
        talentsProcessed: targetTalents.length,
        successCount,
        newPostsFound: totalNewPosts,
        insightsGenerated: totalInsights,
        duration: Math.floor(duration / 1000),
      },
      results,
      logs,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[Cron] Daily scrape failed:', error);

    // Try to log error
    try {
      const supabase = createServerClient();
      await supabase.from('cron_logs').insert({
        cron_type: 'daily_scrape',
        status: 'failed',
        error_message: error.message,
        duration_seconds: Math.floor(duration / 1000),
      });
    } catch {}

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        duration: Math.floor(duration / 1000),
      },
      { status: 500 }
    );
  }
}

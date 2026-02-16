import { NextRequest, NextResponse } from 'next/server';
import { scrapeAndProcessTalent } from '@/lib/scrape/orchestrator';
import { createServerClient } from '@/lib/supabase/server';

/**
 * POST /api/scrape/full
 * Full scrape + AI processing for a talent
 */
export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    console.log(`[API Full Scrape] Starting for @${username}`);

    const supabase = createServerClient();

    // Create scrape job
    const { data: job } = await supabase
      .from('scrape_jobs')
      .insert({
        job_type: 'full_scrape',
        target_username: username,
        status: 'running',
        started_at: new Date().toISOString(),
        triggered_by: 'api',
      })
      .select()
      .single();

    // Run orchestration
    const result = await scrapeAndProcessTalent(username, true, (step, progress, message) => {
      console.log(`[${progress}%] ${step}: ${message}`);

      // Update progress
      if (job) {
        supabase
          .from('scrape_jobs')
          .update({ progress })
          .eq('id', job.id)
          .then(() => {});
      }
    });

    // Update job
    if (job) {
      await supabase
        .from('scrape_jobs')
        .update({
          status: result.success ? 'completed' : 'failed',
          completed_at: new Date().toISOString(),
          duration_seconds: Math.floor(result.duration / 1000),
          profiles_scraped: result.success ? 1 : 0,
          posts_scraped: result.stats.postsSaved,
          highlights_scraped: result.stats.highlightsSaved,
          error_message: result.error,
        })
        .eq('id', job.id);
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, jobId: job?.id },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      talentId: result.talentId,
      stats: result.stats,
      duration: result.duration,
      jobId: job?.id,
      message: `✅ Successfully scraped @${username}`,
    });
  } catch (error: any) {
    console.error('[API Full Scrape] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/scrape/full?jobId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'jobId required' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: job, error } = await supabase
      .from('scrape_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { runUSPipeline } from '@/lib/trends/us-pipeline';

/**
 * GET /api/cron/us-trends
 * Runs every 6 hours — scrapes US entertainment content,
 * clusters trends, generates Israel angles.
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

    console.log('[Cron] US trends pipeline started');

    const result = await runUSPipeline();

    const duration = Date.now() - startTime;
    console.log(`[Cron] US trends completed in ${(duration / 1000).toFixed(1)}s`);

    return NextResponse.json({
      success: true,
      stats: {
        ingested: result.ingested,
        trends_found: result.trends_found,
        duration: Math.floor(duration / 1000),
      },
      errors: result.errors,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[Cron] US trends pipeline failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        duration: Math.floor(duration / 1000),
      },
      { status: 500 },
    );
  }
}

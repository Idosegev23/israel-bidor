import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/deliveries
 * Returns delivery statistics and recent deliveries
 */
export async function GET() {
  try {
    const supabase = createServerClient();

    // Recent deliveries
    const { data: deliveries } = await supabase
      .from('deliveries')
      .select('id, channel, delivery_type, status, sent_at, error, created_at, users(phone)')
      .order('created_at', { ascending: false })
      .limit(50);

    // Stats
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Today's counts
    const { count: todaySent } = await supabase
      .from('deliveries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('sent_at', todayStart);

    const { count: todayFailed } = await supabase
      .from('deliveries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', todayStart);

    // Week's counts
    const { count: weekSent } = await supabase
      .from('deliveries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('sent_at', weekStart);

    // Click events
    const { count: weekClicks } = await supabase
      .from('delivery_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'clicked')
      .gte('created_at', weekStart);

    // Stop events
    const { count: weekStops } = await supabase
      .from('delivery_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'stopped')
      .gte('created_at', weekStart);

    return NextResponse.json({
      success: true,
      stats: {
        today: { sent: todaySent || 0, failed: todayFailed || 0 },
        week: {
          sent: weekSent || 0,
          clicks: weekClicks || 0,
          stops: weekStops || 0,
          ctr: weekSent ? (((weekClicks || 0) / weekSent) * 100).toFixed(1) : '0',
        },
      },
      deliveries: deliveries || [],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * GET /api/t/[deliveryId]
 * Tracking redirect — logs a click event and redirects to target URL
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deliveryId: string }> }
) {
  try {
    const { deliveryId } = await params;
    const targetUrl = request.nextUrl.searchParams.get('url');

    if (!deliveryId) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    const supabase = createServerClient();

    // Log click event (fire and forget)
    supabase
      .from('delivery_events')
      .insert({
        delivery_id: deliveryId,
        event_type: 'clicked',
        event_payload: {
          user_agent: request.headers.get('user-agent') || '',
          timestamp: new Date().toISOString(),
        },
      })
      .then(({ error }) => {
        if (error) console.error('[Tracking] Failed to log click:', error.message);
      });

    // Redirect to target URL
    if (targetUrl) {
      return NextResponse.redirect(targetUrl);
    }

    // Fallback: get URL from delivery payload
    const { data: delivery } = await supabase
      .from('deliveries')
      .select('payload, content_id')
      .eq('id', deliveryId)
      .single();

    if (delivery?.payload?.link) {
      return NextResponse.redirect(delivery.payload.link);
    }

    // If content_id exists, get the URL from il_content_items
    if (delivery?.content_id) {
      const { data: content } = await supabase
        .from('il_content_items')
        .select('url')
        .eq('id', delivery.content_id)
        .single();

      if (content?.url) {
        return NextResponse.redirect(content.url);
      }
    }

    // Final fallback
    return NextResponse.redirect(new URL('/', request.url));
  } catch (error: any) {
    console.error('[Tracking] Error:', error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getWhatsAppClient } from '@/lib/messaging/whatsapp-client';
import { generatePushContent } from '@/lib/prompts/whatsapp-push';
import { formatBreakingAlertRich } from '@/lib/messaging/whatsapp-templates';

/**
 * POST /api/admin/push
 * Manual push: send a breaking WhatsApp alert for a specific content item
 * Now sends images when thumbnail_url is available
 */
export async function POST(request: NextRequest) {
  try {
    const { contentId, testPhone } = await request.json();

    if (!contentId) {
      return NextResponse.json({ error: 'contentId is required' }, { status: 400 });
    }

    const supabase = createServerClient();
    const wa = getWhatsAppClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';

    // Get content with thumbnail and talent info
    const { data: content } = await supabase
      .from('il_content_items')
      .select('id, title, url, raw_text, thumbnail_url, talent_name')
      .eq('id', contentId)
      .single();

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    // Get latest metrics
    const { data: metrics } = await supabase
      .from('il_content_metrics')
      .select('views_30m, shares_30m, comments_30m')
      .eq('content_id', contentId)
      .order('snapshot_at', { ascending: false })
      .limit(1)
      .single();

    // Generate push content
    const pushContent = await generatePushContent(
      content.title,
      content.raw_text || '',
      {
        views_30m: metrics?.views_30m || 0,
        shares_30m: metrics?.shares_30m || 0,
        comments_30m: metrics?.comments_30m || 0,
      }
    );

    if (testPhone) {
      const { data: delivery } = await supabase
        .from('deliveries')
        .insert({
          channel: 'whatsapp',
          delivery_type: 'test',
          content_id: content.id,
          payload: pushContent,
          status: 'queued',
        })
        .select('id')
        .single();

      const trackingUrl = delivery
        ? `${appUrl}/api/t/${delivery.id}?url=${encodeURIComponent(content.url)}`
        : content.url;

      // Build rich message with image
      const richMessages = formatBreakingAlertRich(
        { ...pushContent, link: content.url },
        trackingUrl,
        content.thumbnail_url || undefined,
        content.talent_name || undefined
      );

      // Send — image or text
      const msg = richMessages[0];
      let result;
      if (msg.type === 'image' && msg.imageUrl) {
        result = await wa.sendFileByUrl(testPhone, msg.imageUrl, msg.caption || '', 'content.jpg');
      } else {
        result = await wa.sendMessage(testPhone, msg.text || msg.caption || '');
      }

      if (delivery) {
        await supabase
          .from('deliveries')
          .update({
            status: result.success ? 'sent' : 'failed',
            sent_at: result.success ? new Date().toISOString() : null,
            error: result.error || null,
          })
          .eq('id', delivery.id);
      }

      return NextResponse.json({
        success: result.success,
        message: result.success ? 'Test push sent with image!' : `Failed: ${result.error}`,
        hasImage: !!content.thumbnail_url,
        pushContent,
      });
    }

    return NextResponse.json({
      success: true,
      preview: true,
      pushContent,
      content: { title: content.title, url: content.url, thumbnail_url: content.thumbnail_url },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

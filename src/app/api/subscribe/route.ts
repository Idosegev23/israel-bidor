import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Interest → Segment mapping
const INTEREST_SEGMENT_MAP: Record<string, string> = {
  reality: 'reality_lovers',
  music: 'music_fans',
  gossip: 'celebs_gossip',
  tv_series: 'tv_series',
  sports: 'reality_lovers', // fallback
  cinema: 'tv_series',      // fallback
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const phone = (body?.phone ?? '').trim();
    const email = (body?.email ?? '').trim() || null;
    const interests: string[] = Array.isArray(body?.interests) ? body.interests : [];
    const whatsappPref = body?.whatsapp_pref ?? 'daily';

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'מספר טלפון חובה' },
        { status: 400 },
      );
    }

    // Normalize phone (Israeli format)
    const normalizedPhone = phone.replace(/[^0-9+]/g, '');
    if (normalizedPhone.length < 9) {
      return NextResponse.json(
        { success: false, error: 'מספר טלפון לא תקין' },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    // 1. Upsert user
    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert(
        {
          phone: normalizedPhone,
          email,
          whatsapp_opt_in: true,
          whatsapp_pref: whatsappPref,
          email_opt_in: !!email,
        },
        { onConflict: 'phone' },
      )
      .select('id')
      .single();

    if (userError || !user) {
      console.error('[Subscribe] User upsert failed:', userError?.message);
      return NextResponse.json(
        { success: false, error: 'שגיאה בשמירת המשתמש' },
        { status: 500 },
      );
    }

    const userId = user.id;

    // 2. Upsert user profile with interests
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert(
        {
          user_id: userId,
          interests: JSON.stringify(interests),
        },
        { onConflict: 'user_id' },
      );

    if (profileError) {
      console.error('[Subscribe] Profile upsert failed:', profileError.message);
    }

    // 3. Assign segments based on interests
    const { data: allSegments } = await supabase
      .from('segments')
      .select('id, name');

    if (allSegments && allSegments.length > 0) {
      const segmentMap = new Map(allSegments.map((s) => [s.name, s.id]));

      const segmentInserts: Array<{ user_id: string; segment_id: string; score: number }> = [];
      for (const interest of interests) {
        const segmentName = INTEREST_SEGMENT_MAP[interest];
        if (segmentName && segmentMap.has(segmentName)) {
          segmentInserts.push({
            user_id: userId,
            segment_id: segmentMap.get(segmentName)!,
            score: 1,
          });
        }
      }

      if (segmentInserts.length > 0) {
        // Delete old segments for this user, then insert fresh
        await supabase.from('user_segments').delete().eq('user_id', userId);
        const { error: segError } = await supabase
          .from('user_segments')
          .insert(segmentInserts);

        if (segError) {
          console.error('[Subscribe] Segment assign failed:', segError.message);
        }
      }
    }

    console.log(`[Subscribe] User ${normalizedPhone} subscribed with interests: ${interests.join(', ')}`);

    return NextResponse.json({
      success: true,
      userId,
    });
  } catch (error: any) {
    console.error('[Subscribe] Error:', error);
    return NextResponse.json(
      { success: false, error: 'שגיאה כללית' },
      { status: 500 },
    );
  }
}

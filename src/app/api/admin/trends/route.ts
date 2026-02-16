import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/trends
 * Returns US trends with Israel angles
 *
 * POST /api/admin/trends
 * Mark a trend as used/ignored
 */
export async function GET() {
  try {
    const supabase = createServerClient();

    const { data: trends } = await supabase
      .from('us_trends')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(30);

    return NextResponse.json({ success: true, trends: trends || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { trendId, status } = await request.json();

    if (!trendId || !['used', 'ignored'].includes(status)) {
      return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from('us_trends')
      .update({ status })
      .eq('id', trendId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

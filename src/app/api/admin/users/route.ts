import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/users
 * Returns all users with stats
 */
export async function GET() {
  try {
    const supabase = createServerClient();

    // Get all users
    const { data: users } = await supabase
      .from('users')
      .select('id, phone, email, whatsapp_opt_in, whatsapp_pref, email_opt_in, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    // Calculate stats
    const allUsers = users || [];
    const prefBreakdown: Record<string, number> = {};
    let waOptedIn = 0;
    let emailOptedIn = 0;

    for (const user of allUsers) {
      if (user.whatsapp_opt_in) waOptedIn++;
      if (user.email_opt_in) emailOptedIn++;
      prefBreakdown[user.whatsapp_pref] = (prefBreakdown[user.whatsapp_pref] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      users: allUsers,
      stats: {
        total: allUsers.length,
        wa_opted_in: waOptedIn,
        email_opted_in: emailOptedIn,
        pref_breakdown: prefBreakdown,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

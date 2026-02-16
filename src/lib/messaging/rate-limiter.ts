/**
 * Rate Limiter — Anti-spam controls for WhatsApp and Email
 *
 * Rules:
 * - Max 2 breaking WhatsApp alerts per user per day
 * - Max 6 WhatsApp messages per user per week
 * - Max 2 VIP emails per user per week
 * - STOP must work immediately, always
 */

import { createServerClient } from '@/lib/supabase/server';

// ============================================
// Types
// ============================================

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  counts?: {
    today: number;
    thisWeek: number;
  };
}

interface LimitConfig {
  max_per_day: number;
  max_per_week: number;
}

// ============================================
// Default Limits
// ============================================

const DEFAULT_BREAKING_LIMITS: LimitConfig = {
  max_per_day: 2,
  max_per_week: 6,
};

const DEFAULT_EMAIL_LIMITS: LimitConfig = {
  max_per_day: 1,
  max_per_week: 2,
};

// ============================================
// Rate Limit Check
// ============================================

/**
 * Check if a user can receive a message on a given channel
 */
export async function checkRateLimit(
  userId: string,
  channel: 'whatsapp' | 'email',
  deliveryType: 'breaking' | 'daily_digest' | 'weekly_digest' | 'vip'
): Promise<RateLimitResult> {
  const supabase = createServerClient();

  // First: check opt-in status
  const { data: user } = await supabase
    .from('users')
    .select('whatsapp_opt_in, whatsapp_pref, email_opt_in')
    .eq('id', userId)
    .single();

  if (!user) {
    return { allowed: false, reason: 'user_not_found' };
  }

  // Check channel opt-in
  if (channel === 'whatsapp' && !user.whatsapp_opt_in) {
    return { allowed: false, reason: 'whatsapp_not_opted_in' };
  }

  if (channel === 'email' && !user.email_opt_in) {
    return { allowed: false, reason: 'email_not_opted_in' };
  }

  // Check preference vs delivery type
  if (channel === 'whatsapp') {
    if (user.whatsapp_pref === 'off') {
      return { allowed: false, reason: 'whatsapp_pref_off' };
    }
    if (user.whatsapp_pref === 'breaking_only' && deliveryType !== 'breaking') {
      return { allowed: false, reason: 'pref_breaking_only' };
    }
    if (user.whatsapp_pref === 'weekly' && deliveryType !== 'weekly_digest') {
      return { allowed: false, reason: 'pref_weekly_only' };
    }
  }

  // Load limits from config
  const limits = await getLimitsFromConfig(supabase, channel);

  // Count recent deliveries
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Count today's deliveries
  const { count: todayCount } = await supabase
    .from('deliveries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('channel', channel)
    .eq('status', 'sent')
    .gte('sent_at', startOfDay);

  // Count this week's deliveries
  const { count: weekCount } = await supabase
    .from('deliveries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('channel', channel)
    .eq('status', 'sent')
    .gte('sent_at', startOfWeek);

  const today = todayCount || 0;
  const thisWeek = weekCount || 0;

  if (today >= limits.max_per_day) {
    return {
      allowed: false,
      reason: `daily_limit_reached (${today}/${limits.max_per_day})`,
      counts: { today, thisWeek },
    };
  }

  if (thisWeek >= limits.max_per_week) {
    return {
      allowed: false,
      reason: `weekly_limit_reached (${thisWeek}/${limits.max_per_week})`,
      counts: { today, thisWeek },
    };
  }

  return {
    allowed: true,
    counts: { today, thisWeek },
  };
}

// ============================================
// Helpers
// ============================================

async function getLimitsFromConfig(
  supabase: ReturnType<typeof createServerClient>,
  channel: 'whatsapp' | 'email'
): Promise<LimitConfig> {
  const configKey = channel === 'whatsapp' ? 'breaking_limits' : 'email_limits';
  const defaults = channel === 'whatsapp' ? DEFAULT_BREAKING_LIMITS : DEFAULT_EMAIL_LIMITS;

  try {
    const { data } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', configKey)
      .single();

    if (data?.value) {
      const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      return {
        max_per_day: parsed.max_per_day ?? defaults.max_per_day,
        max_per_week: parsed.max_per_week ?? defaults.max_per_week,
      };
    }
  } catch {
    // fallback to defaults
  }

  return defaults;
}

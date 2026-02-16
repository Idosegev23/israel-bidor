/**
 * WhatsApp Message Templates — Rich Visual Edition
 * Hebrew templates with image support, structured formatting, and visual hierarchy
 */

// ============================================
// Types
// ============================================

export interface BreakingAlertData {
  headline: string;
  why_hot: string;
  link: string;
  cta: string;
}

export interface DigestItem {
  title: string;
  why_hot: string;
  link: string;
  thumbnail_url?: string;
  talent_name?: string;
  heat_score?: number;
}

export interface RichMessage {
  type: 'text' | 'image';
  text?: string;
  imageUrl?: string;
  caption?: string;
}

// ============================================
// Breaking Alert — Image + Caption
// ============================================

/**
 * Creates a rich breaking alert with image.
 * Returns an array of messages: first an image, then optionally text.
 */
export function formatBreakingAlertRich(
  data: BreakingAlertData,
  trackingUrl: string,
  thumbnailUrl?: string,
  talentName?: string
): RichMessage[] {
  const messages: RichMessage[] = [];

  const caption = [
    `🔴 *עדכון חם*`,
    ``,
    `*${data.headline}*`,
    ``,
    data.why_hot,
    talentName ? `\n👤 ${talentName}` : '',
    ``,
    `━━━━━━━━━━━━━━━━━`,
    ``,
    `🔗 *לקריאה המלאה:*`,
    trackingUrl,
    ``,
    `💬 _${data.cta}_`,
    ``,
    `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈`,
    `1️⃣ יומי  ·  2️⃣ שובר בלבד  ·  3️⃣ שבועי`,
    `STOP ביטול  ·  HELP עזרה`,
  ].filter(Boolean).join('\n');

  if (thumbnailUrl) {
    messages.push({
      type: 'image',
      imageUrl: thumbnailUrl,
      caption,
    });
  } else {
    messages.push({ type: 'text', text: caption });
  }

  return messages;
}

/** Backward-compatible text-only version */
export function formatBreakingAlert(data: BreakingAlertData, trackingUrl: string): string {
  return formatBreakingAlertRich(data, trackingUrl)[0].text || formatBreakingAlertRich(data, trackingUrl)[0].caption || '';
}

// ============================================
// Daily Digest — Lead Image + List
// ============================================

export function formatDailyDigestRich(
  items: DigestItem[],
  trackingUrls: string[]
): RichMessage[] {
  const messages: RichMessage[] = [];

  if (items.length === 0) return [{ type: 'text', text: '📰 אין עדכונים חמים היום. נחזור מחר!' }];

  // Lead item with image
  const lead = items[0];
  const leadCaption = [
    `📰 *העדכון היומי — ישראל בידור*`,
    ``,
    `🥇 *${lead.title}*`,
    lead.talent_name ? `👤 ${lead.talent_name}` : '',
    lead.heat_score ? `🔥 Heat: ${lead.heat_score.toFixed(0)}` : '',
    ``,
    lead.why_hot,
    ``,
    `🔗 ${trackingUrls[0] || lead.link}`,
  ].filter(Boolean).join('\n');

  if (lead.thumbnail_url) {
    messages.push({
      type: 'image',
      imageUrl: lead.thumbnail_url,
      caption: leadCaption,
    });
  } else {
    messages.push({ type: 'text', text: leadCaption });
  }

  // Remaining items as text list
  if (items.length > 1) {
    const remaining = items.slice(1, 6).map((item, i) => {
      const num = i + 2;
      const heatBadge = item.heat_score && item.heat_score > 100 ? ' 🔥' : '';
      return [
        `${getNumberEmoji(num)} *${item.title}*${heatBadge}`,
        item.talent_name ? `    👤 ${item.talent_name}` : '',
        `    ${item.why_hot}`,
        `    🔗 ${trackingUrls[i + 1] || item.link}`,
      ].filter(Boolean).join('\n');
    }).join('\n\n');

    const listMessage = [
      `━━━━━━━━━━━━━━━━━`,
      ``,
      remaining,
      ``,
      `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈`,
      `1️⃣ יומי  ·  2️⃣ שובר  ·  3️⃣ שבועי  ·  STOP ביטול`,
    ].join('\n');

    messages.push({ type: 'text', text: listMessage });
  }

  return messages;
}

/** Backward-compatible text version */
export function formatDailyDigest(items: DigestItem[], trackingUrls: string[]): string {
  const rich = formatDailyDigestRich(items, trackingUrls);
  return rich.map(m => m.text || m.caption || '').join('\n\n');
}

// ============================================
// Welcome — Brand Image + Greeting
// ============================================

export function formatWelcomeRich(name?: string, brandImageUrl?: string): RichMessage[] {
  const greeting = name ? `היי ${name}! 👋` : 'היי! 👋';
  const messages: RichMessage[] = [];

  const welcomeText = [
    greeting,
    ``,
    `ברוכ/ה הבא/ה ל-*ישראל בידור* 🌟`,
    `העדכונים הכי חמים מעולם הבידור הישראלי — ישר אליך.`,
    ``,
    `🎯 *בחר/י סגנון עדכונים:*`,
    ``,
    `1️⃣  📰 *יומי* — סיכום כל יום בבוקר`,
    `2️⃣  🔥 *שובר בלבד* — רק כשמשהו באמת חם`,
    `3️⃣  📋 *שבועי* — סיכום פעם בשבוע`,
    ``,
    `💬 אפשר גם סתם לדבר איתי — שאל/י מה שבא!`,
    ``,
    `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈`,
    `STOP ביטול  ·  HELP עזרה`,
  ].join('\n');

  if (brandImageUrl) {
    messages.push({
      type: 'image',
      imageUrl: brandImageUrl,
      caption: welcomeText,
    });
  } else {
    messages.push({ type: 'text', text: welcomeText });
  }

  return messages;
}

/** Backward-compatible text version */
export function formatWelcome(name?: string): string {
  return formatWelcomeRich(name)[0].text || formatWelcomeRich(name)[0].caption || '';
}

// ============================================
// Preference Updated
// ============================================

export function formatPrefUpdated(pref: string): string {
  const prefStyles: Record<string, { name: string; emoji: string; desc: string }> = {
    daily: { name: 'יומי', emoji: '📰', desc: 'תקבל/י סיכום כל יום בבוקר' },
    breaking_only: { name: 'שובר בלבד', emoji: '🔥', desc: 'רק כשמשהו באמת חם' },
    weekly: { name: 'שבועי', emoji: '📋', desc: 'סיכום פעם בשבוע' },
    off: { name: 'כבוי', emoji: '🔕', desc: 'לא תקבל/י הודעות' },
  };

  const style = prefStyles[pref] || { name: pref, emoji: '✅', desc: '' };

  return [
    `✅ *עודכן בהצלחה!*`,
    ``,
    `${style.emoji} ההגדרה שלך: *${style.name}*`,
    style.desc ? `_${style.desc}_` : '',
    ``,
    `💡 אפשר לשנות בכל רגע — שלח/י 1, 2, 3 או STOP`,
  ].filter(Boolean).join('\n');
}

// ============================================
// HELP Menu
// ============================================

export function formatHelp(): string {
  return [
    `📖 *ישראל בידור — תפריט*`,
    ``,
    `🎯 *הגדרות עדכונים:*`,
    `1️⃣  📰 יומי — סיכום כל יום`,
    `2️⃣  🔥 שובר בלבד — רק חם`,
    `3️⃣  📋 שבועי — פעם בשבוע`,
    ``,
    `⚙️ *פקודות:*`,
    `STOP — ביטול כל ההודעות`,
    `HELP — התפריט הזה`,
    ``,
    `💬 *או סתם דבר/י איתי!*`,
    `שאל/י על טאלנטים, טרנדים,`,
    `או מה חם עכשיו בבידור הישראלי 🇮🇱`,
  ].join('\n');
}

// ============================================
// STOP Confirmation
// ============================================

export function formatStopConfirmation(): string {
  return [
    `✋ *הוסר/ת מרשימת התפוצה*`,
    ``,
    `לא תקבל/י יותר הודעות מאיתנו.`,
    ``,
    `🔄 רוצה לחזור? שלח/י *HELP* בכל עת.`,
    `נשמח לראות אותך שוב! 👋`,
  ].join('\n');
}

// ============================================
// Helpers
// ============================================

function getNumberEmoji(n: number): string {
  const emojis: Record<number, string> = {
    1: '1️⃣', 2: '2️⃣', 3: '3️⃣', 4: '4️⃣', 5: '5️⃣',
    6: '6️⃣', 7: '7️⃣', 8: '8️⃣', 9: '9️⃣', 10: '🔟',
  };
  return emojis[n] || `${n}.`;
}

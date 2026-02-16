/**
 * Conversation Handler — Smart chat agent for WhatsApp
 * Manages natural conversation + asks directed questions to build user profile
 */

import { GoogleGenAI } from '@google/genai';
import { createServerClient } from '@/lib/supabase/server';

// ============================================
// Types
// ============================================

export interface ConversationContext {
  userId: string;
  recentMessages: Array<{ role: string; message: string }>;
  profile: {
    interests: string[];
    entities: string[];
    sensitivities: string[];
    tone_preference: string | null;
    engagement_score: number;
  } | null;
}

// ============================================
// System Prompt
// ============================================

const AGENT_SYSTEM_PROMPT = `אתה הסוכן החכם של "ישראל בידור" — פלטפורמת בידור ישראלית.

המשימה שלך:
1. לנהל שיחה טבעית ונעימה בעברית
2. ללמוד על העדפות המשתמש דרך שיחה (לא חקירה!)
3. לשלב שאלות מכוונות באופן טבעי

שאלות שאתה רוצה לשלב (לא בבת אחת, אחת-שתיים לשיחה):
- "מה הכי מעניין אותך לאחרונה?"
- "איזה טאלנטים אתה אוהב/לא סובל?"
- "יותר ריאליטי / מוזיקה / רכילות / סדרות?"
- "משהו שאתה לא רוצה לקבל עליו עדכונים?"
- "מעדיף תוכן קליל או מעמיק?"

כללים:
- תמיד בעברית, סלנג מותר
- תמציתי — 2-4 משפטים מקסימום
- אל תחקור — שלב שאלות באופן טבעי
- אם מישהו שותף דעה, הגב ואז שאל משהו נוסף
- אם לא בטוח — אל תנחש, שאל
- אם המשתמש מדבר על תוכן ספציפי, השתמש בזה ללמוד על העדפותיו`;

// ============================================
// Generate Response
// ============================================

export async function generateChatResponse(
  context: ConversationContext
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const client = new GoogleGenAI({ apiKey });

  // Build conversation history
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  // Add system context with live data
  let systemContext = AGENT_SYSTEM_PROMPT;

  // Inject live context (hot content + active talents from the scraper)
  try {
    const liveContext = await loadLiveContext();
    if (liveContext) {
      systemContext += `\n\n--- מידע עדכני מהמערכת ---\n${liveContext}\n---\nהשתמש במידע הזה כדי להמליץ, להגיב ולהתייחס לתוכן ולטאלנטים אמיתיים. אל תמציא מידע.`;
    }
  } catch (e) {
    // Live context is optional — don't fail the conversation
    console.warn('[Chat] Failed to load live context:', e);
  }

  if (context.profile) {
    systemContext += `\n\nמידע שכבר יש לנו על המשתמש:`;
    if (context.profile.interests.length > 0) {
      systemContext += `\nתחומי עניין: ${context.profile.interests.join(', ')}`;
    }
    if (context.profile.entities.length > 0) {
      systemContext += `\nטאלנטים/תכניות: ${context.profile.entities.join(', ')}`;
    }
    if (context.profile.sensitivities.length > 0) {
      systemContext += `\nרגישויות: ${context.profile.sensitivities.join(', ')}`;
    }
    if (context.profile.tone_preference) {
      systemContext += `\nטון מועדף: ${context.profile.tone_preference}`;
    }
    systemContext += `\n\nהשתמש במידע הזה כדי לא לשאול שוב על דברים שכבר ידועים.`;
  }

  contents.push({
    role: 'user',
    parts: [{ text: systemContext }],
  });

  contents.push({
    role: 'model',
    parts: [{ text: 'הבנתי, אני מוכן לשוחח!' }],
  });

  // Add recent messages
  for (const msg of context.recentMessages) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.message }],
    });
  }

  const response = await client.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents,
    config: {
      temperature: 0.8,
      maxOutputTokens: 300,
    },
  });

  return response.text || 'סליחה, לא הצלחתי להגיב. נסה שוב?';
}

// ============================================
// Load Conversation Context
// ============================================

export async function loadConversationContext(userId: string): Promise<ConversationContext> {
  const supabase = createServerClient();

  // Get recent messages
  const { data: messages } = await supabase
    .from('chat_messages')
    .select('role, message')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Get existing profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('interests, entities, sensitivities, tone_preference, engagement_score')
    .eq('user_id', userId)
    .single();

  return {
    userId,
    recentMessages: (messages || []).reverse(),
    profile: profile || null,
  };
}

// ============================================
// Load Live Context (hot content + talents)
// ============================================

/**
 * Fetch current hot content and trending talent data from the DB
 * so the chat agent can reference real, up-to-date information
 */
export async function loadLiveContext(): Promise<string> {
  const supabase = createServerClient();
  const contextParts: string[] = [];

  // Get top 5 hot content items right now
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const { data: hotContent } = await supabase
    .from('il_content_items')
    .select(`
      title, source, category, published_at,
      il_content_metrics!inner (heat_score)
    `)
    .gte('published_at', sixHoursAgo)
    .order('published_at', { ascending: false })
    .limit(20);

  if (hotContent && hotContent.length > 0) {
    // Sort by heat_score
    const sorted = hotContent
      .map((item: any) => ({
        title: item.title,
        source: item.source,
        category: item.category,
        heat: item.il_content_metrics?.[0]?.heat_score || 0,
      }))
      .sort((a: any, b: any) => b.heat - a.heat)
      .slice(0, 5);

    if (sorted.length > 0) {
      contextParts.push('תוכן חם עכשיו:');
      for (const item of sorted) {
        contextParts.push(`- ${item.title} (${item.source}, heat: ${item.heat})`);
      }
    }
  }

  // Get recently scraped talent names for reference
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: activeTalents } = await supabase
    .from('talent_profiles')
    .select('full_name, username, category, followers_count')
    .gte('last_scraped_at', oneDayAgo)
    .order('followers_count', { ascending: false })
    .limit(10);

  if (activeTalents && activeTalents.length > 0) {
    contextParts.push('\nטאלנטים פעילים שנסרקו לאחרונה:');
    for (const t of activeTalents) {
      contextParts.push(`- ${t.full_name || t.username} (@${t.username}, ${(t.followers_count || 0).toLocaleString()} עוקבים, ${t.category || 'כללי'})`);
    }
  }

  return contextParts.join('\n');
}

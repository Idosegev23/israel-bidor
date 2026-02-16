/**
 * Profile Extractor — AI extraction of user preferences from chat
 * Prompt B: Chat → Profile JSON
 */

import { GoogleGenAI } from '@google/genai';
import { createServerClient } from '@/lib/supabase/server';

// ============================================
// Types
// ============================================

export interface ExtractedProfile {
  interests: string[];
  entities: string[];
  sensitivities: string[];
  tone_preference: string | null;
  engagement_score: number;
  notes: string;
}

// ============================================
// Prompt
// ============================================

const SYSTEM_PROMPT = `חלץ העדפות קהל מובנות משיחת צ'אט בעברית. היה שמרני ואל תנחש.

כללים:
- interests: רק קטגוריות שהמשתמש ציין במפורש (reality, music, gossip, tv_series, sports, politics, fashion, food)
- entities: שמות ספציפיים של טאלנטים, תכניות, אמנים שהוזכרו
- sensitivities: נושאים שהמשתמש אמר שלא רוצה (politics, violence, hard_gossip, religion)
- tone_preference: null אם לא ברור, אחרת: "light" / "serious" / "cynical" / "mixed"
- engagement_score: 0-10 לפי כמה פעיל ומעורב המשתמש בשיחה
- notes: משפט אחד קצר עם תובנה כללית`;

function buildExtractionPrompt(messages: Array<{ role: string; message: string }>): string {
  const transcript = messages
    .map((m) => `${m.role === 'user' ? 'משתמש' : 'סוכן'}: ${m.message}`)
    .join('\n');

  return `תמליל שיחה:
${transcript}

החזר JSON בלבד:
{
  "interests": [],
  "entities": [],
  "sensitivities": [],
  "tone_preference": null,
  "engagement_score": 0,
  "notes": "..."
}`;
}

// ============================================
// Extract Profile from Chat
// ============================================

export async function extractProfileFromChat(
  messages: Array<{ role: string; message: string }>
): Promise<ExtractedProfile> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const client = new GoogleGenAI({ apiKey });

  const response = await client.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: buildExtractionPrompt(messages),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          interests: { type: 'array', items: { type: 'string' } },
          entities: { type: 'array', items: { type: 'string' } },
          sensitivities: { type: 'array', items: { type: 'string' } },
          tone_preference: { type: 'string', nullable: true },
          engagement_score: { type: 'number' },
          notes: { type: 'string' },
        },
        required: ['interests', 'entities', 'sensitivities', 'engagement_score', 'notes'],
      },
    },
  });

  if (!response.text) {
    throw new Error('Empty extraction response');
  }

  return JSON.parse(response.text) as ExtractedProfile;
}

// ============================================
// Batch Process: Extract profiles for all users with recent chat
// ============================================

export async function extractProfilesForRecentChats(): Promise<{
  processed: number;
  updated: number;
  errors: string[];
}> {
  const supabase = createServerClient();
  const errors: string[] = [];
  let processed = 0;
  let updated = 0;

  // Find users with messages in the last hour that haven't been processed
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: recentUsers } = await supabase
    .from('chat_messages')
    .select('user_id')
    .eq('role', 'user')
    .gte('created_at', oneHourAgo);

  if (!recentUsers || recentUsers.length === 0) {
    return { processed: 0, updated: 0, errors: [] };
  }

  // Deduplicate user IDs
  const userIds = [...new Set(recentUsers.map((m) => m.user_id))];

  for (const userId of userIds) {
    try {
      // Get last 10 messages for this user
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('role, message')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!messages || messages.length < 3) {
        continue; // Need at least 3 messages
      }

      processed++;

      // Extract profile
      const extracted = await extractProfileFromChat(messages.reverse());

      // Get existing profile
      const { data: existing } = await supabase
        .from('user_profiles')
        .select('interests, entities, sensitivities')
        .eq('user_id', userId)
        .single();

      // Merge: combine new with existing (don't lose data)
      const mergedInterests = mergeArrays(existing?.interests || [], extracted.interests);
      const mergedEntities = mergeArrays(existing?.entities || [], extracted.entities);
      const mergedSensitivities = mergeArrays(existing?.sensitivities || [], extracted.sensitivities);

      // Upsert profile
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          interests: mergedInterests,
          entities: mergedEntities,
          sensitivities: mergedSensitivities,
          tone_preference: extracted.tone_preference,
          engagement_score: extracted.engagement_score,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        errors.push(`[${userId}] DB error: ${error.message}`);
      } else {
        updated++;
      }
    } catch (error: any) {
      errors.push(`[${userId}] ${error.message}`);
    }
  }

  console.log(`[ProfileExtract] ${processed} processed, ${updated} updated, ${errors.length} errors`);
  return { processed, updated, errors };
}

/** Merge two string arrays, keeping unique values */
function mergeArrays(existing: string[], newItems: string[]): string[] {
  const set = new Set([...existing, ...newItems]);
  return [...set];
}

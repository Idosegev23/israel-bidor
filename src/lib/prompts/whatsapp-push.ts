/**
 * Prompt A: WhatsApp Push — "Why is this hot?"
 * Generates short, clear, non-clickbait WhatsApp alerts in Hebrew
 */

import { GoogleGenAI } from '@google/genai';

// ============================================
// Types
// ============================================

export interface WhatsAppPushContent {
  headline: string;    // <=8 words
  why_hot: string;     // <=120 chars
  cta: string;         // Short question
}

// ============================================
// Prompt
// ============================================

const SYSTEM_PROMPT = `אתה עורך של מותג בידור ישראלי. כתוב עדכוני וואטסאפ קצרים, ברורים, ולא קליקבייטיים בעברית.

כללים:
- headline: עד 8 מילים, תמציתי ומדויק
- why_hot: עד 120 תווים, הסבר למה זה חם *עכשיו*
- cta: שאלה קצרה אחת שמעודדת תגובה
- אל תמציא מידע
- אל תגזים
- השתמש בעברית טבעית`;

function buildUserPrompt(title: string, rawText: string, metrics: {
  views_30m: number;
  shares_30m: number;
  comments_30m: number;
}): string {
  return `צור עדכון וואטסאפ עבור התוכן הזה:
כותרת: ${title}
תקציר: ${rawText?.substring(0, 500) || 'לא זמין'}
מדדים: צפיות_30דק=${metrics.views_30m}, שיתופים_30דק=${metrics.shares_30m}, תגובות_30דק=${metrics.comments_30m}

החזר JSON בלבד:
{
  "headline": "... (עד 8 מילים)",
  "why_hot": "... (עד 120 תווים)",
  "cta": "... (שאלה קצרה אחת)"
}`;
}

// ============================================
// Generate Push Content
// ============================================

export async function generatePushContent(
  title: string,
  rawText: string,
  metrics: { views_30m: number; shares_30m: number; comments_30m: number }
): Promise<WhatsAppPushContent> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const client = new GoogleGenAI({ apiKey });

  const response = await client.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: buildUserPrompt(title, rawText, metrics),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          headline: { type: 'string' },
          why_hot: { type: 'string' },
          cta: { type: 'string' },
        },
        required: ['headline', 'why_hot', 'cta'],
      },
    },
  });

  if (!response.text) {
    throw new Error('Empty response from Gemini');
  }

  const result: WhatsAppPushContent = JSON.parse(response.text);

  // Validate lengths
  if (result.headline.split(' ').length > 12) {
    result.headline = result.headline.split(' ').slice(0, 8).join(' ');
  }
  if (result.why_hot.length > 150) {
    result.why_hot = result.why_hot.substring(0, 120) + '...';
  }

  return result;
}

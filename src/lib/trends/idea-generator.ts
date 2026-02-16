/**
 * US→IL Idea Generator — Translates US trends into Israeli content ideas
 * Prompt C: generates localized angles, Hebrew headlines, and format recommendations
 */

import { GoogleGenAI } from '@google/genai';
import { type DetectedTrend } from './spike-detection';

// ============================================
// Types
// ============================================

export interface IsraelAngles {
  why_hot_us: string;
  israel_prediction_3_7_days: string;
  local_angles: string[];
  recommended_format: 'Reel' | 'Story' | 'Article' | 'Poll';
  hebrew_headlines: string[];
  sources_to_read: Array<{ title: string; url: string }>;
}

// ============================================
// Prompt
// ============================================

const SYSTEM_PROMPT = `אתה סוכן אסטרטגיית תוכן של "ישראל בידור".
אתה מציע זוויות תוכן מקומיות בהתבסס על טרנדים אמריקאיים.

כללים:
- הסבר קצר למה זה חם בארה"ב
- תחזית: איך זה יגיע לישראל ב-3-7 ימים
- 2 זוויות מקומיות (ספציפיות, לא כלליות)
- פורמט מומלץ: Reel/Story/Article/Poll
- 3 כותרות בעברית (קצרות, לא קליקבייט)
- מקורות לקריאה נוספת`;

function buildIdeaPrompt(trend: DetectedTrend): string {
  const topTitles = trend.supporting_items
    .slice(0, 5)
    .map((i) => `- ${i.title} (${i.source})`)
    .join('\n');

  return `טרנד שזוהה בארה"ב:
נושא: ${trend.topic}
מקורות: ${trend.sources.join(', ')}
דוגמאות:
${topTitles}

החזר JSON בלבד:
{
  "why_hot_us": "...",
  "israel_prediction_3_7_days": "...",
  "local_angles": ["...", "..."],
  "recommended_format": "Reel|Story|Article|Poll",
  "hebrew_headlines": ["...", "...", "..."],
  "sources_to_read": [{"title": "...", "url": "..."}]
}`;
}

// ============================================
// Generate Ideas
// ============================================

export async function generateIsraelAngles(trend: DetectedTrend): Promise<IsraelAngles> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const client = new GoogleGenAI({ apiKey });

  const response = await client.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: buildIdeaPrompt(trend),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          why_hot_us: { type: 'string' },
          israel_prediction_3_7_days: { type: 'string' },
          local_angles: { type: 'array', items: { type: 'string' } },
          recommended_format: { type: 'string', enum: ['Reel', 'Story', 'Article', 'Poll'] },
          hebrew_headlines: { type: 'array', items: { type: 'string' } },
          sources_to_read: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                url: { type: 'string' },
              },
            },
          },
        },
        required: ['why_hot_us', 'israel_prediction_3_7_days', 'local_angles', 'recommended_format', 'hebrew_headlines'],
      },
    },
  });

  if (!response.text) {
    throw new Error('Empty response from Gemini');
  }

  return JSON.parse(response.text) as IsraelAngles;
}

/**
 * Generate ideas for multiple trends and return a formatted digest
 */
export async function generateTrendDigest(
  trends: DetectedTrend[]
): Promise<Array<DetectedTrend & { israel_angles: IsraelAngles }>> {
  const results: Array<DetectedTrend & { israel_angles: IsraelAngles }> = [];

  for (const trend of trends.slice(0, 5)) {
    try {
      const angles = await generateIsraelAngles(trend);
      results.push({ ...trend, israel_angles: angles });

      // Rate limit
      await new Promise((r) => setTimeout(r, 1000));
    } catch (error: any) {
      console.error(`[IdeaGen] Failed for "${trend.topic}":`, error.message);
    }
  }

  return results;
}

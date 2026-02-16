/**
 * Gemini 3 Pro Client for Israel Bidur
 * Using NEW @google/genai SDK with gemini-3-pro-preview
 */

import { GoogleGenAI } from '@google/genai';

// Lazy initialization
let _genAI: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!_genAI) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    _genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  return _genAI;
}

// ============================================
// Type Definitions
// ============================================

export interface TalentInsights {
  personality: {
    traits: string[];
    tone: string;
    style: string;
    voice: string;
  };
  topics: Array<{
    name: string;
    frequency: number;
    sentiment: 'positive' | 'neutral' | 'negative';
    examples: string[];
  }>;
  partnerships: Array<{
    brand: string;
    type: 'sponsored' | 'organic' | 'affiliate';
    confidence: number;
    posts: string[];
    evidence: string;
  }>;
  coupons: Array<{
    code: string;
    brand: string;
    discount_type: string;
    discovered_at: string;
    post_shortcode: string;
  }>;
  audience_insights: {
    primary_demographics: string;
    engagement_style: string;
    content_preferences: string[];
  };
  summary_text: string;
  key_themes: string[];
}

export interface ProcessingResult {
  success: boolean;
  insights?: TalentInsights;
  error?: string;
  tokensUsed?: number;
  processingTimeMs?: number;
}

// ============================================
// Gemini 3 Pro Processor
// ============================================

export class GeminiProcessor {
  /**
   * Process talent data and extract insights
   */
  async processTalentData(
    profile: any,
    posts: any[],
    highlights: any[]
  ): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      console.log(`[Gemini] Processing talent: ${profile.username}`);

      const prompt = this.buildAnalysisPrompt(profile, posts, highlights);

      // Generate insights with Gemini 3 Pro
      const genAI = getGenAI();
      const response = await genAI.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              personality: {
                type: 'object',
                properties: {
                  traits: { type: 'array', items: { type: 'string' } },
                  tone: { type: 'string' },
                  style: { type: 'string' },
                  voice: { type: 'string' },
                },
                required: ['traits', 'tone', 'style', 'voice'],
              },
              topics: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    frequency: { type: 'number' },
                    sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
                    examples: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
              partnerships: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    brand: { type: 'string' },
                    type: { type: 'string', enum: ['sponsored', 'organic', 'affiliate'] },
                    confidence: { type: 'number' },
                    posts: { type: 'array', items: { type: 'string' } },
                    evidence: { type: 'string' },
                  },
                },
              },
              coupons: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    code: { type: 'string' },
                    brand: { type: 'string' },
                    discount_type: { type: 'string' },
                    discovered_at: { type: 'string' },
                    post_shortcode: { type: 'string' },
                  },
                },
              },
              audience_insights: {
                type: 'object',
                properties: {
                  primary_demographics: { type: 'string' },
                  engagement_style: { type: 'string' },
                  content_preferences: { type: 'array', items: { type: 'string' } },
                },
              },
              summary_text: { type: 'string' },
              key_themes: { type: 'array', items: { type: 'string' } },
            },
            required: ['personality', 'topics', 'summary_text', 'key_themes'],
          },
        },
      });

      if (!response.text) {
        throw new Error('No response text received from Gemini');
      }

      const insights: TalentInsights = JSON.parse(response.text);
      const processingTime = Date.now() - startTime;

      console.log(
        `[Gemini] Successfully processed ${profile.username} in ${processingTime}ms`
      );

      return {
        success: true,
        insights,
        tokensUsed: response.usageMetadata?.totalTokenCount,
        processingTimeMs: processingTime,
      };
    } catch (error: any) {
      console.error('[Gemini] Processing failed:', error);

      return {
        success: false,
        error: error.message,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Build comprehensive analysis prompt
   */
  private buildAnalysisPrompt(profile: any, posts: any[], highlights: any[]): string {
    const postsData = posts.slice(0, 50).map((post) => ({
      caption: post.caption,
      likes: post.likes_count,
      comments: post.comments_count,
      date: post.posted_at,
      type: post.media_type,
      location: post.location,
    }));

    const profileSummary = {
      username: profile.username,
      fullName: profile.full_name,
      bio: profile.bio,
      followers: profile.followers_count,
      verified: profile.is_verified,
      category: profile.category,
    };

    return `אתה מנתח מקצועי של תוכן דיגיטלי עבור "Israel Bidur" - פלטפורמת בידור ישראלית.

**משימה:** נתח את הפרופיל הבא וחלץ insights מקצועיים.

**פרופיל:**
${JSON.stringify(profileSummary, null, 2)}

**${posts.length} פוסטים אחרונים:**
${JSON.stringify(postsData, null, 2)}

**הוראות:**
1. נתח את האישיות, טון הדיבור, וסגנון התוכן
2. זהה נושאים חוזרים ומגמות
3. מצא שיתופי פעולה עם מותגים (ממומן או אורגני)
4. חפש קודי קופון, הנחות, או פרומואים
5. הבן את סגנון האנגייג'מנט עם הקהל

**חשוב:**
- השתמש בעברית לכל התיאורים
- היה ספציפי ומדויק
- דווח רק על ממצאים עם אמינות גבוהה
- אם אין מספיק מידע, ציין "לא זמין"`;
  }

  /**
   * Batch processing for multiple talents
   */
  async processBatch(
    talents: Array<{ profile: any; posts: any[]; highlights: any[] }>
  ): Promise<ProcessingResult[]> {
    console.log(`[Gemini] Starting batch processing for ${talents.length} talents`);

    const results: ProcessingResult[] = [];

    for (const talent of talents) {
      const result = await this.processTalentData(
        talent.profile,
        talent.posts,
        talent.highlights
      );

      results.push(result);

      // Rate limiting: wait 1 second between requests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(
      `[Gemini] Batch processing complete. Success: ${results.filter((r) => r.success).length}/${results.length}`
    );

    return results;
  }
}

// ============================================
// Singleton Instance
// ============================================

let processorInstance: GeminiProcessor | null = null;

export function getGeminiProcessor(): GeminiProcessor {
  if (!processorInstance) {
    processorInstance = new GeminiProcessor();
  }
  return processorInstance;
}

export async function processTalent(
  profile: any,
  posts: any[],
  highlights: any[]
): Promise<ProcessingResult> {
  const processor = getGeminiProcessor();
  return processor.processTalentData(profile, posts, highlights);
}

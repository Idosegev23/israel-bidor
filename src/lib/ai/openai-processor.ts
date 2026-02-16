/**
 * OpenAI GPT-5.2 Processor for Israel Bidur
 * Alternative to Gemini when quota exceeded
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

export class OpenAIProcessor {
  async processTalentData(
    profile: any,
    posts: any[],
    highlights: any[]
  ): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      console.log(`[OpenAI] Processing talent: ${profile.username}`);

      const prompt = this.buildAnalysisPrompt(profile, posts, highlights);

      const completion = await openai.chat.completions.create({
        model: 'gpt-5.2',
        messages: [
          {
            role: 'system',
            content: 'אתה מנתח מקצועי של תוכן דיגיטלי עבור Israel Bidur. תענה רק ב-JSON תקין.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 1.0,
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const insights: TalentInsights = JSON.parse(response);

      const processingTime = Date.now() - startTime;

      console.log(
        `[OpenAI] Successfully processed ${profile.username} in ${processingTime}ms`
      );

      return {
        success: true,
        insights,
        tokensUsed: completion.usage?.total_tokens,
        processingTimeMs: processingTime,
      };
    } catch (error: any) {
      console.error('[OpenAI] Processing failed:', error);

      return {
        success: false,
        error: error.message,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

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

    return `נתח את הפרופיל הבא וחלץ insights מקצועיים.

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

החזר JSON בפורמט הבא:
{
  "personality": {
    "traits": ["תיאור תכונות"],
    "tone": "טון כללי",
    "style": "סגנון תוכן",
    "voice": "קול ייחודי"
  },
  "topics": [
    {
      "name": "נושא",
      "frequency": 10,
      "sentiment": "positive",
      "examples": ["דוגמאות"]
    }
  ],
  "partnerships": [
    {
      "brand": "מותג",
      "type": "sponsored",
      "confidence": 0.95,
      "posts": ["shortcode"],
      "evidence": "ראיות"
    }
  ],
  "coupons": [
    {
      "code": "CODE",
      "brand": "מותג",
      "discount_type": "20%",
      "discovered_at": "2024-01-15",
      "post_shortcode": "xyz"
    }
  ],
  "audience_insights": {
    "primary_demographics": "תיאור קהל",
    "engagement_style": "סגנון אינטראקציה",
    "content_preferences": ["העדפות"]
  },
  "summary_text": "סיכום כללי",
  "key_themes": ["נושא 1", "נושא 2"]
}`;
  }
}

let processorInstance: OpenAIProcessor | null = null;

export function getOpenAIProcessor(): OpenAIProcessor {
  if (!processorInstance) {
    processorInstance = new OpenAIProcessor();
  }
  return processorInstance;
}

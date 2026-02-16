/**
 * Prompt C: US Trend → Israel Ideas
 * System and user prompts for localizing US entertainment trends
 * (Used by lib/trends/idea-generator.ts)
 */

export const TREND_IDEAS_SYSTEM_PROMPT = `אתה סוכן אסטרטגיית תוכן של "ישראל בידור".
אתה מציע זוויות תוכן מקומיות בהתבסס על טרנדים אמריקאיים.

עקרונות:
1. הסבר קצר וברור למה הנושא חם בארה"ב
2. תחזית מציאותית — איך ומתי זה יגיע לישראל
3. זוויות מקומיות ספציפיות (לא "נדבר על זה" — אלא "כותרת + מי + למה")
4. פורמט שמתאים לקהל ישראלי (Reel קצר > כתבה ארוכה)
5. כותרות בעברית שטבעיות ולא קליקבייט

פורמטים מומלצים:
- Reel: תוכן ויזואלי קצר, מושלם לגוססיפ/ריאקציה
- Story: עדכון מהיר, behind the scenes
- Article: ניתוח מעמיק, השוואות
- Poll: שאלה לקהל, engagement גבוה`;

export function buildTrendIdeaPrompt(
  topic: string,
  sources: string[],
  topTitles: Array<{ title: string; source: string }>
): string {
  const titlesStr = topTitles
    .map((t) => `- ${t.title} (${t.source})`)
    .join('\n');

  return `טרנד שזוהה בארה"ב:
נושא: ${topic}
מקורות: ${sources.join(', ')}
דוגמאות:
${titlesStr}

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

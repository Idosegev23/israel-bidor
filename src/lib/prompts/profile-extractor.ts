/**
 * Prompt B: Profile Extractor
 * System and user prompts for extracting user profiles from chat
 * (Used by lib/chat-agent/profile-extractor.ts)
 */

export const PROFILE_EXTRACTOR_SYSTEM_PROMPT = `חלץ העדפות קהל מובנות משיחת צ'אט בעברית. היה שמרני ואל תנחש.

קטגוריות interests מותרות:
reality, music, gossip, tv_series, sports, politics, fashion, food, comedy, drama, streaming, concerts, eurovision

sensitivities מותרות:
politics, violence, hard_gossip, religion, sexual_content

tone_preference אפשרויות:
light, serious, cynical, mixed, null (אם לא ברור)

engagement_score:
0 = לא פעיל כלל
1-3 = נמוך (תגובות קצרות)
4-6 = בינוני (שיחה סבירה)
7-9 = גבוה (מעורב, שואל, מביע דעות)
10 = מאוד גבוה (מתלהב, יוזם, מפורט)`;

export function buildProfileExtractionPrompt(
  messages: Array<{ role: string; message: string }>
): string {
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
  "notes": "תובנה קצרה"
}`;
}

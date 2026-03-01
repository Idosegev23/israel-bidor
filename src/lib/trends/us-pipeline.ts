/**
 * US Trend Pipeline — end-to-end orchestration
 * Ingest → Cluster → Detect spikes → Generate Israel angles → Save trends
 */

import { createServerClient } from '@/lib/supabase/server';
import { ingestUSContent } from '@/lib/content-ingestion/us-scraper';
import { GoogleGenAI } from '@google/genai';

// ── Gemini client ────────────────────

let _genAI: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!_genAI) {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY not configured');
    _genAI = new GoogleGenAI({ apiKey: key });
  }
  return _genAI;
}

// ── Simple clustering by title similarity ────

interface ContentItem {
  id: string;
  title: string;
  url: string;
  source: string;
  raw_text: string | null;
  published_at: string | null;
}

interface TrendCluster {
  topic: string;
  items: ContentItem[];
  sources: string[];
  score: number;
}

function clusterByKeywords(items: ContentItem[]): TrendCluster[] {
  // Extract significant words from titles
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to',
    'for', 'of', 'with', 'by', 'from', 'and', 'or', 'but', 'not', 'has',
    'have', 'had', 'be', 'been', 'being', 'it', 'its', 'this', 'that',
    'as', 'if', 'than', 'how', 'what', 'who', 'which', 'about', 'after',
    'just', 'new', 'says', 'said', 'will', 'can', 'get', 'got',
  ]);

  // Map each item to significant keywords
  const itemKeywords = items.map((item) => {
    const words = item.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));
    return { item, words };
  });

  // Find keyword pairs that appear across multiple sources
  const pairCounts = new Map<string, { items: ContentItem[]; sources: Set<string> }>();

  for (const { item, words } of itemKeywords) {
    // Use individual significant words as cluster keys
    for (const word of words) {
      const existing = pairCounts.get(word) ?? { items: [], sources: new Set() };
      existing.items.push(item);
      existing.sources.add(item.source);
      pairCounts.set(word, existing);
    }
  }

  // Filter to clusters with items from ≥2 sources
  const clusters: TrendCluster[] = [];
  const usedItemIds = new Set<string>();

  const sorted = [...pairCounts.entries()]
    .filter(([, v]) => v.sources.size >= 2 && v.items.length >= 2)
    .sort(([, a], [, b]) => b.items.length - a.items.length);

  for (const [keyword, { items: clusterItems, sources }] of sorted) {
    // Skip if most items already used
    const newItems = clusterItems.filter((i) => !usedItemIds.has(i.id));
    if (newItems.length < 2) continue;

    const newSources = new Set(newItems.map((i) => i.source));
    if (newSources.size < 2) continue;

    clusters.push({
      topic: keyword,
      items: newItems.slice(0, 5),
      sources: [...newSources],
      score: newItems.length * newSources.size,
    });

    for (const item of newItems) usedItemIds.add(item.id);

    if (clusters.length >= 10) break;
  }

  return clusters;
}

// ── Generate Israel angles via Gemini ────

async function generateIsraelAngles(
  clusters: TrendCluster[],
): Promise<Map<string, string[]>> {
  if (clusters.length === 0) return new Map();

  const genAI = getGenAI();
  const anglesMap = new Map<string, string[]>();

  const topicSummary = clusters
    .map((c) => `- ${c.topic}: ${c.items.map((i) => i.title).join('; ')}`)
    .join('\n');

  try {
    const result = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `הנה טרנדים חמים מבידור אמריקאי:\n\n${topicSummary}\n\nלכל טרנד, הצע 2-3 זוויות ישראליות — איך ישראל בידור יכול לכסות/להתייחס לזה בקונטקסט ישראלי.\n\nהחזר JSON בפורמט: { "trends": [{ "topic": "...", "angles": ["...", "..."] }] }`,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.8,
        maxOutputTokens: 2048,
      },
    });

    const raw = result.text ?? '';
    const parsed = JSON.parse(raw);

    for (const trend of parsed.trends ?? []) {
      anglesMap.set(trend.topic, trend.angles ?? []);
    }
  } catch (err: any) {
    console.error('[US-Pipeline] Gemini angles generation failed:', err.message);
  }

  return anglesMap;
}

// ── Main Pipeline ────────────────────

export async function runUSPipeline(): Promise<{
  ingested: number;
  trends_found: number;
  errors: string[];
}> {
  const errors: string[] = [];

  // 1. Ingest new content
  console.log('[US-Pipeline] Step 1: Ingesting US content...');
  const ingestion = await ingestUSContent();
  errors.push(...ingestion.errors);

  // 2. Get recent content for clustering (last 48 hours)
  const supabase = createServerClient();
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: recentItems } = await supabase
    .from('us_content_items')
    .select('id, title, url, source, raw_text, published_at')
    .gte('created_at', twoDaysAgo)
    .order('created_at', { ascending: false })
    .limit(100);

  if (!recentItems || recentItems.length < 4) {
    console.log('[US-Pipeline] Not enough recent items for clustering');
    return { ingested: ingestion.saved, trends_found: 0, errors };
  }

  // 3. Cluster
  console.log(`[US-Pipeline] Step 2: Clustering ${recentItems.length} items...`);
  const clusters = clusterByKeywords(recentItems);
  console.log(`[US-Pipeline] Found ${clusters.length} trend clusters`);

  if (clusters.length === 0) {
    return { ingested: ingestion.saved, trends_found: 0, errors };
  }

  // 4. Generate Israel angles
  console.log('[US-Pipeline] Step 3: Generating Israel angles...');
  const anglesMap = await generateIsraelAngles(clusters);

  // 5. Save trends
  console.log('[US-Pipeline] Step 4: Saving trends...');
  let trendsSaved = 0;

  for (const cluster of clusters) {
    try {
      const angles = anglesMap.get(cluster.topic) ?? [];

      await supabase.from('us_trends').upsert(
        {
          trend_topic: cluster.topic,
          trend_score: cluster.score,
          sources: JSON.stringify(cluster.sources),
          supporting_items: JSON.stringify(
            cluster.items.map((i) => ({ title: i.title, url: i.url, source: i.source })),
          ),
          israel_angles: angles.length > 0 ? JSON.stringify(angles) : null,
          status: 'new',
        },
        { onConflict: 'trend_topic' },
      );

      trendsSaved++;
    } catch (err: any) {
      errors.push(`[trend:${cluster.topic}] ${err.message}`);
    }
  }

  console.log(`[US-Pipeline] Done: ${ingestion.saved} ingested, ${trendsSaved} trends saved`);
  return { ingested: ingestion.saved, trends_found: trendsSaved, errors };
}

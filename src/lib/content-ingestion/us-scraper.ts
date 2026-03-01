/**
 * US Content Scraper — RSS feeds + Reddit
 * Fetches entertainment content from US sources
 */

import { createServerClient } from '@/lib/supabase/server';
import { generateEmbedding } from '@/lib/trends/embeddings';

// ── RSS Sources ────────────────────────

const RSS_FEEDS: Array<{ name: string; url: string }> = [
  { name: 'tmz', url: 'https://www.tmz.com/rss.xml' },
  { name: 'people', url: 'https://people.com/feed/' },
  { name: 'ew', url: 'https://ew.com/feed/' },
];

const REDDIT_SUBS = ['entertainment', 'popculture'];

// ── RSS Parser (minimal, no deps) ─────

interface FeedItem {
  title: string;
  url: string;
  source: string;
  raw_text: string;
  published_at: string | null;
}

async function parseRSSFeed(feedUrl: string, source: string): Promise<FeedItem[]> {
  try {
    const res = await fetch(feedUrl, {
      headers: { 'User-Agent': 'IsraelBidurBot/1.0' },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.warn(`[US-Scraper] RSS fetch failed for ${source}: ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const items: FeedItem[] = [];

    // Simple regex-based XML parsing (no dependency needed)
    const itemMatches = xml.match(/<item[\s\S]*?<\/item>/g) ?? [];

    for (const itemXml of itemMatches.slice(0, 20)) {
      const title = extractTag(itemXml, 'title');
      const link = extractTag(itemXml, 'link');
      const description = extractTag(itemXml, 'description');
      const pubDate = extractTag(itemXml, 'pubDate');

      if (!title || !link) continue;

      items.push({
        title: cleanHtml(title),
        url: link.trim(),
        source,
        raw_text: cleanHtml(description ?? '').slice(0, 2000),
        published_at: pubDate ? new Date(pubDate).toISOString() : null,
      });
    }

    return items;
  } catch (err: any) {
    console.error(`[US-Scraper] RSS error for ${source}:`, err.message);
    return [];
  }
}

function extractTag(xml: string, tag: string): string | null {
  // Handle CDATA: <![CDATA[...]]>
  const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Reddit Scraper ────────────────────

async function fetchRedditPosts(subreddit: string): Promise<FeedItem[]> {
  try {
    const res = await fetch(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=25`,
      {
        headers: { 'User-Agent': 'IsraelBidurBot/1.0 (entertainment tracker)' },
        signal: AbortSignal.timeout(15000),
      },
    );

    if (!res.ok) {
      console.warn(`[US-Scraper] Reddit fetch failed for r/${subreddit}: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const posts = data?.data?.children ?? [];

    return posts
      .filter((p: any) => !p.data.stickied && !p.data.over_18)
      .slice(0, 15)
      .map((p: any) => ({
        title: p.data.title ?? '',
        url: `https://reddit.com${p.data.permalink}`,
        source: 'reddit',
        raw_text: (p.data.selftext ?? '').slice(0, 2000),
        published_at: p.data.created_utc
          ? new Date(p.data.created_utc * 1000).toISOString()
          : null,
      }));
  } catch (err: any) {
    console.error(`[US-Scraper] Reddit error for r/${subreddit}:`, err.message);
    return [];
  }
}

// ── Main Ingestion ────────────────────

export async function ingestUSContent(): Promise<{
  fetched: number;
  saved: number;
  embedded: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let fetched = 0;
  let saved = 0;
  let embedded = 0;

  // 1. Fetch from all sources concurrently
  const [rssResults, redditResults] = await Promise.all([
    Promise.all(RSS_FEEDS.map((f) => parseRSSFeed(f.url, f.name))),
    Promise.all(REDDIT_SUBS.map((sub) => fetchRedditPosts(sub))),
  ]);

  const allItems: FeedItem[] = [
    ...rssResults.flat(),
    ...redditResults.flat(),
  ];

  fetched = allItems.length;
  console.log(`[US-Scraper] Fetched ${fetched} items from ${RSS_FEEDS.length + REDDIT_SUBS.length} sources`);

  if (allItems.length === 0) return { fetched: 0, saved: 0, embedded: 0, errors };

  // 2. Save to DB (upsert by URL)
  const supabase = createServerClient();

  for (const item of allItems) {
    try {
      const { error } = await supabase
        .from('us_content_items')
        .upsert(
          {
            title: item.title,
            url: item.url,
            source: item.source,
            raw_text: item.raw_text,
            published_at: item.published_at,
          },
          { onConflict: 'url' },
        );

      if (error) {
        errors.push(`[save:${item.source}] ${error.message}`);
      } else {
        saved++;
      }
    } catch (err: any) {
      errors.push(`[save:${item.source}] ${err.message}`);
    }
  }

  // 3. Generate embeddings for items without one
  const { data: unembedded } = await supabase
    .from('us_content_items')
    .select('id, title, raw_text')
    .is('embedding', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (unembedded && unembedded.length > 0) {
    console.log(`[US-Scraper] Embedding ${unembedded.length} new items`);

    for (const item of unembedded) {
      try {
        const text = `${item.title}. ${item.raw_text ?? ''}`.slice(0, 8000);
        const embedding = await generateEmbedding(text);

        await supabase
          .from('us_content_items')
          .update({ embedding: JSON.stringify(embedding) })
          .eq('id', item.id);

        embedded++;
      } catch (err: any) {
        errors.push(`[embed:${item.id}] ${err.message}`);
      }
    }
  }

  console.log(`[US-Scraper] Done: ${saved} saved, ${embedded} embedded, ${errors.length} errors`);
  return { fetched, saved, embedded, errors };
}

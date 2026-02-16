/**
 * US Content Sources — American Entertainment Content Ingestion
 * Pulls from RSS feeds, YouTube Trending, Reddit
 */

import axios from 'axios';
import { createServerClient } from '@/lib/supabase/server';
import { parseFeed } from './rss-parser';

// ============================================
// Types
// ============================================

export interface USContentItem {
  source: string;
  title: string;
  url: string;
  published_at: string;
  raw_text?: string;
}

// ============================================
// RSS Sources Configuration
// ============================================

const US_RSS_SOURCES: Array<{
  name: string;
  url: string;
}> = [
  { name: 'tmz', url: 'https://www.tmz.com/rss.xml' },
  { name: 'people', url: 'https://people.com/feed/' },
  { name: 'page_six', url: 'https://pagesix.com/feed/' },
  { name: 'variety', url: 'https://variety.com/feed/' },
  { name: 'ew', url: 'https://ew.com/feed/' },
  { name: 'e_news', url: 'https://www.eonline.com/syndication/feeds/rssfeeds/topstories.xml' },
];

// ============================================
// Main Ingestion
// ============================================

export async function ingestUSContent(): Promise<{
  newItems: number;
  skipped: number;
  errors: string[];
  sourceBreakdown: Record<string, number>;
}> {
  const supabase = createServerClient();
  let newItems = 0;
  let skipped = 0;
  const errors: string[] = [];
  const sourceBreakdown: Record<string, number> = {};

  console.log(`[US-Ingest] Starting ingestion from ${US_RSS_SOURCES.length} RSS + YouTube + Reddit`);

  // 1. RSS Feeds
  for (const source of US_RSS_SOURCES) {
    try {
      const feed = await parseFeed(source.url);
      let sourceNew = 0;

      for (const item of feed.items.slice(0, 30)) {
        const { error } = await supabase
          .from('us_content_items')
          .upsert(
            {
              source: source.name,
              title: item.title,
              url: item.url,
              published_at: new Date(item.pubDate).toISOString(),
              raw_text: item.description?.substring(0, 2000) || null,
            },
            { onConflict: 'url', ignoreDuplicates: true }
          );

        if (error && error.code !== '23505') {
          errors.push(`[${source.name}] ${error.message}`);
        } else if (!error) {
          sourceNew++;
          newItems++;
        } else {
          skipped++;
        }
      }

      sourceBreakdown[source.name] = sourceNew;
      console.log(`[US-Ingest] ${source.name}: ${feed.items.length} fetched, ${sourceNew} new`);
    } catch (error: any) {
      errors.push(`[${source.name}] ${error.message}`);
    }
  }

  // 2. YouTube Trending (if API key available)
  try {
    const ytResults = await ingestYouTubeTrending(supabase);
    newItems += ytResults.newItems;
    skipped += ytResults.skipped;
    sourceBreakdown['youtube'] = ytResults.newItems;
    if (ytResults.error) errors.push(ytResults.error);
  } catch (error: any) {
    errors.push(`[youtube] ${error.message}`);
  }

  // 3. Reddit (if credentials available)
  try {
    const redditResults = await ingestReddit(supabase);
    newItems += redditResults.newItems;
    skipped += redditResults.skipped;
    sourceBreakdown['reddit'] = redditResults.newItems;
    if (redditResults.error) errors.push(redditResults.error);
  } catch (error: any) {
    errors.push(`[reddit] ${error.message}`);
  }

  console.log(`[US-Ingest] Done: ${newItems} new, ${skipped} skipped, ${errors.length} errors`);

  return { newItems, skipped, errors, sourceBreakdown };
}

// ============================================
// YouTube Trending
// ============================================

async function ingestYouTubeTrending(supabase: ReturnType<typeof createServerClient>): Promise<{
  newItems: number;
  skipped: number;
  error?: string;
}> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return { newItems: 0, skipped: 0, error: '[youtube] YOUTUBE_API_KEY not configured' };
  }

  let newItems = 0;
  let skipped = 0;

  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'snippet,statistics',
        chart: 'mostPopular',
        regionCode: 'US',
        videoCategoryId: '24', // Entertainment
        maxResults: 20,
        key: apiKey,
      },
      timeout: 15000,
    });

    for (const video of response.data.items || []) {
      const url = `https://www.youtube.com/watch?v=${video.id}`;
      const { error } = await supabase
        .from('us_content_items')
        .upsert(
          {
            source: 'youtube',
            title: video.snippet.title,
            url,
            published_at: video.snippet.publishedAt,
            raw_text: video.snippet.description?.substring(0, 2000) || null,
          },
          { onConflict: 'url', ignoreDuplicates: true }
        );

      if (error && error.code !== '23505') {
        // skip
      } else if (!error) {
        newItems++;

        // Also save metrics
        await supabase.from('us_content_metrics').insert({
          content_id: undefined, // We'd need to fetch the content_id from the upserted row
          views: parseInt(video.statistics.viewCount || '0'),
          likes: parseInt(video.statistics.likeCount || '0'),
          comments: parseInt(video.statistics.commentCount || '0'),
        }).then(() => {});
      } else {
        skipped++;
      }
    }
  } catch (error: any) {
    return { newItems, skipped, error: `[youtube] ${error.message}` };
  }

  return { newItems, skipped };
}

// ============================================
// Reddit
// ============================================

async function ingestReddit(supabase: ReturnType<typeof createServerClient>): Promise<{
  newItems: number;
  skipped: number;
  error?: string;
}> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return { newItems: 0, skipped: 0, error: '[reddit] Reddit credentials not configured' };
  }

  let newItems = 0;
  let skipped = 0;

  try {
    // Get Reddit access token
    const tokenResponse = await axios.post(
      'https://www.reddit.com/api/v1/access_token',
      'grant_type=client_credentials',
      {
        auth: { username: clientId, password: clientSecret },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Fetch from entertainment subreddits
    const subreddits = ['popculturechat', 'entertainment', 'Fauxmoi'];

    for (const sub of subreddits) {
      try {
        const response = await axios.get(`https://oauth.reddit.com/r/${sub}/hot`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': 'IsraelBidur-Agent/1.0',
          },
          params: { limit: 15 },
          timeout: 10000,
        });

        for (const post of response.data?.data?.children || []) {
          const data = post.data;
          if (!data.title || data.is_self === false) continue;

          const url = `https://www.reddit.com${data.permalink}`;
          const { error } = await supabase
            .from('us_content_items')
            .upsert(
              {
                source: `reddit_${sub}`,
                title: data.title,
                url,
                published_at: new Date(data.created_utc * 1000).toISOString(),
                raw_text: data.selftext?.substring(0, 2000) || null,
              },
              { onConflict: 'url', ignoreDuplicates: true }
            );

          if (error && error.code !== '23505') {
            // skip
          } else if (!error) {
            newItems++;
          } else {
            skipped++;
          }
        }
      } catch {
        // Continue to next subreddit
      }
    }
  } catch (error: any) {
    return { newItems, skipped, error: `[reddit] ${error.message}` };
  }

  return { newItems, skipped };
}

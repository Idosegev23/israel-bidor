/**
 * IL Content Sources — Israeli Entertainment Content Ingestion
 * Pulls content from Israeli entertainment sources (RSS, scraping)
 */

import axios from 'axios';
import { createServerClient } from '@/lib/supabase/server';
import { parseFeed, type RSSItem } from './rss-parser';

// ============================================
// Types
// ============================================

export interface ILContentItem {
  source: string;
  title: string;
  url: string;
  content_type: 'article' | 'post' | 'video' | 'story';
  category?: string;
  published_at: string;
  raw_text?: string;
  thumbnail_url?: string;
  talent_name?: string;
  talent_username?: string;
  followers_count?: number;
}

// ============================================
// Source Configuration
// ============================================

/**
 * Configure your Israeli entertainment sources here.
 * Add RSS feeds, site URLs, or API endpoints.
 * 
 * MVP: Start with RSS feeds, expand to scraping later.
 */
const IL_RSS_SOURCES: Array<{
  name: string;
  url: string;
  category?: string;
  content_type: 'article' | 'post' | 'video';
}> = [
  // Add your Israeli entertainment RSS feeds here:
  // {
  //   name: 'mako_entertainment',
  //   url: 'https://rcs.mako.co.il/rss/entertainment.xml',
  //   category: 'entertainment',
  //   content_type: 'article',
  // },
  // {
  //   name: 'walla_celebs',
  //   url: 'https://rss.walla.co.il/feed/22',
  //   category: 'gossip',
  //   content_type: 'article',
  // },
  // {
  //   name: 'ynet_entertainment',
  //   url: 'https://www.ynet.co.il/Integration/StoryRss538.xml',
  //   category: 'entertainment',
  //   content_type: 'article',
  // },
];

// ============================================
// Main Ingestion Function
// ============================================

export async function ingestILContent(): Promise<{
  newItems: number;
  skipped: number;
  errors: string[];
}> {
  const supabase = createServerClient();
  let newItems = 0;
  let skipped = 0;
  const errors: string[] = [];

  console.log(`[IL-Ingest] Starting ingestion from ${IL_RSS_SOURCES.length} sources`);

  for (const source of IL_RSS_SOURCES) {
    try {
      console.log(`[IL-Ingest] Fetching: ${source.name}`);
      const feed = await parseFeed(source.url);

      for (const item of feed.items) {
        const contentItem = mapRSSToContent(item, source.name, source.category, source.content_type);

        // Upsert — skip if URL already exists
        const { error } = await supabase
          .from('il_content_items')
          .upsert(contentItem, { onConflict: 'url', ignoreDuplicates: true });

        if (error) {
          if (error.code === '23505') {
            // Duplicate URL — skip silently
            skipped++;
          } else {
            errors.push(`[${source.name}] DB error: ${error.message}`);
          }
        } else {
          newItems++;
        }
      }

      console.log(`[IL-Ingest] ${source.name}: ${feed.items.length} items fetched`);
    } catch (error: any) {
      const msg = `[${source.name}] ${error.message}`;
      console.error(`[IL-Ingest] Error:`, msg);
      errors.push(msg);
    }
  }

  // Also ingest from existing talent_posts (Instagram content from existing scraper)
  try {
    const instagramResults = await ingestFromExistingPosts(supabase);
    newItems += instagramResults.newItems;
    skipped += instagramResults.skipped;
  } catch (error: any) {
    errors.push(`[instagram_posts] ${error.message}`);
  }

  console.log(`[IL-Ingest] Done: ${newItems} new, ${skipped} skipped, ${errors.length} errors`);

  return { newItems, skipped, errors };
}

// ============================================
// Helpers
// ============================================

function mapRSSToContent(
  item: RSSItem,
  sourceName: string,
  category?: string,
  contentType?: 'article' | 'post' | 'video'
): ILContentItem {
  return {
    source: sourceName,
    title: item.title,
    url: item.url,
    content_type: contentType || 'article',
    category: item.category || category,
    published_at: new Date(item.pubDate).toISOString(),
    raw_text: item.description || undefined,
  };
}

/**
 * Bridge: Pull recent Instagram posts from existing talent_posts table
 * into il_content_items so they participate in heat scoring.
 * Also seeds initial il_content_metrics from Instagram engagement data.
 */
async function ingestFromExistingPosts(supabase: ReturnType<typeof createServerClient>): Promise<{
  newItems: number;
  skipped: number;
}> {
  let newItems = 0;
  let skipped = 0;

  // Get recent posts from the last 48 hours, joined with talent profile info
  const { data: recentPosts, error } = await supabase
    .from('talent_posts')
    .select(`
      id,
      post_url,
      caption,
      media_type,
      posted_at,
      likes_count,
      comments_count,
      views_count,
      is_sponsored,
      thumbnail_url,
      talent_id,
      talent_profiles!talent_posts_talent_id_fkey (
        username,
        full_name,
        followers_count,
        is_verified,
        category,
        profile_pic_url
      )
    `)
    .gte('posted_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
    .order('posted_at', { ascending: false })
    .limit(200);

  if (error || !recentPosts) {
    console.log('[IL-Ingest] No recent Instagram posts or error:', error?.message);
    return { newItems: 0, skipped: 0 };
  }

  for (const post of recentPosts) {
    if (!post.post_url) continue;

    // Build a rich title that includes the talent name
    const talentProfile = post.talent_profiles as any;
    const talentName = talentProfile?.full_name || talentProfile?.username || '';
    const isVerified = talentProfile?.is_verified ? ' ✓' : '';
    const followersCount = talentProfile?.followers_count || 0;

    // Create a meaningful title from caption + talent context
    const captionSnippet = (post.caption || 'פוסט ללא כיתוב').substring(0, 150);
    const title = talentName
      ? `${talentName}${isVerified}: ${captionSnippet}`
      : captionSnippet;

    // Determine category from talent category or sponsored status
    const category = post.is_sponsored
      ? 'sponsored'
      : talentProfile?.category || 'instagram';

    // Resolve thumbnail: post thumbnail > talent profile pic
    const thumbnailUrl = (post as any).thumbnail_url || talentProfile?.profile_pic_url || undefined;

    const contentItem: ILContentItem = {
      source: `instagram:${talentProfile?.username || 'unknown'}`,
      title,
      url: post.post_url,
      content_type: post.media_type === 'video' ? 'video' : 'post',
      category,
      published_at: post.posted_at || new Date().toISOString(),
      raw_text: post.caption || undefined,
      thumbnail_url: thumbnailUrl,
      talent_name: talentName || undefined,
      talent_username: talentProfile?.username || undefined,
      followers_count: followersCount || undefined,
    };

    // Upsert the content item and get its ID
    const { data: upserted, error: upsertError } = await supabase
      .from('il_content_items')
      .upsert(contentItem, { onConflict: 'url', ignoreDuplicates: false })
      .select('id')
      .single();

    if (upsertError) {
      if (upsertError.code === '23505') {
        skipped++;
      } else {
        console.error('[IL-Ingest] Instagram upsert error:', upsertError.message);
      }
      continue;
    }

    if (upserted) {
      newItems++;

      // Seed initial il_content_metrics from Instagram engagement data
      // This is crucial — without this, heat_score would always be 0!
      const likes = post.likes_count || 0;
      const comments = post.comments_count || 0;
      const views = post.views_count || 0;

      // Map Instagram metrics to our scoring model:
      // - views_30m ← actual views (or estimate from likes * engagement factor)
      // - shares_30m ← estimated from likes (Instagram doesn't expose shares)
      // - comments_30m ← actual comments
      // - growth_rate ← based on velocity relative to follower count
      const estimatedViews = views > 0 ? views : likes * 15; // avg view/like ratio
      const estimatedShares = Math.round(likes * 0.05); // ~5% of likers share
      const growthRate = followersCount > 0
        ? ((likes + comments) / followersCount) * 100 // engagement rate as %
        : 0;

      await supabase.from('il_content_metrics').insert({
        content_id: upserted.id,
        views_30m: estimatedViews,
        shares_30m: estimatedShares,
        comments_30m: comments,
        growth_rate: Math.round(growthRate * 100) / 100,
        heat_score: 0, // Will be calculated by the scoring cron
      });
    }
  }

  console.log(`[IL-Ingest] Instagram bridge: ${newItems} new, ${skipped} skipped (from ${recentPosts.length} posts)`);
  return { newItems, skipped };
}

/**
 * ScrapeCreators API Client
 * Client מלא לעבודה עם ScrapeCreators API
 * כולל retry policy, rate limiting, והגבלות קצב
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// ============================================
// Configuration
// ============================================

function getScrapeCreatorsApiKey(): string {
  const key = process.env.SCRAPECREATORS_API_KEY;
  if (!key) {
    throw new Error('SCRAPECREATORS_API_KEY is not configured');
  }
  return key;
}

const SCRAPECREATORS_BASE_URL = process.env.SCRAPECREATORS_BASE_URL || 'https://api.scrapecreators.com';
const SCAN_HTTP_TIMEOUT_MS = Number(process.env.SCAN_HTTP_TIMEOUT_MS) || 60000; // ⚡ 60s for large requests
const SCAN_MAX_RETRIES = Number(process.env.SCAN_MAX_RETRIES) || 3;
const SCAN_RETRY_BASE_DELAY_MS = Number(process.env.SCAN_RETRY_BASE_DELAY_MS) || 2000;

// ============================================
// Type Definitions
// ============================================

export interface InstagramProfile {
  username: string;
  full_name?: string;
  bio?: string;
  bio_links?: string[];
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  profile_pic_url?: string;
  is_verified?: boolean;
  is_business?: boolean;
  category?: string;
  external_url?: string;
}

export interface InstagramPost {
  post_id: string;
  shortcode: string;
  post_url: string;
  caption?: string;
  media_type: 'photo' | 'video' | 'carousel';
  media_urls: string[];
  thumbnail_url?: string;
  likes_count?: number;
  comments_count?: number;
  views_count?: number;
  posted_at?: string;
  location?: string;
  mentions?: string[];
  is_sponsored?: boolean;
}

export interface InstagramComment {
  comment_id: string;
  post_shortcode: string;
  text: string;
  author_username: string;
  author_profile_pic?: string;
  is_owner_reply: boolean;
  likes_count?: number;
  commented_at?: string;
}

export interface InstagramHighlight {
  highlight_id: string;
  title: string;
  cover_url?: string;
  items_count: number;
}

export interface InstagramHighlightDetail {
  highlight_id: string;
  title: string;
  items: Array<{
    story_id: string;
    shortcode?: string;
    media_type: 'photo' | 'video' | 'other';
    media_url: string;
    video_url?: string;
    image_url?: string;
    thumbnail_url?: string;
    timestamp?: string;
  }>;
}

export interface MediaTranscript {
  media_url: string;
  transcript: string;
  language?: string;
  confidence?: number;
}

// ============================================
// Error Types
// ============================================

export class ScrapeCreatorsError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorCode?: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ScrapeCreatorsError';
  }
}

// ============================================
// ScrapeCreators Client Class
// ============================================

export class ScrapeCreatorsClient {
  private client: AxiosInstance;

  constructor() {
    const apiKey = getScrapeCreatorsApiKey();

    this.client = axios.create({
      baseURL: SCRAPECREATORS_BASE_URL,
      timeout: SCAN_HTTP_TIMEOUT_MS,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      validateStatus: (status) => status >= 200 && status < 300,
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        const requestId = Math.random().toString(36).substring(7);
        config.headers['x-request-id'] = requestId;
        console.log(`[ScrapeCreators] [${requestId}] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[ScrapeCreators] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        const requestId = response.config.headers['x-request-id'];
        console.log(`[ScrapeCreators] [${requestId}] ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        const requestId = error.config?.headers?.['x-request-id'];
        console.error(`[ScrapeCreators] [${requestId}] Error:`, error.message);
        return Promise.reject(error);
      }
    );
  }

  // ============================================
  // Retry Logic
  // ============================================

  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= SCAN_MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Check if error is retryable
        const isRetryable = this.isRetryableError(error);
        const isLastAttempt = attempt === SCAN_MAX_RETRIES;

        if (!isRetryable || isLastAttempt) {
          console.error(
            `[ScrapeCreators] ${operationName} failed (attempt ${attempt}/${SCAN_MAX_RETRIES}):`,
            error.message
          );
          throw this.normalizeError(error);
        }

        // Calculate backoff delay
        const delay = SCAN_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 500;
        const totalDelay = delay + jitter;

        console.warn(
          `[ScrapeCreators] ${operationName} failed (attempt ${attempt}/${SCAN_MAX_RETRIES}), retrying in ${totalDelay.toFixed(0)}ms...`
        );

        await this.sleep(totalDelay);
      }
    }

    throw lastError || new Error(`${operationName} failed after ${SCAN_MAX_RETRIES} attempts`);
  }

  private isRetryableError(error: any): boolean {
    // Network errors
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // Axios errors
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      
      // Retry on rate limit
      if (status === 429) return true;
      
      // Retry on server errors
      if (status && status >= 500) return true;
      
      // Don't retry on client errors (except 429)
      if (status && status >= 400 && status < 500) return false;
    }

    // Retry on timeout
    if (error.message?.includes('timeout')) return true;

    // Default: don't retry
    return false;
  }

  private normalizeError(error: any): ScrapeCreatorsError {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;

      if (status === 401 || status === 403) {
        return new ScrapeCreatorsError(
          'Authentication failed',
          status,
          'HTTP_AUTH_FAILED',
          false
        );
      }

      if (status === 404) {
        return new ScrapeCreatorsError(
          'Resource not found',
          status,
          'HTTP_NOT_FOUND',
          false
        );
      }

      if (status === 429) {
        return new ScrapeCreatorsError(
          'Rate limit exceeded',
          status,
          'HTTP_RATE_LIMIT',
          true
        );
      }

      if (status && status >= 500) {
        return new ScrapeCreatorsError(
          `Server error: ${status}`,
          status,
          'HTTP_SERVER_ERROR',
          true
        );
      }

      return new ScrapeCreatorsError(
        data?.message || error.message,
        status,
        'HTTP_ERROR',
        false
      );
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ScrapeCreatorsError(
        'Request timeout',
        undefined,
        'TIMEOUT',
        true
      );
    }

    return new ScrapeCreatorsError(
      error.message || 'Unknown error',
      undefined,
      'UNKNOWN',
      false
    );
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================
  // API Methods
  // ============================================

  /**
   * Get Instagram profile (full data)
   */
  async getProfile(username: string): Promise<InstagramProfile> {
    return this.withRetry(async () => {
      const response = await this.client.get('/v1/instagram/profile', {
        params: { handle: username },
      });

      const data = response.data;
      
      console.log('[ScrapeCreators] Profile response:', JSON.stringify(data, null, 2).substring(0, 500));
      
      const user = data.data?.user || data.user || {};
      
      return {
        username: user.username || username,
        full_name: user.full_name,
        bio: user.biography,
        bio_links: user.bio_links || [],
        followers_count: user.edge_followed_by?.count || user.follower_count || 0,
        following_count: user.edge_follow?.count || user.following_count || 0,
        posts_count: user.edge_owner_to_timeline_media?.count || user.media_count || 0,
        profile_pic_url: user.profile_pic_url_hd || user.profile_pic_url,
        is_verified: user.is_verified,
        is_business: user.is_business_account,
        category: user.category_name || user.category,
        external_url: user.external_url,
      };
    }, 'getProfile');
  }

  /**
   * Get user posts (with v2 manual pagination)
   */
  async getPosts(username: string, limit: number = 50): Promise<InstagramPost[]> {
    return this.withRetry(async () => {
      const allPosts: any[] = [];
      let nextMaxId: string | undefined;
      let requestCount = 0;
      const maxRequests = Math.ceil(limit / 12);
      
      console.log(`[ScrapeCreators] Fetching up to ${limit} posts for @${username}`);

      while (allPosts.length < limit && requestCount < maxRequests) {
        requestCount++;
        
        const params: any = { 
          handle: username,
          trim: true,
        };
        
        if (nextMaxId) {
          params.next_max_id = nextMaxId;
        }

        const response = await this.client.get('/v2/instagram/user/posts', { params });
        const data = response.data;
        
        const posts = data.items || [];
        
        console.log(`[ScrapeCreators] Page ${requestCount}: Found ${posts.length} posts`);
        
        if (!posts.length) {
          break;
        }
        
        allPosts.push(...posts);
        
        if (!data.more_available || !data.next_max_id) {
          break;
        }
        
        nextMaxId = data.next_max_id;
        
        if (allPosts.length < limit && data.more_available) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
      
      return allPosts.slice(0, limit).map((post: any) => ({
        post_id: post.id?.split('_')[0] || post.pk || post.id,
        shortcode: post.code || post.shortcode,
        post_url: post.url || `https://www.instagram.com/p/${post.code || post.shortcode}/`,
        caption: post.caption?.text || post.caption,
        media_type: this.normalizeMediaType(post.media_type || post.type),
        media_urls: this.extractMediaUrls(post),
        thumbnail_url: post.thumbnail_url || post.image_versions2?.candidates?.[0]?.url || post.display_url,
        likes_count: post.like_count || post.likes,
        comments_count: post.comment_count || post.comments || 0,
        views_count: post.video_view_count || post.play_count || post.views,
        posted_at: post.taken_at 
          ? new Date(post.taken_at * 1000).toISOString()
          : (post.taken_at_timestamp ? new Date(post.taken_at_timestamp * 1000).toISOString() : undefined),
        location: post.location?.name,
        mentions: post.caption?.text?.match(/@(\w+)/g) || post.mentions || [],
        is_sponsored: post.is_paid_partnership || post.is_sponsored || false,
      }));
    }, 'getPosts');
  }

  /**
   * Get user highlights (metadata only)
   */
  async getHighlights(username: string): Promise<InstagramHighlight[]> {
    return this.withRetry(async () => {
      const response = await this.client.get('/v1/instagram/user/highlights', {
        params: { handle: username },
      });

      const highlights = response.data?.highlights || response.data || [];
      
      console.log(`[ScrapeCreators] Parsed ${highlights.length} highlights`);
      
      return highlights.map((highlight: any) => ({
        highlight_id: highlight.id,
        title: highlight.title,
        cover_url: highlight.cover_media?.cropped_image_version?.url,
        items_count: highlight.media_count || 0,
      }));
    }, 'getHighlights');
  }

  /**
   * Get highlight details (with all stories/videos)
   */
  async getHighlightDetails(highlightId: string): Promise<InstagramHighlightDetail> {
    return this.withRetry(async () => {
      const response = await this.client.get('/v1/instagram/user/highlight/detail', {
        params: { id: highlightId },
      });

      const data = response.data?.data || response.data || {};
      const reels = data.reels_media?.[highlightId] || data.reel || data;
      
      console.log(`[ScrapeCreators] Highlight ${highlightId}: ${reels.items?.length || 0} stories`);
      
      return {
        highlight_id: highlightId,
        title: reels.title || '',
        items: (reels.items || []).map((item: any) => ({
          story_id: item.id || item.pk,
          shortcode: item.code,
          media_type: this.normalizeMediaType(item.media_type),
          media_url: item.video_versions?.[0]?.url || item.image_versions2?.candidates?.[0]?.url || '',
          video_url: item.video_versions?.[0]?.url,
          image_url: item.image_versions2?.candidates?.[0]?.url,
          thumbnail_url: item.image_versions2?.candidates?.[0]?.url,
          timestamp: item.taken_at ? new Date(item.taken_at * 1000).toISOString() : undefined,
        })),
      };
    }, 'getHighlightDetails');
  }

  // ============================================
  // Helper Methods
  // ============================================

  private normalizeMediaType(type: any): 'photo' | 'video' | 'carousel' {
    if (typeof type === 'string') {
      const lower = type.toLowerCase();
      if (lower.includes('video') || lower.includes('reel')) return 'video';
      if (lower.includes('carousel') || lower.includes('album')) return 'carousel';
      return 'photo';
    }

    if (type === 1) return 'photo';
    if (type === 2) return 'video';
    if (type === 8) return 'carousel';

    return 'photo';
  }

  private extractMediaUrls(post: any): string[] {
    const urls: string[] = [];

    if (post.video_versions && Array.isArray(post.video_versions) && post.video_versions.length > 0) {
      urls.push(post.video_versions[0].url);
    }
    
    if (post.video_url) {
      urls.push(post.video_url);
    }

    if (post.image_versions2?.candidates?.[0]?.url) {
      urls.push(post.image_versions2.candidates[0].url);
    }
    
    if (post.display_url) {
      urls.push(post.display_url);
    }

    if (post.carousel_media && Array.isArray(post.carousel_media)) {
      for (const item of post.carousel_media) {
        if (item.video_versions?.[0]?.url) {
          urls.push(item.video_versions[0].url);
        } else if (item.video_url) {
          urls.push(item.video_url);
        } else if (item.image_versions2?.candidates?.[0]?.url) {
          urls.push(item.image_versions2.candidates[0].url);
        } else if (item.display_url) {
          urls.push(item.display_url);
        }
      }
    }

    return [...new Set(urls)].filter(Boolean);
  }
}

// ============================================
// Singleton Instance
// ============================================

let clientInstance: ScrapeCreatorsClient | null = null;

/**
 * Get singleton ScrapeCreators client instance
 */
export function getScrapeCreatorsClient(): ScrapeCreatorsClient {
  if (!clientInstance) {
    clientInstance = new ScrapeCreatorsClient();
  }
  return clientInstance;
}

// ============================================
// Convenience Functions
// ============================================

export async function scrapeInstagramProfile(username: string): Promise<InstagramProfile> {
  const client = getScrapeCreatorsClient();
  return client.getProfile(username);
}

export async function scrapeInstagramPosts(
  username: string,
  limit: number = 50
): Promise<InstagramPost[]> {
  const client = getScrapeCreatorsClient();
  return client.getPosts(username, limit);
}

export async function scrapeInstagramHighlights(
  username: string
): Promise<InstagramHighlight[]> {
  const client = getScrapeCreatorsClient();
  return client.getHighlights(username);
}

export async function scrapeHighlightDetails(
  highlightId: string
): Promise<InstagramHighlightDetail> {
  const client = getScrapeCreatorsClient();
  return client.getHighlightDetails(highlightId);
}

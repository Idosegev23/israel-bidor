/**
 * Full Scrape & Processing Orchestrator
 * מתזמן סריקה מלאה של טאלנט + עיבוד עם Gemini
 */

import { getScrapeCreatorsClient } from './scrapeCreatorsClient';
import { getGeminiProcessor } from '../ai/gemini';
import { createServerClient } from '../supabase/server';

// ============================================
// Type Definitions
// ============================================

export interface OrchestrationConfig {
  username: string;
  fullScrape: boolean; // true = posts + highlights, false = profile only
  processWithAI: boolean; // true = run Gemini processing
  postsLimit: number;
  highlightsLimit: number;
}

export interface OrchestrationResult {
  success: boolean;
  talentId?: string;
  stats: {
    profileSaved: boolean;
    postsSaved: number;
    highlightsSaved: number;
    highlightItemsSaved: number;
    insightsGenerated: boolean;
  };
  duration: number;
  error?: string;
}

export interface ProgressCallback {
  (step: string, progress: number, message: string): void;
}

// ============================================
// Main Orchestrator
// ============================================

export class ScrapeOrchestrator {
  private scrapeClient;
  private geminiProcessor;
  private supabase;

  constructor() {
    this.scrapeClient = getScrapeCreatorsClient();
    this.geminiProcessor = getGeminiProcessor();
    this.supabase = createServerClient();
  }

  /**
   * Run full orchestration for a talent
   */
  async orchestrate(
    config: OrchestrationConfig,
    onProgress?: ProgressCallback
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const { username, fullScrape, processWithAI, postsLimit, highlightsLimit } = config;

    const stats = {
      profileSaved: false,
      postsSaved: 0,
      highlightsSaved: 0,
      highlightItemsSaved: 0,
      insightsGenerated: false,
    };

    const report = (step: string, progress: number, message: string) => {
      onProgress?.(step, progress, message);
      console.log(`[Orchestrator] [${progress}%] ${step}: ${message}`);
    };

    try {
      report('init', 0, `Starting orchestration for @${username}`);

      // ====================================
      // STEP 1: Scrape Profile
      // ====================================
      report('profile', 10, 'Scraping profile...');

      const profile = await this.scrapeClient.getProfile(username);

      // Save profile to DB
      const { data: savedProfile, error: profileError } = await this.supabase
        .from('talent_profiles')
        .upsert(
          {
            username: profile.username,
            full_name: profile.full_name,
            bio: profile.bio,
            bio_links: profile.bio_links,
            profile_pic_url: profile.profile_pic_url,
            followers_count: profile.followers_count,
            following_count: profile.following_count,
            posts_count: profile.posts_count,
            is_verified: profile.is_verified,
            is_business: profile.is_business,
            category: profile.category,
            external_url: profile.external_url,
            last_scraped_at: new Date().toISOString(),
            scrape_status: 'in_progress',
          },
          {
            onConflict: 'username',
          }
        )
        .select()
        .single();

      if (profileError) throw profileError;

      const talentId = savedProfile.id;
      stats.profileSaved = true;

      report('profile', 20, `Profile saved: ${profile.followers_count?.toLocaleString()} followers`);

      // Save raw data
      await this.supabase.from('raw_data_archive').insert({
        talent_id: talentId,
        data_type: 'profile',
        raw_json: profile,
        source: 'scrapecreators',
      });

      if (!fullScrape) {
        // Quick profile-only scrape
        await this.supabase
          .from('talent_profiles')
          .update({ scrape_status: 'completed' })
          .eq('id', talentId);

        return {
          success: true,
          talentId,
          stats,
          duration: Date.now() - startTime,
        };
      }

      // ====================================
      // STEP 2: Scrape Posts
      // ====================================
      report('posts', 30, `Scraping ${postsLimit} posts...`);

      const posts = await this.scrapeClient.getPosts(username, postsLimit);

      // Save posts to DB
      for (const post of posts) {
        const { error } = await this.supabase.from('talent_posts').upsert(
          {
            talent_id: talentId,
            post_id: post.post_id,
            shortcode: post.shortcode,
            post_url: post.post_url,
            caption: post.caption,
            media_type: post.media_type,
            media_urls: post.media_urls,
            thumbnail_url: post.thumbnail_url,
            likes_count: post.likes_count,
            comments_count: post.comments_count,
            views_count: post.views_count,
            posted_at: post.posted_at,
            location: post.location,
            mentions: post.mentions,
            is_sponsored: post.is_sponsored,
            processed: false,
          },
          {
            onConflict: 'shortcode',
          }
        );

        if (!error) stats.postsSaved++;
      }

      report('posts', 50, `Saved ${stats.postsSaved} posts`);

      // Save raw posts data
      await this.supabase.from('raw_data_archive').insert({
        talent_id: talentId,
        data_type: 'posts',
        raw_json: posts,
        source: 'scrapecreators',
      });

      // ====================================
      // STEP 3: Scrape Highlights
      // ====================================
      report('highlights', 60, 'Scraping highlights...');

      const highlights = await this.scrapeClient.getHighlights(username);
      const highlightsToProcess = highlights.slice(0, highlightsLimit);

      report('highlights', 60, `Processing ${highlightsToProcess.length} highlights with stories...`);

      // Import transcription module
      const { transcribeVideo } = await import('../ai/transcription');

      // Process each highlight
      for (let i = 0; i < highlightsToProcess.length; i++) {
        const highlight = highlightsToProcess[i];
        const progress = 60 + Math.floor((i / highlightsToProcess.length) * 10);
        
        report('highlights', progress, `[${i + 1}/${highlightsToProcess.length}] ${highlight.title}`);

        // Save highlight metadata
        const { data: savedHighlight, error: highlightError } = await this.supabase
          .from('talent_highlights')
          .upsert(
            {
              talent_id: talentId,
              highlight_id: highlight.highlight_id,
              title: highlight.title,
              cover_url: highlight.cover_url,
              items_count: highlight.items_count,
            },
            {
              onConflict: 'highlight_id',
            }
          )
          .select('id')
          .single();

        if (highlightError || !savedHighlight) {
          console.error(`[Orchestrator] Error saving highlight ${highlight.highlight_id}:`, highlightError);
          continue;
        }

        stats.highlightsSaved++;

        // Get highlight details (stories/videos)
        try {
          const highlightDetails = await this.scrapeClient.getHighlightDetails(highlight.highlight_id);

          // Filter stories from 2026-02-08 onwards
          const cutoffDate = new Date('2026-02-08T00:00:00Z');
          const recentItems = highlightDetails.items.filter(item => {
            if (!item.timestamp) return false;
            const itemDate = new Date(item.timestamp);
            return itemDate >= cutoffDate;
          });

          console.log(`[Orchestrator] Highlight "${highlight.title}": ${recentItems.length}/${highlightDetails.items.length} stories from 8.2+`);

          // Save and transcribe each recent story
          for (const item of recentItems) {
            let transcription: string | undefined;

            // Transcribe video items
            if (item.media_type === 'video' && item.video_url) {
              console.log(`[Orchestrator] Transcribing video: ${item.story_id}`);
              const transcriptionResult = await transcribeVideo(item.video_url);
              
              if (transcriptionResult.success && transcriptionResult.text) {
                transcription = transcriptionResult.text;
                console.log(`[Orchestrator] ✅ Transcribed: ${transcription.substring(0, 100)}...`);
              } else {
                console.warn(`[Orchestrator] ⚠️  Transcription failed: ${transcriptionResult.error}`);
              }
            }

            // Save highlight item
            const { error: itemError } = await this.supabase.from('talent_highlight_items').upsert(
              {
                highlight_id: savedHighlight.id,
                story_id: item.story_id,
                shortcode: item.shortcode,
                media_type: item.media_type,
                media_url: item.media_url,
                video_url: item.video_url,
                image_url: item.image_url,
                thumbnail_url: item.thumbnail_url,
                timestamp: item.timestamp,
                transcription,
                processed: !!transcription,
                processed_at: transcription ? new Date().toISOString() : undefined,
              },
              {
                onConflict: 'story_id',
              }
            );

            if (!itemError) {
              stats.highlightItemsSaved++;
            }
          }
        } catch (error: any) {
          console.error(`[Orchestrator] Error processing highlight ${highlight.highlight_id}:`, error.message);
        }

        // Rate limit between highlights
        if (i < highlightsToProcess.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      report('highlights', 70, `Saved ${stats.highlightsSaved} highlights, ${stats.highlightItemsSaved} stories`);

      // ====================================
      // STEP 4: Process with Gemini AI
      // ====================================
      if (processWithAI) {
        report('ai', 80, 'Processing with Gemini 3 Pro...');

        const processingResult = await this.geminiProcessor.processTalentData(
          profile,
          posts,
          highlights
        );

        if (processingResult.success && processingResult.insights) {
          // Save insights to DB
          await this.supabase.from('talent_insights').insert({
            talent_id: talentId,
            personality: processingResult.insights.personality,
            topics: processingResult.insights.topics,
            partnerships: processingResult.insights.partnerships,
            coupons: processingResult.insights.coupons,
            audience_insights: processingResult.insights.audience_insights,
            summary_text: processingResult.insights.summary_text,
            key_themes: processingResult.insights.key_themes,
            model_used: 'gemini-3-pro-preview',
            tokens_used: processingResult.tokensUsed,
            processing_time_ms: processingResult.processingTimeMs,
          });

          // Update talent profile
          await this.supabase
            .from('talent_profiles')
            .update({
              last_processed_at: new Date().toISOString(),
              processing_status: 'completed',
            })
            .eq('id', talentId);

          stats.insightsGenerated = true;

          report('ai', 95, 'AI insights generated successfully');
        } else {
          report('ai', 95, `AI processing failed: ${processingResult.error}`);
        }
      }

      // ====================================
      // DONE
      // ====================================
      await this.supabase
        .from('talent_profiles')
        .update({ scrape_status: 'completed' })
        .eq('id', talentId);

      const duration = Date.now() - startTime;

      report('complete', 100, `Orchestration complete in ${(duration / 1000).toFixed(1)}s`);

      return {
        success: true,
        talentId,
        stats,
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      report('error', 100, `Failed: ${error.message}`);

      return {
        success: false,
        stats,
        duration,
        error: error.message,
      };
    }
  }

  /**
   * Quick rescan - only new posts
   */
  async quickRescan(username: string): Promise<OrchestrationResult> {
    return this.orchestrate(
      {
        username,
        fullScrape: true,
        processWithAI: true,
        postsLimit: 20, // Last 20 posts
        highlightsLimit: 30, // Get highlights to filter by date
      },
      undefined
    );
  }
}

// ============================================
// Singleton & Convenience Functions
// ============================================

let orchestratorInstance: ScrapeOrchestrator | null = null;

export function getOrchestrator(): ScrapeOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new ScrapeOrchestrator();
  }
  return orchestratorInstance;
}

export async function scrapeAndProcessTalent(
  username: string,
  fullScrape: boolean = true,
  onProgress?: ProgressCallback,
  maxPosts: number = 50,
  maxHighlights: number = 100
): Promise<OrchestrationResult> {
  const orchestrator = getOrchestrator();

  return orchestrator.orchestrate(
    {
      username,
      fullScrape,
      processWithAI: true,
      postsLimit: maxPosts,
      highlightsLimit: maxHighlights,
    },
    onProgress
  );
}

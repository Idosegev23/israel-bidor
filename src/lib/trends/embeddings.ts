/**
 * Embeddings — Generate text embeddings via OpenAI
 * Used for topic clustering and semantic search (talent content + US content)
 */

import OpenAI from 'openai';
import { createServerClient } from '@/lib/supabase/server';

// ============================================
// OpenAI Client
// ============================================

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// ============================================
// Generate Embedding
// ============================================

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAI();

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.substring(0, 8000), // Max input length safety
  });

  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const openai = getOpenAI();

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts.map((t) => t.substring(0, 8000)),
  });

  return response.data.map((d) => d.embedding);
}

// ============================================
// Store Embeddings
// ============================================

/**
 * Generate and store embeddings for US content items that don't have one
 */
export async function embedUnprocessedUSContent(): Promise<{
  processed: number;
  errors: string[];
}> {
  const supabase = createServerClient();
  let processed = 0;
  const errors: string[] = [];

  // Get items without embeddings (from last 48 hours)
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: items } = await supabase
    .from('us_content_items')
    .select('id, title, raw_text')
    .is('embedding', null)
    .gte('created_at', twoDaysAgo)
    .limit(50);

  if (!items || items.length === 0) {
    return { processed: 0, errors: [] };
  }

  console.log(`[Embeddings] Processing ${items.length} items`);

  // Batch process (10 at a time to respect rate limits)
  for (let i = 0; i < items.length; i += 10) {
    const batch = items.slice(i, i + 10);
    const texts = batch.map((item) => `${item.title}. ${item.raw_text || ''}`);

    try {
      const embeddings = await generateEmbeddings(texts);

      for (let j = 0; j < batch.length; j++) {
        const { error } = await supabase
          .from('us_content_items')
          .update({ embedding: JSON.stringify(embeddings[j]) })
          .eq('id', batch[j].id);

        if (error) {
          errors.push(`[${batch[j].id}] ${error.message}`);
        } else {
          processed++;
        }
      }
    } catch (error: any) {
      errors.push(`[batch ${i}] ${error.message}`);
    }

    // Rate limit: 500ms between batches
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`[Embeddings] Done: ${processed} processed, ${errors.length} errors`);
  return { processed, errors };
}

// ============================================
// Similarity Search
// ============================================

/**
 * Find similar content items using cosine similarity via pgvector
 */
export async function findSimilarContent(
  embedding: number[],
  limit: number = 10,
  minSimilarity: number = 0.7
): Promise<Array<{ id: string; title: string; source: string; similarity: number }>> {
  const supabase = createServerClient();

  // Use pgvector's cosine distance operator
  const { data, error } = await supabase.rpc('match_us_content', {
    query_embedding: JSON.stringify(embedding),
    match_threshold: minSimilarity,
    match_count: limit,
  });

  if (error) {
    console.error('[Embeddings] Similarity search failed:', error.message);
    return [];
  }

  return data || [];
}

// ============================================
// Talent Content Embeddings
// ============================================

/**
 * Build embeddable text from a talent post (caption + transcription)
 */
export function buildPostEmbeddingText(post: {
  caption?: string | null;
  transcription?: string | null;
}): string {
  const parts: string[] = [];
  if (post.caption?.trim()) parts.push(post.caption.trim());
  if (post.transcription?.trim()) parts.push(post.transcription.trim());
  return parts.join('. ').substring(0, 8000);
}

/**
 * Generate and store embeddings for talent_posts that don't have one
 */
export async function embedUnprocessedTalentPosts(options?: {
  talentId?: string;
  limit?: number;
}): Promise<{ processed: number; errors: string[] }> {
  const supabase = createServerClient();
  let processed = 0;
  const errors: string[] = [];
  const limit = options?.limit ?? 200;

  let query = supabase
    .from('talent_posts')
    .select('id, caption, transcription')
    .is('embedding', null)
    .order('posted_at', { ascending: false })
    .limit(limit);

  if (options?.talentId) {
    query = query.eq('talent_id', options.talentId);
  }

  const { data: items } = await query;
  if (!items || items.length === 0) return { processed: 0, errors: [] };

  // Filter to posts with text content
  const embeddable = items.filter(
    (item) => (item.caption?.trim() || item.transcription?.trim())
  );

  console.log(`[Embeddings] Processing ${embeddable.length} talent posts`);

  for (let i = 0; i < embeddable.length; i += 10) {
    const batch = embeddable.slice(i, i + 10);
    const texts = batch.map((item) => buildPostEmbeddingText(item));

    try {
      const embeddings = await generateEmbeddings(texts);

      for (let j = 0; j < batch.length; j++) {
        const { error } = await supabase
          .from('talent_posts')
          .update({ embedding: JSON.stringify(embeddings[j]) })
          .eq('id', batch[j].id);

        if (error) {
          errors.push(`[post:${batch[j].id}] ${error.message}`);
        } else {
          processed++;
        }
      }
    } catch (error: any) {
      errors.push(`[post-batch:${i}] ${error.message}`);
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`[Embeddings] Posts done: ${processed} processed, ${errors.length} errors`);
  return { processed, errors };
}

/**
 * Generate and store embeddings for talent_highlight_items that don't have one
 */
export async function embedUnprocessedHighlightItems(options?: {
  limit?: number;
}): Promise<{ processed: number; errors: string[] }> {
  const supabase = createServerClient();
  let processed = 0;
  const errors: string[] = [];
  const limit = options?.limit ?? 200;

  const { data: items } = await supabase
    .from('talent_highlight_items')
    .select('id, transcription')
    .is('embedding', null)
    .not('transcription', 'is', null)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (!items || items.length === 0) return { processed: 0, errors: [] };

  console.log(`[Embeddings] Processing ${items.length} highlight items`);

  for (let i = 0; i < items.length; i += 10) {
    const batch = items.slice(i, i + 10);
    const texts = batch.map((item) => (item.transcription ?? '').substring(0, 8000));

    try {
      const embeddings = await generateEmbeddings(texts);

      for (let j = 0; j < batch.length; j++) {
        const { error } = await supabase
          .from('talent_highlight_items')
          .update({ embedding: JSON.stringify(embeddings[j]) })
          .eq('id', batch[j].id);

        if (error) {
          errors.push(`[highlight:${batch[j].id}] ${error.message}`);
        } else {
          processed++;
        }
      }
    } catch (error: any) {
      errors.push(`[highlight-batch:${i}] ${error.message}`);
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`[Embeddings] Highlights done: ${processed} processed, ${errors.length} errors`);
  return { processed, errors };
}

/**
 * Find relevant talent content using vector similarity search
 */
export async function findSimilarTalentContent(
  queryText: string,
  limit: number = 10,
  minSimilarity: number = 0.60
): Promise<Array<{
  id: string;
  content_type: 'post' | 'highlight_item';
  text_content: string;
  post_url: string | null;
  media_type: string | null;
  likes_count: number | null;
  comments_count: number | null;
  posted_at: string | null;
  highlight_title: string | null;
  similarity: number;
}>> {
  const embedding = await generateEmbedding(queryText);
  const supabase = createServerClient();

  const { data, error } = await supabase.rpc('match_talent_content', {
    query_embedding: JSON.stringify(embedding),
    match_threshold: minSimilarity,
    match_count: limit,
  });

  if (error) {
    console.error('[Embeddings] Talent similarity search failed:', error.message);
    return [];
  }

  return data || [];
}

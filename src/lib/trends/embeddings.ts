/**
 * Embeddings — Generate text embeddings via OpenAI
 * Used for topic clustering of US entertainment content
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

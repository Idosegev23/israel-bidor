/**
 * Backfill embeddings for all existing talent posts and highlight items
 * Usage: npm run embeddings:generate
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '..', '.env.local') });

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
  console.error('Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const BATCH_SIZE = 10;
const DELAY_MS = 500;

async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts.map((t) => t.substring(0, 8000)),
  });
  return response.data.map((d) => d.embedding);
}

async function backfillPosts() {
  console.log('\n--- Backfilling talent_posts embeddings ---\n');

  const { data: posts, error } = await supabase
    .from('talent_posts')
    .select('id, caption, transcription')
    .is('embedding', null)
    .order('posted_at', { ascending: false });

  if (error || !posts) {
    console.error('Failed to fetch posts:', error?.message);
    return { processed: 0, errors: 0 };
  }

  const embeddable = posts.filter(
    (p) => (p.caption?.trim() || p.transcription?.trim())
  );

  console.log(`Found ${posts.length} posts without embeddings, ${embeddable.length} with text content`);

  let processed = 0;
  let errors = 0;

  for (let i = 0; i < embeddable.length; i += BATCH_SIZE) {
    const batch = embeddable.slice(i, i + BATCH_SIZE);
    const texts = batch.map((p) => {
      const parts: string[] = [];
      if (p.caption?.trim()) parts.push(p.caption.trim());
      if (p.transcription?.trim()) parts.push(p.transcription.trim());
      return parts.join('. ');
    });

    try {
      const embeddings = await generateBatchEmbeddings(texts);

      for (let j = 0; j < batch.length; j++) {
        const { error: updateError } = await supabase
          .from('talent_posts')
          .update({ embedding: JSON.stringify(embeddings[j]) })
          .eq('id', batch[j].id);

        if (updateError) {
          console.error(`  Error on post ${batch[j].id}: ${updateError.message}`);
          errors++;
        } else {
          processed++;
        }
      }

      console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} posts processed`);
    } catch (err: any) {
      console.error(`  Batch error: ${err.message}`);
      errors += batch.length;
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  return { processed, errors };
}

async function backfillHighlightItems() {
  console.log('\n--- Backfilling talent_highlight_items embeddings ---\n');

  const { data: items, error } = await supabase
    .from('talent_highlight_items')
    .select('id, transcription')
    .is('embedding', null)
    .not('transcription', 'is', null)
    .order('timestamp', { ascending: false });

  if (error || !items) {
    console.error('Failed to fetch highlight items:', error?.message);
    return { processed: 0, errors: 0 };
  }

  console.log(`Found ${items.length} highlight items without embeddings`);

  let processed = 0;
  let errors = 0;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const texts = batch.map((item) => (item.transcription ?? '').substring(0, 8000));

    try {
      const embeddings = await generateBatchEmbeddings(texts);

      for (let j = 0; j < batch.length; j++) {
        const { error: updateError } = await supabase
          .from('talent_highlight_items')
          .update({ embedding: JSON.stringify(embeddings[j]) })
          .eq('id', batch[j].id);

        if (updateError) {
          console.error(`  Error on item ${batch[j].id}: ${updateError.message}`);
          errors++;
        } else {
          processed++;
        }
      }

      console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} items processed`);
    } catch (err: any) {
      console.error(`  Batch error: ${err.message}`);
      errors += batch.length;
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  return { processed, errors };
}

async function main() {
  console.log('============================================');
  console.log('  Embedding Backfill for Talent Content');
  console.log('============================================');

  const postsResult = await backfillPosts();
  const highlightsResult = await backfillHighlightItems();

  console.log('\n============================================');
  console.log('  Results:');
  console.log(`  Posts:      ${postsResult.processed} OK, ${postsResult.errors} errors`);
  console.log(`  Highlights: ${highlightsResult.processed} OK, ${highlightsResult.errors} errors`);
  console.log('============================================\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

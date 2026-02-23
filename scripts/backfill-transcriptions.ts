/**
 * Backfill transcriptions for ALL highlight items
 * Re-fetches highlight details from ScrapeCreators API to get fresh video URLs,
 * then transcribes all videos with Gemini.
 *
 * Usage: npm run transcribe:backfill
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '..', '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { getScrapeCreatorsClient } from '../src/lib/scrape/scrapeCreatorsClient';
import { transcribeVideo } from '../src/lib/ai/transcription';
import { generateEmbedding } from '../src/lib/trends/embeddings';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const scrapeClient = getScrapeCreatorsClient();

// Stats
let totalTranscribed = 0;
let totalEmbedded = 0;
let totalErrors = 0;
let totalSkipped = 0;

async function processHighlight(highlightId: string, dbHighlightId: string, title: string) {
  try {
    // Re-fetch highlight details from API to get fresh video URLs
    const details = await scrapeClient.getHighlightDetails(highlightId);

    // Filter stories from 2026-02-01 onwards
    const cutoffDate = new Date('2026-02-01T00:00:00Z');
    const items = details.items.filter(item => {
      if (!item.timestamp) return false;
      return new Date(item.timestamp) >= cutoffDate;
    });

    console.log(`  📂 "${title}": ${items.length}/${details.items.length} stories from 1.2+`);

    let transcribedInHighlight = 0;

    for (const item of items) {
      // Check if already transcribed
      const { data: existing } = await supabase
        .from('talent_highlight_items')
        .select('id, transcription')
        .eq('story_id', item.story_id)
        .single();

      if (existing?.transcription) {
        totalSkipped++;
        continue;
      }

      // Upsert item with fresh URLs
      const upsertData: any = {
        highlight_id: dbHighlightId,
        story_id: item.story_id,
        shortcode: item.shortcode,
        media_type: item.media_type,
        media_url: item.media_url,
        video_url: item.video_url,
        image_url: item.image_url,
        thumbnail_url: item.thumbnail_url,
        timestamp: item.timestamp,
      };

      // Transcribe video items
      if (item.media_type === 'video' && item.video_url) {
        try {
          const result = await transcribeVideo(item.video_url);
          if (result.success && result.text) {
            upsertData.transcription = result.text;
            upsertData.processed = true;
            upsertData.processed_at = new Date().toISOString();
            transcribedInHighlight++;
            totalTranscribed++;
            process.stdout.write(`    ✅ ${item.story_id.substring(0, 15)}... (${result.text.substring(0, 50)}...)\n`);

            // Generate embedding
            try {
              const embedding = await generateEmbedding(result.text);
              upsertData.embedding = JSON.stringify(embedding);
              totalEmbedded++;
            } catch (embErr: any) {
              console.warn(`    ⚠️  Embedding failed: ${embErr.message}`);
            }
          } else {
            totalErrors++;
            process.stdout.write(`    ❌ ${item.story_id.substring(0, 15)}... (${result.error})\n`);
          }
        } catch (err: any) {
          totalErrors++;
          process.stdout.write(`    ❌ ${item.story_id.substring(0, 15)}... (${err.message})\n`);
        }
      } else {
        totalSkipped++;
      }

      // Save/update item
      await supabase.from('talent_highlight_items').upsert(upsertData, {
        onConflict: 'story_id',
      });
    }

    if (transcribedInHighlight > 0) {
      console.log(`  ✅ ${transcribedInHighlight} videos transcribed in "${title}"`);
    }
  } catch (err: any) {
    console.error(`  ❌ Error on highlight "${title}": ${err.message}`);
    totalErrors++;
  }

  // Rate limit between highlights
  await new Promise((r) => setTimeout(r, 1500));
}

async function main() {
  console.log('============================================');
  console.log('  Backfill Highlight Transcriptions');
  console.log('============================================\n');

  // Get all highlights from DB
  const { data: highlights, error } = await supabase
    .from('talent_highlights')
    .select('id, highlight_id, title')
    .order('created_at', { ascending: false });

  if (error || !highlights) {
    console.error('Failed to fetch highlights:', error?.message);
    process.exit(1);
  }

  console.log(`Found ${highlights.length} highlights to process\n`);

  for (let i = 0; i < highlights.length; i++) {
    const h = highlights[i];
    console.log(`\n[${i + 1}/${highlights.length}] Processing: ${h.title}`);
    await processHighlight(h.highlight_id, h.id, h.title);

    // Print progress
    if ((i + 1) % 10 === 0) {
      console.log(`\n--- Progress: ${i + 1}/${highlights.length} highlights ---`);
      console.log(`    Transcribed: ${totalTranscribed}, Embedded: ${totalEmbedded}, Errors: ${totalErrors}, Skipped: ${totalSkipped}`);
      console.log('');
    }
  }

  console.log('\n============================================');
  console.log('  Results:');
  console.log(`  Transcribed: ${totalTranscribed}`);
  console.log(`  Embedded:    ${totalEmbedded}`);
  console.log(`  Errors:      ${totalErrors}`);
  console.log(`  Skipped:     ${totalSkipped}`);
  console.log('============================================\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

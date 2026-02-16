/**
 * Transcribe all existing videos that don't have transcriptions yet
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { transcribeVideo } from '../src/lib/ai/transcription';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_BATCH = 20; // Limit for Vercel runtime

async function transcribeExisting() {
  console.log('═══════════════════════════════════════════');
  console.log('🎥 Transcribe Existing Videos');
  console.log('═══════════════════════════════════════════\n');

  // Get israel_bidur profile
  const { data: profile } = await supabase
    .from('talent_profiles')
    .select('id')
    .eq('username', 'israel_bidur')
    .single();

  if (!profile) {
    console.error('❌ Profile not found');
    return;
  }

  // Get highlight items that need transcription
  const { data: highlights } = await supabase
    .from('talent_highlights')
    .select('id')
    .eq('talent_id', profile.id);

  const highlightIds = (highlights || []).map(h => h.id);

  const { data: items } = await supabase
    .from('talent_highlight_items')
    .select('id, story_id, video_url, media_type, transcription')
    .in('highlight_id', highlightIds)
    .eq('media_type', 'video')
    .is('transcription', null)
    .not('video_url', 'is', null)
    .order('timestamp', { ascending: false })
    .limit(MAX_BATCH);

  console.log(`📋 Found ${items?.length || 0} videos needing transcription`);
  console.log(`⚡ Processing first ${MAX_BATCH} (Vercel runtime limit)\n`);

  if (!items || items.length === 0) {
    console.log('✅ All videos already transcribed!');
    return;
  }

  let success = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    console.log(`\n[${i + 1}/${items.length}] Story: ${item.story_id}`);
    
    try {
      const result = await transcribeVideo(item.video_url!);

      if (result.success && result.text) {
        // Update item with transcription
        const { error } = await supabase
          .from('talent_highlight_items')
          .update({
            transcription: result.text,
            processed: true,
            processed_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        if (error) {
          console.error(`❌ Failed to save: ${error.message}`);
          failed++;
        } else {
          console.log(`✅ Saved (${result.text.substring(0, 80)}...)`);
          success++;
        }
      } else {
        console.warn(`⚠️  Transcription failed: ${result.error}`);
        failed++;
      }
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
      failed++;
    }
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('📊 Results:');
  console.log(`  • Success: ${success}`);
  console.log(`  • Failed: ${failed}`);
  console.log(`  • Remaining: ${Math.max(0, (items?.length || 0) - success - failed)}`);
  console.log('═══════════════════════════════════════════\n');
}

transcribeExisting().catch(console.error);

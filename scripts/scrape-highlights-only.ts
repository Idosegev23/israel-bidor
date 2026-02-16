/**
 * Scrape ONLY Highlights - Israel Bidur
 * סריקה של ההיילייטס בלבד (הפוסטים כבר קיימים!)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });

import { createServerClient } from '../src/lib/supabase/server';
import { getScrapeCreatorsClient } from '../src/lib/scrape/scrapeCreatorsClient';

const USERNAME = 'israel_bidur';

async function scrapeHighlightsOnly() {
  console.log('═══════════════════════════════════════════');
  console.log('⭐ HIGHLIGHTS SCRAPE - Israel Bidur');
  console.log('═══════════════════════════════════════════');
  console.log(`\n📋 Username: @${USERNAME}`);
  console.log(`⭐ Highlights: ALL (98)`);
  console.log(`💾 Saving: Videos + URLs (no transcription yet)`);
  console.log('\n');

  const startTime = Date.now();
  const supabase = createServerClient();
  const scrapeClient = getScrapeCreatorsClient();

  try {
    // Get talent ID
    const { data: profile } = await supabase
      .from('talent_profiles')
      .select('id')
      .eq('username', USERNAME)
      .single();

    if (!profile) {
      throw new Error(`Profile @${USERNAME} not found in database!`);
    }

    const talentId = profile.id;
    console.log(`✅ Found talent ID: ${talentId}\n`);

    // Get all highlights
    console.log('📥 Fetching highlights...');
    const highlights = await scrapeClient.getHighlights(USERNAME);
    console.log(`✅ Found ${highlights.length} highlights\n`);

    let highlightsSaved = 0;
    let storiesSaved = 0;
    let videosTranscribed = 0;

    // Process each highlight
    for (let i = 0; i < highlights.length; i++) {
      const highlight = highlights[i];
      const num = i + 1;

      console.log(`\n┌─────────────────────────────────────────`);
      console.log(`│ [${num}/${highlights.length}] ${highlight.title}`);
      console.log(`└─────────────────────────────────────────\n`);

      // Save highlight metadata
      const { data: savedHighlight, error: highlightError } = await supabase
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
        console.error(`  ❌ Error saving highlight: ${highlightError?.message}`);
        continue;
      }

      highlightsSaved++;
      console.log(`  ✅ Highlight saved`);

      // Get highlight details (stories/videos)
      try {
        const highlightDetails = await scrapeClient.getHighlightDetails(highlight.highlight_id);
        console.log(`  📹 Found ${highlightDetails.items.length} stories`);

        // Save each story (no transcription yet)
        for (let j = 0; j < highlightDetails.items.length; j++) {
          const item = highlightDetails.items[j];
          const storyNum = j + 1;

          console.log(`    [${storyNum}/${highlightDetails.items.length}] ${item.media_type === 'video' ? '🎥' : '📷'} Saving...`);

          // Save highlight item (no transcription)
          // Check if already exists
          const { data: existing } = await supabase
            .from('talent_highlight_items')
            .select('id')
            .eq('story_id', item.story_id)
            .single();

          let itemError = null;

          if (existing) {
            // Update existing
            const { error } = await supabase
              .from('talent_highlight_items')
              .update({
                media_url: item.media_url,
                video_url: item.video_url,
                image_url: item.image_url,
                thumbnail_url: item.thumbnail_url,
              })
              .eq('story_id', item.story_id);
            itemError = error;
          } else {
            // Insert new
            const { error } = await supabase.from('talent_highlight_items').insert({
              highlight_id: savedHighlight.id,
              story_id: item.story_id,
              shortcode: item.shortcode,
              media_type: item.media_type,
              media_url: item.media_url,
              video_url: item.video_url,
              image_url: item.image_url,
              thumbnail_url: item.thumbnail_url,
              timestamp: item.timestamp,
              transcription: null,
              processed: false,
              processed_at: null,
            });
            itemError = error;
          }

          if (!itemError) {
            storiesSaved++;
            if (item.media_type === 'video') videosTranscribed++; // Count videos for later
            console.log(`    ✅ Saved`);
          } else {
            console.error(`    ❌ Error: ${itemError.message}`);
          }
        }
      } catch (error: any) {
        console.error(`  ❌ Error processing highlight: ${error.message}`);
      }

      // Rate limit between highlights
      if (i < highlights.length - 1) {
        console.log(`\n  ⏳ Waiting 3 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n═══════════════════════════════════════════');
    console.log('✅ HIGHLIGHTS SCRAPE COMPLETE!');
    console.log('═══════════════════════════════════════════\n');
    console.log('📊 Results:');
    console.log(`  • Highlights: ${highlightsSaved}/${highlights.length}`);
    console.log(`  • Stories: ${storiesSaved}`);
    console.log(`  • Videos (URLs saved): ${videosTranscribed}`);
    console.log(`  • Duration: ${duration}s`);
    console.log(`\n💾 All data saved to Supabase!`);
    console.log(`\n📝 Note: Videos saved with URLs. Transcription can be done later.`);
    console.log('\n═══════════════════════════════════════════\n');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

scrapeHighlightsOnly().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

/**
 * Check database status and what needs transcription
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkStatus() {
  console.log('═══════════════════════════════════════════');
  console.log('📊 Database Status Check');
  console.log('═══════════════════════════════════════════\n');

  // Get israel_bidur profile
  const { data: profile } = await supabase
    .from('talent_profiles')
    .select('id, username, full_name, posts_count, last_scraped_at')
    .eq('username', 'israel_bidur')
    .single();

  if (!profile) {
    console.log('❌ Profile not found');
    return;
  }

  console.log(`👤 Profile: ${profile.full_name} (@${profile.username})`);
  console.log(`📅 Last scraped: ${profile.last_scraped_at}`);
  console.log(`📊 Posts count: ${profile.posts_count}\n`);

  // Check posts
  const { data: posts, count: postsCount } = await supabase
    .from('talent_posts')
    .select('id, media_type, transcription', { count: 'exact' })
    .eq('talent_id', profile.id);

  const transcribedPosts = posts?.filter(p => p.transcription).length || 0;
  const videoPosts = posts?.filter(p => p.media_type === 'video').length || 0;

  console.log('📸 Posts:');
  console.log(`  • Total: ${postsCount}`);
  console.log(`  • Videos: ${videoPosts}`);
  console.log(`  • Transcribed: ${transcribedPosts}\n`);

  // Check highlights
  const { data: highlights, count: highlightsCount } = await supabase
    .from('talent_highlights')
    .select('id, title', { count: 'exact' })
    .eq('talent_id', profile.id);

  console.log(`⭐ Highlights: ${highlightsCount}\n`);

  // Check highlight items
  const { data: items, count: itemsCount } = await supabase
    .from('talent_highlight_items')
    .select('id, media_type, transcription, video_url', { count: 'exact' })
    .in('highlight_id', (highlights || []).map(h => h.id));

  const videoItems = items?.filter(i => i.media_type === 'video').length || 0;
  const transcribedItems = items?.filter(i => i.transcription).length || 0;
  const needTranscription = items?.filter(i => i.media_type === 'video' && !i.transcription && i.video_url).length || 0;

  console.log('🎥 Highlight Items:');
  console.log(`  • Total: ${itemsCount}`);
  console.log(`  • Videos: ${videoItems}`);
  console.log(`  • Transcribed: ${transcribedItems}`);
  console.log(`  • Need transcription: ${needTranscription}\n`);

  // Show some items that need transcription
  if (needTranscription > 0) {
    const { data: sampleItems } = await supabase
      .from('talent_highlight_items')
      .select('id, story_id, video_url')
      .in('highlight_id', (highlights || []).map(h => h.id))
      .eq('media_type', 'video')
      .is('transcription', null)
      .not('video_url', 'is', null)
      .limit(5);

    console.log('📋 Sample items needing transcription:');
    sampleItems?.forEach((item, i) => {
      console.log(`  ${i + 1}. Story ID: ${item.story_id}`);
      console.log(`     Video: ${item.video_url?.substring(0, 80)}...`);
    });
  }

  console.log('\n═══════════════════════════════════════════');
}

checkStatus().catch(console.error);

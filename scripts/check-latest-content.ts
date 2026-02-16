import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

async function checkLatestContent() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  console.log('📊 Checking latest content in database...\n');
  
  // Check latest posts
  const { data: posts } = await supabase
    .from('talent_posts')
    .select('post_id, caption, posted_at')
    .order('posted_at', { ascending: false })
    .limit(5);
  
  console.log('📸 Latest 5 Posts:');
  posts?.forEach((post, i) => {
    const date = new Date(post.posted_at);
    const today = new Date();
    const hoursAgo = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60));
    const daysAgo = Math.floor(hoursAgo / 24);
    
    console.log(`\n${i + 1}. ${daysAgo} days ago (${date.toISOString().split('T')[0]})`);
    console.log(`   Caption: ${post.caption?.substring(0, 60)}...`);
  });
  
  // Check latest highlight items
  const { data: items } = await supabase
    .from('talent_highlight_items')
    .select('story_id, timestamp, transcription')
    .order('timestamp', { ascending: false })
    .limit(5);
  
  console.log('\n\n⭐ Latest 5 Highlight Stories:');
  items?.forEach((item, i) => {
    const date = new Date(item.timestamp);
    const today = new Date();
    const hoursAgo = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60));
    const daysAgo = Math.floor(hoursAgo / 24);
    
    console.log(`\n${i + 1}. ${daysAgo} days ago (${date.toISOString().split('T')[0]})`);
    if (item.transcription) {
      console.log(`   Transcription: ${item.transcription.substring(0, 60)}...`);
    }
  });
  
  console.log('\n\n💡 Note: Highlights are archived stories, not current 24h stories!');
  console.log('📅 Today is: 2026-02-16');
}

checkLatestContent();

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
dotenv.config({ path: '.env.local' });

async function checkRecentItems() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  
  console.log('🔍 Checking most recent highlight items...\n');
  
  // Get items from today only (2026-02-16)
  const today = new Date('2026-02-16').toISOString();
  
  const { data: items, error } = await supabase
    .from('talent_highlight_items')
    .select('story_id, created_at, transcription, processed')
    .gte('created_at', today)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${items?.length || 0} recent items:`);
  items?.forEach((item, i) => {
    console.log(`\n${i + 1}. Story ID: ${item.story_id}`);
    console.log(`   Created: ${item.created_at}`);
    console.log(`   Processed: ${item.processed ? '✅' : '❌'}`);
    if (item.transcription) {
      console.log(`   Transcription: ${item.transcription.substring(0, 80)}...`);
    }
  });
}

checkRecentItems();

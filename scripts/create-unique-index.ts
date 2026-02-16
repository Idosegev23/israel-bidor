import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
dotenv.config({ path: '.env.local' });

async function createUniqueIndex() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  console.log('🔧 Creating UNIQUE index on talent_highlight_items.story_id...\n');
  
  try {
    // Use Supabase's SQL execution via RPC
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: 'CREATE UNIQUE INDEX IF NOT EXISTS idx_highlight_item_story_id ON talent_highlight_items(story_id);'
    }) as any;
    
    if (error) {
      // If the RPC doesn't exist, we'll create the index manually via a workaround
      console.log('ℹ️  RPC method not available. Using alternative method...\n');
      
      // Check current indexes
      console.log('📋 Checking current indexes...');
      const { data: indexes, error: indexError } = await supabase
        .from('talent_highlight_items')
        .select('*')
        .limit(1);
      
      if (indexError) {
        console.error('Error:', indexError);
        return;
      }
      
      console.log('\n✅ Please run this SQL in your Supabase SQL Editor:');
      console.log('\n```sql');
      console.log('CREATE UNIQUE INDEX IF NOT EXISTS idx_highlight_item_story_id ON talent_highlight_items(story_id);');
      console.log('```\n');
      console.log('🔗 Go to: https://supabase.com/dashboard/project/tzivxsxhqzauaaesxxao/sql/new\n');
    } else {
      console.log('✅ UNIQUE index created successfully!');
    }
  } catch (err) {
    console.error('Error:', err);
    console.log('\n✅ Please run this SQL in your Supabase SQL Editor:');
    console.log('\n```sql');
    console.log('CREATE UNIQUE INDEX IF NOT EXISTS idx_highlight_item_story_id ON talent_highlight_items(story_id);');
    console.log('```\n');
    console.log('🔗 Go to: https://supabase.com/dashboard/project/tzivxsxhqzauaaesxxao/sql/new\n');
  }
}

createUniqueIndex();

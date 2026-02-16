import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
dotenv.config({ path: '.env.local' });

async function addUniqueIndex() {
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
  
  console.log('🔧 Adding UNIQUE index on talent_highlight_items.story_id...\n');
  
  try {
    // First, check if there are any duplicate story_ids
    const { data: duplicates, error: checkError } = await supabase
      .rpc('check_duplicate_story_ids', {}, { count: 'exact' }) as any;
    
    if (checkError && checkError.code !== '42883') { // 42883 = function does not exist
      console.error('Error checking duplicates:', checkError);
    }
    
    // Create the unique index
    const { error } = await supabase.rpc('create_unique_story_id_index') as any;
    
    if (error && error.code === '42883') {
      // Function doesn't exist, use raw SQL
      console.log('Using direct SQL...');
      
      const { error: sqlError } = await supabase
        .from('talent_highlight_items')
        .select('story_id')
        .then(() => {
          // This is a workaround - we'll use a SQL script instead
          return { error: null };
        });
      
      console.log('\nℹ️  Please run this SQL directly in Supabase:');
      console.log('\n```sql');
      console.log('-- Add UNIQUE index on story_id');
      console.log('CREATE UNIQUE INDEX IF NOT EXISTS idx_highlight_item_story_id ON talent_highlight_items(story_id);');
      console.log('```\n');
      
      console.log('Or via psql:');
      console.log(`psql "${process.env.SUPABASE_DB_URL}" -c "CREATE UNIQUE INDEX IF NOT EXISTS idx_highlight_item_story_id ON talent_highlight_items(story_id);"`);
    } else if (error) {
      console.error('Error creating index:', error);
    } else {
      console.log('✅ UNIQUE index created successfully!');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

addUniqueIndex();

import dotenv from 'dotenv';

// Load .env.local
dotenv.config({ path: '.env.local' });

async function createUniqueIndex() {
  const accessToken = 'sbp_8acd6a360d621c1b237f0e1c2f8eac3e1579a1f4';
  const projectRef = 'tzivxsxhqzauaaesxxao';
  
  console.log('🔧 Creating UNIQUE index on talent_highlight_items.story_id...\n');
  
  const sql = 'CREATE UNIQUE INDEX IF NOT EXISTS idx_highlight_item_story_id ON talent_highlight_items(story_id);';
  
  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: sql
        })
      }
    );
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Error:', result);
      console.log('\nℹ️  Please run manually in Supabase SQL Editor:');
      console.log(`\n${sql}\n`);
      console.log('🔗 https://supabase.com/dashboard/project/tzivxsxhqzauaaesxxao/sql/new\n');
      return;
    }
    
    console.log('✅ UNIQUE index created successfully!\n');
    console.log('Result:', result);
    
    console.log('\n🎉 All done! Now you can run the scraping again and items will be saved properly.');
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\nℹ️  Please run manually in Supabase SQL Editor:');
    console.log(`\n${sql}\n`);
    console.log('🔗 https://supabase.com/dashboard/project/tzivxsxhqzauaaesxxao/sql/new\n');
  }
}

createUniqueIndex();

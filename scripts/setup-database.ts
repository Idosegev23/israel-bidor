/**
 * Setup Supabase Database
 * Executes schema.sql against Supabase via Management API
 */

import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_ACCESS_TOKEN = 'sbp_8acd6a360d621c1b237f0e1c2f8eac3e1579a1f4';
const PROJECT_REF = 'tzivxsxhqzauaaesxxao';

async function executeSQL(query: string): Promise<void> {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SQL execution failed: ${response.status} - ${text}`);
  }

  const result = await response.json();
  return result;
}

async function setupDatabase() {
  console.log('🚀 Setting up Supabase database...\n');

  const schemaPath = path.join(__dirname, '..', 'supabase-schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  console.log('📝 Executing full schema...\n');

  try {
    // Execute the entire schema as one transaction
    await executeSQL(schema);
    console.log('✅ Schema executed successfully!\n');
  } catch (error: any) {
    console.error('❌ Schema execution failed:', error.message);
    
    // If full execution fails, try table-by-table
    console.log('\nTrying table-by-table creation...\n');
    
    const tables = [
      {
        name: 'talent_profiles',
        sql: `CREATE TABLE IF NOT EXISTS talent_profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username VARCHAR(100) UNIQUE NOT NULL,
          full_name VARCHAR(200),
          bio TEXT,
          bio_links TEXT[],
          profile_pic_url TEXT,
          followers_count INTEGER DEFAULT 0,
          following_count INTEGER DEFAULT 0,
          posts_count INTEGER DEFAULT 0,
          is_verified BOOLEAN DEFAULT FALSE,
          is_business BOOLEAN DEFAULT FALSE,
          category VARCHAR(100),
          external_url TEXT,
          last_scraped_at TIMESTAMP WITH TIME ZONE,
          last_processed_at TIMESTAMP WITH TIME ZONE,
          scrape_status VARCHAR(50) DEFAULT 'pending',
          processing_status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_talent_username ON talent_profiles(username);`
      },
      {
        name: 'talent_posts',
        sql: `CREATE TABLE IF NOT EXISTS talent_posts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          talent_id UUID REFERENCES talent_profiles(id) ON DELETE CASCADE,
          post_id VARCHAR(100) UNIQUE NOT NULL,
          shortcode VARCHAR(50) UNIQUE NOT NULL,
          post_url TEXT NOT NULL,
          caption TEXT,
          media_type VARCHAR(20),
          media_urls TEXT[],
          thumbnail_url TEXT,
          likes_count INTEGER DEFAULT 0,
          comments_count INTEGER DEFAULT 0,
          views_count INTEGER DEFAULT 0,
          posted_at TIMESTAMP WITH TIME ZONE,
          location VARCHAR(200),
          mentions TEXT[],
          is_sponsored BOOLEAN DEFAULT FALSE,
          transcription TEXT,
          processed BOOLEAN DEFAULT FALSE,
          processed_at TIMESTAMP WITH TIME ZONE,
          scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_post_talent ON talent_posts(talent_id);`
      },
      {
        name: 'talent_highlights',
        sql: `CREATE TABLE IF NOT EXISTS talent_highlights (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          talent_id UUID REFERENCES talent_profiles(id) ON DELETE CASCADE,
          highlight_id VARCHAR(100) UNIQUE NOT NULL,
          title VARCHAR(200),
          cover_url TEXT,
          items_count INTEGER DEFAULT 0,
          scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );`
      },
      {
        name: 'talent_insights',
        sql: `CREATE TABLE IF NOT EXISTS talent_insights (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          talent_id UUID REFERENCES talent_profiles(id) ON DELETE CASCADE,
          personality JSONB,
          topics JSONB,
          partnerships JSONB,
          coupons JSONB,
          audience_insights JSONB,
          summary_text TEXT,
          key_themes TEXT[],
          model_used VARCHAR(50) DEFAULT 'gemini-3-pro-preview',
          tokens_used INTEGER,
          processing_time_ms INTEGER,
          generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );`
      },
      {
        name: 'scrape_jobs',
        sql: `CREATE TABLE IF NOT EXISTS scrape_jobs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          job_type VARCHAR(50) NOT NULL,
          target_username VARCHAR(100),
          status VARCHAR(50) DEFAULT 'pending',
          progress INTEGER DEFAULT 0,
          profiles_scraped INTEGER DEFAULT 0,
          posts_scraped INTEGER DEFAULT 0,
          highlights_scraped INTEGER DEFAULT 0,
          errors_count INTEGER DEFAULT 0,
          started_at TIMESTAMP WITH TIME ZONE,
          completed_at TIMESTAMP WITH TIME ZONE,
          duration_seconds INTEGER,
          triggered_by VARCHAR(50),
          error_message TEXT,
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );`
      },
      {
        name: 'cron_logs',
        sql: `CREATE TABLE IF NOT EXISTS cron_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          cron_type VARCHAR(50) NOT NULL,
          status VARCHAR(50) DEFAULT 'running',
          talents_processed INTEGER DEFAULT 0,
          new_posts_found INTEGER DEFAULT 0,
          insights_generated INTEGER DEFAULT 0,
          started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          completed_at TIMESTAMP WITH TIME ZONE,
          duration_seconds INTEGER,
          error_message TEXT,
          logs JSONB
        );`
      },
      {
        name: 'system_config',
        sql: `CREATE TABLE IF NOT EXISTS system_config (
          key VARCHAR(100) PRIMARY KEY,
          value JSONB NOT NULL,
          description TEXT,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        INSERT INTO system_config (key, value, description) VALUES
          ('target_talents', '["noa_kirel", "staticben", "shira_haas", "gal_gadot"]', 'List of talents to scrape daily'),
          ('scrape_settings', '{"posts_limit": 50, "enable_highlights": true, "enable_comments": false}', 'Default scrape settings')
        ON CONFLICT (key) DO NOTHING;`
      },
      {
        name: 'raw_data_archive',
        sql: `CREATE TABLE IF NOT EXISTS raw_data_archive (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          talent_id UUID REFERENCES talent_profiles(id) ON DELETE CASCADE,
          data_type VARCHAR(50) NOT NULL,
          raw_json JSONB NOT NULL,
          source VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );`
      }
    ];
    
    for (const table of tables) {
      try {
        console.log(`Creating ${table.name}...`);
        await executeSQL(table.sql);
        console.log(`✅ ${table.name} created`);
        await new Promise(r => setTimeout(r, 500));
      } catch (e: any) {
        if (e.message.includes('already exists')) {
          console.log(`⚠️  ${table.name} already exists`);
        } else {
          console.error(`❌ ${table.name} failed: ${e.message.substring(0, 80)}`);
        }
      }
    }
  }

  console.log('\n✅ Database setup complete!\n');
}

setupDatabase().catch((error) => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});

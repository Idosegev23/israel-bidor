-- ============================================
-- Israel Bidur - Full Production Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. Talent Profiles
-- ============================================
CREATE TABLE IF NOT EXISTS talent_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  
  -- Metadata
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  last_processed_at TIMESTAMP WITH TIME ZONE,
  scrape_status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, failed
  processing_status VARCHAR(50) DEFAULT 'pending',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_talent_username ON talent_profiles(username);
CREATE INDEX idx_talent_scrape_status ON talent_profiles(scrape_status);
CREATE INDEX idx_talent_last_scraped ON talent_profiles(last_scraped_at);

-- ============================================
-- 2. Talent Posts
-- ============================================
CREATE TABLE IF NOT EXISTS talent_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  talent_id UUID REFERENCES talent_profiles(id) ON DELETE CASCADE,
  
  post_id VARCHAR(100) UNIQUE NOT NULL,
  shortcode VARCHAR(50) UNIQUE NOT NULL,
  post_url TEXT NOT NULL,
  
  caption TEXT,
  media_type VARCHAR(20), -- photo, video, carousel
  media_urls TEXT[],
  thumbnail_url TEXT,
  
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  
  posted_at TIMESTAMP WITH TIME ZONE,
  location VARCHAR(200),
  mentions TEXT[],
  is_sponsored BOOLEAN DEFAULT FALSE,
  
  -- Processing
  transcription TEXT, -- For videos
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE,
  
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_post_talent ON talent_posts(talent_id);
CREATE INDEX idx_post_shortcode ON talent_posts(shortcode);
CREATE INDEX idx_post_processed ON talent_posts(processed);
CREATE INDEX idx_post_posted_at ON talent_posts(posted_at DESC);

-- ============================================
-- 3. Talent Highlights
-- ============================================
CREATE TABLE IF NOT EXISTS talent_highlights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  talent_id UUID REFERENCES talent_profiles(id) ON DELETE CASCADE,
  
  highlight_id VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(200),
  cover_url TEXT,
  items_count INTEGER DEFAULT 0,
  
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_highlight_talent ON talent_highlights(talent_id);

-- ============================================
-- 4. Talent Highlight Items (Stories)
-- ============================================
CREATE TABLE IF NOT EXISTS talent_highlight_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  highlight_id UUID REFERENCES talent_highlights(id) ON DELETE CASCADE,
  
  story_id VARCHAR(100) NOT NULL,
  shortcode VARCHAR(50),
  media_type VARCHAR(20), -- photo, video, other
  media_url TEXT,
  video_url TEXT,
  image_url TEXT,
  thumbnail_url TEXT,
  timestamp TIMESTAMP WITH TIME ZONE,
  
  -- Processing
  transcription TEXT,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_highlight_item_highlight ON talent_highlight_items(highlight_id);
CREATE INDEX idx_highlight_item_processed ON talent_highlight_items(processed);

-- ============================================
-- 5. AI Processed Insights (Gemini Results)
-- ============================================
CREATE TABLE IF NOT EXISTS talent_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  talent_id UUID REFERENCES talent_profiles(id) ON DELETE CASCADE,
  
  -- Insights Data
  personality JSONB, -- {traits: [], tone: "", style: ""}
  topics JSONB, -- [{"name": "fashion", "frequency": 10, "sentiment": "positive"}]
  partnerships JSONB, -- [{"brand": "Nike", "type": "sponsored", "posts": []}]
  coupons JSONB, -- [{"code": "NOA20", "brand": "...", "discovered_at": "..."}]
  audience_insights JSONB, -- {demographics: {}, engagement: {}}
  
  -- Summary
  summary_text TEXT,
  key_themes TEXT[],
  
  -- Metadata
  model_used VARCHAR(50) DEFAULT 'gemini-3-pro-preview',
  tokens_used INTEGER,
  processing_time_ms INTEGER,
  
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_insights_talent ON talent_insights(talent_id);
CREATE INDEX idx_insights_generated ON talent_insights(generated_at DESC);

-- ============================================
-- 6. Scrape Jobs (Track long-running scrapes)
-- ============================================
CREATE TABLE IF NOT EXISTS scrape_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  job_type VARCHAR(50) NOT NULL, -- full_scrape, quick_rescan, initial_load
  target_username VARCHAR(100),
  
  status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, failed
  progress INTEGER DEFAULT 0, -- 0-100
  
  -- Stats
  profiles_scraped INTEGER DEFAULT 0,
  posts_scraped INTEGER DEFAULT 0,
  highlights_scraped INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  
  -- Metadata
  triggered_by VARCHAR(50), -- manual, cron, api
  error_message TEXT,
  metadata JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_job_status ON scrape_jobs(status);
CREATE INDEX idx_job_type ON scrape_jobs(job_type);
CREATE INDEX idx_job_created ON scrape_jobs(created_at DESC);

-- ============================================
-- 7. Cron Logs (Track daily jobs)
-- ============================================
CREATE TABLE IF NOT EXISTS cron_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  cron_type VARCHAR(50) NOT NULL, -- daily_scrape, weekly_cleanup
  status VARCHAR(50) DEFAULT 'running', -- running, success, failed
  
  -- Results
  talents_processed INTEGER DEFAULT 0,
  new_posts_found INTEGER DEFAULT 0,
  insights_generated INTEGER DEFAULT 0,
  
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  
  error_message TEXT,
  logs JSONB
);

CREATE INDEX idx_cron_type ON cron_logs(cron_type);
CREATE INDEX idx_cron_started ON cron_logs(started_at DESC);

-- ============================================
-- 8. System Config (Runtime settings)
-- ============================================
CREATE TABLE IF NOT EXISTS system_config (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default config
INSERT INTO system_config (key, value, description) VALUES
  ('target_talents', '["noa_kirel", "staticben", "shira_haas", "gal_gadot"]', 'List of talents to scrape daily'),
  ('scrape_settings', '{"posts_limit": 50, "enable_highlights": true, "enable_comments": false}', 'Default scrape settings'),
  ('processing_settings', '{"model": "gemini-3-pro-preview", "thinking_level": "medium"}', 'AI processing settings')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 9. Raw Data Archive (For debugging)
-- ============================================
CREATE TABLE IF NOT EXISTS raw_data_archive (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  talent_id UUID REFERENCES talent_profiles(id) ON DELETE CASCADE,
  
  data_type VARCHAR(50) NOT NULL, -- profile, posts, highlights, comments
  raw_json JSONB NOT NULL,
  source VARCHAR(100), -- scrapecreators, manual
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_archive_talent ON raw_data_archive(talent_id);
CREATE INDEX idx_archive_type ON raw_data_archive(data_type);

-- ============================================
-- 10. Functions & Triggers
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_talent_profiles_updated_at 
  BEFORE UPDATE ON talent_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 11. Row Level Security (RLS) - Optional
-- ============================================

-- Enable RLS on sensitive tables
-- ALTER TABLE talent_profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE talent_posts ENABLE ROW LEVEL SECURITY;

-- Create policies as needed
-- Example: Allow read access to everyone, write only for service role
-- CREATE POLICY "Allow public read" ON talent_profiles FOR SELECT USING (true);
-- CREATE POLICY "Allow service write" ON talent_profiles FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- COMPLETE! 🎉
-- ============================================

-- Verify installation
SELECT 
  'talent_profiles' as table_name, COUNT(*) as count FROM talent_profiles
UNION ALL
SELECT 'talent_posts', COUNT(*) FROM talent_posts
UNION ALL
SELECT 'talent_highlights', COUNT(*) FROM talent_highlights
UNION ALL
SELECT 'scrape_jobs', COUNT(*) FROM scrape_jobs
UNION ALL
SELECT 'cron_logs', COUNT(*) FROM cron_logs;

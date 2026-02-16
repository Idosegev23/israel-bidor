-- ============================================
-- Israel Bidur AGENTS - Full Schema Migration
-- "סוכני ישראל בידור" — כל הטבלאות החדשות
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector"; -- pgvector for embeddings

-- ============================================
-- 1. Users (WhatsApp + Email subscribers)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT UNIQUE NOT NULL,
  email TEXT NULL,
  whatsapp_opt_in BOOLEAN DEFAULT FALSE,
  whatsapp_pref TEXT DEFAULT 'breaking_only' CHECK (whatsapp_pref IN ('off', 'breaking_only', 'daily', 'weekly')),
  email_opt_in BOOLEAN DEFAULT FALSE,
  locale TEXT DEFAULT 'he',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_whatsapp_opt_in ON users(whatsapp_opt_in);
CREATE INDEX idx_users_whatsapp_pref ON users(whatsapp_pref);

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. User Profiles (AI-extracted from chat)
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  interests JSONB DEFAULT '[]',          -- ["reality", "music", "gossip"]
  entities JSONB DEFAULT '[]',           -- ["noa_kirel", "static_ben", "survivor"]
  sensitivities JSONB DEFAULT '[]',      -- ["politics", "violence"]
  tone_preference TEXT NULL,             -- "light" | "serious" | "cynical"
  engagement_score NUMERIC DEFAULT 0,   -- 0-10
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. Segments + Membership
-- ============================================
CREATE TABLE IF NOT EXISTS segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  rules JSONB DEFAULT '{}',   -- editable segmentation rules
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_segments (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  segment_id UUID REFERENCES segments(id) ON DELETE CASCADE,
  score NUMERIC DEFAULT 1,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, segment_id)
);

-- Seed default segments
INSERT INTO segments (name, description, rules) VALUES
  ('reality_lovers', 'אוהבי ריאליטי', '{"interests": ["reality", "survivor", "big_brother", "the_next_star"]}'),
  ('music_fans', 'חובבי מוזיקה', '{"interests": ["music", "concerts", "eurovision"]}'),
  ('celebs_gossip', 'רכילות סלבס', '{"interests": ["gossip", "celebrities", "relationships"]}'),
  ('tv_series', 'סדרות טלוויזיה', '{"interests": ["tv_series", "drama", "comedy"]}'),
  ('no_politics', 'ללא פוליטיקה', '{"sensitivities": ["politics"]}')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 4. IL Content Items (Israeli entertainment)
-- ============================================
CREATE TABLE IF NOT EXISTS il_content_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL,                  -- "rss", "scrape", "instagram", "manual"
  title TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  content_type TEXT DEFAULT 'article' CHECK (content_type IN ('article', 'post', 'video', 'story')),
  category TEXT NULL,                    -- "reality", "music", "gossip", etc.
  published_at TIMESTAMPTZ,
  raw_text TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_il_content_published ON il_content_items(published_at DESC);
CREATE INDEX idx_il_content_source ON il_content_items(source);
CREATE INDEX idx_il_content_category ON il_content_items(category);
CREATE INDEX idx_il_content_created ON il_content_items(created_at DESC);

-- ============================================
-- 5. IL Content Metrics (time-series snapshots)
-- ============================================
CREATE TABLE IF NOT EXISTS il_content_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES il_content_items(id) ON DELETE CASCADE,
  views_30m INT DEFAULT 0,
  shares_30m INT DEFAULT 0,
  comments_30m INT DEFAULT 0,
  growth_rate NUMERIC DEFAULT 0,
  heat_score NUMERIC DEFAULT 0,
  snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_il_metrics_content ON il_content_metrics(content_id);
CREATE INDEX idx_il_metrics_heat ON il_content_metrics(heat_score DESC);
CREATE INDEX idx_il_metrics_snapshot ON il_content_metrics(snapshot_at DESC);

-- ============================================
-- 6. Deliveries (WhatsApp + Email sends)
-- ============================================
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'slack')),
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('breaking', 'daily_digest', 'weekly_digest', 'vip', 'test')),
  content_id UUID NULL REFERENCES il_content_items(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}',   -- headline, why_hot, link, etc.
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMPTZ NULL,
  error TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deliveries_user ON deliveries(user_id);
CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_deliveries_channel ON deliveries(channel);
CREATE INDEX idx_deliveries_type ON deliveries(delivery_type);
CREATE INDEX idx_deliveries_sent ON deliveries(sent_at DESC);
CREATE INDEX idx_deliveries_created ON deliveries(created_at DESC);

-- ============================================
-- 7. Delivery Events (tracking clicks, replies)
-- ============================================
CREATE TABLE IF NOT EXISTS delivery_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('delivered', 'clicked', 'replied', 'stopped', 'bounced')),
  event_payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_devents_delivery ON delivery_events(delivery_id);
CREATE INDEX idx_devents_type ON delivery_events(event_type);
CREATE INDEX idx_devents_created ON delivery_events(created_at DESC);

-- ============================================
-- 8. Chat Messages (conversation history)
-- ============================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'agent')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_user ON chat_messages(user_id);
CREATE INDEX idx_chat_created ON chat_messages(created_at DESC);

-- ============================================
-- 9. US Content Items (American entertainment)
-- ============================================
CREATE TABLE IF NOT EXISTS us_content_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL,                  -- "tmz", "people", "reddit", "youtube", etc.
  title TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  published_at TIMESTAMPTZ,
  raw_text TEXT NULL,
  embedding VECTOR(1536) NULL,           -- OpenAI text-embedding-3-small
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_us_content_source ON us_content_items(source);
CREATE INDEX idx_us_content_published ON us_content_items(published_at DESC);
CREATE INDEX idx_us_content_created ON us_content_items(created_at DESC);

-- ============================================
-- 10. US Content Metrics
-- ============================================
CREATE TABLE IF NOT EXISTS us_content_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES us_content_items(id) ON DELETE CASCADE,
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  shares INT DEFAULT 0,
  velocity_score NUMERIC DEFAULT 0,
  snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_us_metrics_content ON us_content_metrics(content_id);
CREATE INDEX idx_us_metrics_velocity ON us_content_metrics(velocity_score DESC);
CREATE INDEX idx_us_metrics_snapshot ON us_content_metrics(snapshot_at DESC);

-- ============================================
-- 11. US Trends (detected trend clusters)
-- ============================================
CREATE TABLE IF NOT EXISTS us_trends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trend_topic TEXT NOT NULL,
  trend_score NUMERIC DEFAULT 0,
  sources JSONB DEFAULT '[]',             -- ["TMZ", "Reddit", "YouTube"]
  supporting_items JSONB DEFAULT '[]',    -- [{title, url, source}, ...]
  israel_angles JSONB NULL,               -- AI-generated localization ideas
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'used', 'ignored'))
);

CREATE INDEX idx_us_trends_score ON us_trends(trend_score DESC);
CREATE INDEX idx_us_trends_status ON us_trends(status);
CREATE INDEX idx_us_trends_detected ON us_trends(detected_at DESC);

-- ============================================
-- 12. Agent System Config additions
-- ============================================
INSERT INTO system_config (key, value, description) VALUES
  ('heat_score_weights', '{"views": 0.4, "shares": 0.3, "comments": 0.2, "growth": 0.1}', 'Weights for IL heat score calculation'),
  ('heat_threshold_mode', '"dynamic"', 'dynamic (auto) or manual threshold'),
  ('heat_threshold_manual', '100', 'Manual heat score threshold (if mode=manual)'),
  ('breaking_limits', '{"max_per_day": 2, "max_per_week": 6}', 'Anti-spam limits for breaking WhatsApp alerts'),
  ('us_trend_config', '{"min_sources": 2, "spike_multiplier": 2.5, "window_hours": 12}', 'US trend detection config'),
  ('email_limits', '{"max_per_week": 2}', 'Anti-spam limits for VIP emails')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- Helper Views
-- ============================================

-- Latest metrics per IL content item
CREATE OR REPLACE VIEW il_content_latest_metrics AS
SELECT DISTINCT ON (m.content_id)
  c.*,
  m.views_30m,
  m.shares_30m,
  m.comments_30m,
  m.growth_rate,
  m.heat_score,
  m.snapshot_at AS metrics_updated_at
FROM il_content_items c
JOIN il_content_metrics m ON m.content_id = c.id
ORDER BY m.content_id, m.snapshot_at DESC;

-- Daily delivery stats
CREATE OR REPLACE VIEW delivery_stats AS
SELECT
  DATE_TRUNC('day', d.created_at) AS day,
  d.channel,
  d.delivery_type,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE d.status = 'sent') AS sent,
  COUNT(*) FILTER (WHERE d.status = 'failed') AS failed,
  COUNT(DISTINCT de.id) FILTER (WHERE de.event_type = 'clicked') AS clicks,
  COUNT(DISTINCT de.id) FILTER (WHERE de.event_type = 'stopped') AS stops
FROM deliveries d
LEFT JOIN delivery_events de ON de.delivery_id = d.id
GROUP BY 1, 2, 3
ORDER BY 1 DESC;

-- ============================================
-- COMPLETE
-- ============================================
SELECT 'agents_schema_ready' AS status;

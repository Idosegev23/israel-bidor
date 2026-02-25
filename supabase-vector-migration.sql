-- ============================================
-- Vector Embeddings Migration for Israel Bidur
-- Using Gemini text-embedding-004 (768 dimensions)
-- ============================================

CREATE EXTENSION IF NOT EXISTS vector;

-- Embedding columns (768d for Gemini)
ALTER TABLE talent_posts
ADD COLUMN IF NOT EXISTS embedding VECTOR(768);

ALTER TABLE talent_highlight_items
ADD COLUMN IF NOT EXISTS embedding VECTOR(768);

-- IVFFlat indexes for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_talent_posts_embedding
ON talent_posts
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 25);

CREATE INDEX IF NOT EXISTS idx_highlight_items_embedding
ON talent_highlight_items
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 25);

-- ============================================
-- RPC function for combined similarity search
-- ============================================

CREATE OR REPLACE FUNCTION match_talent_content(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content_type TEXT,
  text_content TEXT,
  post_url TEXT,
  media_type TEXT,
  likes_count INT,
  comments_count INT,
  posted_at TIMESTAMPTZ,
  highlight_title TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  (
    SELECT
      tp.id,
      'post'::TEXT AS content_type,
      COALESCE(tp.caption, '') || ' ' || COALESCE(tp.transcription, '') AS text_content,
      tp.post_url,
      tp.media_type::TEXT,
      tp.likes_count,
      tp.comments_count,
      tp.posted_at,
      NULL::TEXT AS highlight_title,
      1 - (tp.embedding <=> query_embedding) AS similarity
    FROM talent_posts tp
    WHERE tp.embedding IS NOT NULL
      AND 1 - (tp.embedding <=> query_embedding) > match_threshold

    UNION ALL

    SELECT
      thi.id,
      'highlight_item'::TEXT AS content_type,
      COALESCE(thi.transcription, '') AS text_content,
      NULL::TEXT AS post_url,
      thi.media_type::TEXT,
      NULL::INT AS likes_count,
      NULL::INT AS comments_count,
      thi.timestamp AS posted_at,
      th.title AS highlight_title,
      1 - (thi.embedding <=> query_embedding) AS similarity
    FROM talent_highlight_items thi
    JOIN talent_highlights th ON th.id = thi.highlight_id
    WHERE thi.embedding IS NOT NULL
      AND 1 - (thi.embedding <=> query_embedding) > match_threshold
  )
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

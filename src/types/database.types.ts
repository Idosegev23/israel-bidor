// Database types for Israel Bidur
// Auto-generated from Supabase schema

export interface TalentProfile {
  id: string;
  username: string;
  full_name?: string;
  bio?: string;
  profile_pic_url?: string;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  is_verified?: boolean;
  category?: string;
  last_scraped_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TalentPost {
  id: string;
  talent_id: string;
  post_id: string;
  shortcode: string;
  caption?: string;
  media_type: 'photo' | 'video' | 'carousel';
  media_urls: string[];
  thumbnail_url?: string;
  likes_count?: number;
  comments_count?: number;
  views_count?: number;
  posted_at?: string;
  scraped_at: string;
}

export interface TalentHighlight {
  id: string;
  talent_id: string;
  highlight_id: string;
  title: string;
  cover_url?: string;
  items_count: number;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    talentUsername?: string;
    suggestedActions?: string[];
    [key: string]: any;
  };
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title?: string;
  last_message_at: string;
  created_at: string;
}

export interface Poll {
  id: string;
  question: string;
  options: Array<{
    id: string;
    text: string;
    votes: number;
  }>;
  total_votes: number;
  expires_at?: string;
  created_at: string;
}

export interface PollVote {
  id: string;
  poll_id: string;
  user_id: string;
  option_id: string;
  created_at: string;
}

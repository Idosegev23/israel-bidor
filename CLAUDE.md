# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Israel Bidur AI Smart Assistant — a Next.js 16 app with a RAG-powered Hebrew chatbot. It scrapes Instagram profiles/posts/highlights via the ScrapeCreators API, stores them in Supabase (PostgreSQL), processes them with Gemini 3 Pro for insights, and serves an AI chat interface that answers questions about the talent using retrieved context.

## Commands

```bash
npm run dev          # Dev server on port 3002 (Turbopack)
npm run build        # Production build
npm run lint         # ESLint
npm run start        # Production server

# Scraping & processing scripts (run via tsx)
npm run scrape:initial      # Full initial scrape
npm run scrape:talent       # Single talent scrape
npm run scrape:all          # All mentions
npm run scrape:deep         # Deep Israel profile scrape
npm run scrape:highlights   # Highlights only
npm run process:ai          # Process talent data with Gemini

# Cron testing
npm run cron:test           # Hits /api/cron/daily-scrape locally
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript (strict)
- **Styling**: Tailwind CSS v4 + Framer Motion + Radix UI primitives
- **State**: Zustand
- **Database**: Supabase (PostgreSQL) — schema in `supabase-schema.sql`
- **AI**: Google Gemini 3 Pro (`@google/genai`) with structured JSON output via Zod
- **Scraping**: ScrapeCreators API with retry/backoff client
- **Deployment**: Vercel with cron jobs (`vercel.json`)

### Source Layout (`src/`)
- **`app/`** — Next.js App Router pages and API routes
  - `page.tsx` — Landing page
  - `chat/page.tsx` — Main chat interface
  - `api/chat/route.ts` — Core RAG chat endpoint (Gemini + Supabase context)
  - `api/scrape/full/route.ts` — Full scrape orchestration
  - `api/cron/daily-scrape/route.ts` — Daily cron (5 AM, bearer-token auth via `CRON_SECRET`)
  - `api/admin/` — Admin stats, trends, hot content, users, deliveries, push
  - `api/talent/[username]/route.ts` — Talent profile data
- **`lib/`** — Core business logic
  - `ai/gemini.ts` — Gemini processor (insight extraction, batch processing)
  - `scrape/scrapeCreatorsClient.ts` — HTTP client with exponential backoff, rate limit handling
  - `scrape/orchestrator.ts` — End-to-end scrape pipeline
  - `supabase/client.ts` / `server.ts` — Supabase client initialization (lazy singleton)
  - `scoring/heat-score.ts`, `velocity.ts` — Content ranking algorithms
  - `trends/` — Spike detection, clustering, embeddings
  - `chat-agent/` — Conversation handler, profile extractor
  - `prompts/` — AI prompt templates
- **`components/`** — React components
  - `chat/talent-card.tsx`, `content-card.tsx` — Chat attachment cards
  - `ui/` — Base UI components (Radix-based)
- **`types/database.types.ts`** — Auto-generated Supabase types
- **`scripts/`** — 15 utility scripts for scraping, DB setup, data checks (run with `tsx`)

### Chat API Flow (`POST /api/chat`)
1. Extract Hebrew-aware keywords from user query
2. Fetch context from Supabase: talent profile, top 50 posts (scored by `keyword_hits*3 + log10(engagement) + recency*2`), highlights, AI insights
3. Build structured context + conversation history (max 12 turns)
4. Call Gemini 3 Pro with system instruction + context
5. Parse structured JSON response (answer, confidence, follow_up, references)
6. Attach talent/content cards and return

### Database
11 PostgreSQL tables defined in `supabase-schema.sql`: `talent_profiles`, `talent_posts`, `talent_highlights`, `talent_highlight_items`, `talent_insights`, `scrape_jobs`, `cron_logs`, `system_config`, `raw_data_archive`, plus chat/segment tables. All use UUID PKs with cascading FKs.

## Key Conventions

- **Language**: UI text and AI prompts are in Hebrew (RTL). Code and comments in English.
- **Path alias**: `@/*` maps to `./src/*`
- **Fonts**: Heebo (Hebrew), Plus Jakarta Sans (English) — loaded in root layout
- **Brand colors**: Primary red `#f42525`, Plum Noir `#2E073F`, Verdant Green `#2D5A27`, Cloud Dancer `#F5F5F0`
- **Singleton pattern**: Supabase and API clients use lazy initialization (`let _instance = null`)
- **Env vars**: All secrets in `.env.local`. Required: `GEMINI_API_KEY`, `SCRAPECREATORS_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

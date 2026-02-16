# 🎯 Israel Bidur - AI Smart Assistant
## מערכת React מלאה עם Next.js 14

> **לקוח:** Israel Bidur בלבד (`CLIENT_NAME=israel_bidur`)  
> **טכנולוגיות:** Next.js 14 + TypeScript + Tailwind CSS + ScrapeCreators API

---

## 🚀 Quick Start

### 1. Setup Environment

קודם כל, תעדכן את הקובץ `.env.local` עם המפתחות שלך:

```bash
# Required
SCRAPECREATORS_API_KEY=9vtBGnDxsaTeSCZqmeGA5VIruEe2

# Optional (for full functionality)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_key
```

### 2. Install & Run

```bash
# התקנת תלויות
npm install

# הרצת dev server
npm run dev

# פתיחת דפדפן
open http://localhost:3000
```

---

## 📁 מבנה הפרויקט

```
app/
├── src/
│   ├── app/
│   │   ├── page.tsx              # 🏠 דף הבית
│   │   ├── chat/
│   │   │   └── page.tsx          # 💬 ממשק צ'אט עם AI
│   │   ├── talent/
│   │   │   └── page.tsx          # ⭐ רשימת טאלנטים
│   │   ├── poll/
│   │   │   └── page.tsx          # 📊 סקרים
│   │   ├── trivia/
│   │   │   └── page.tsx          # 🧠 טריוויה
│   │   └── api/
│   │       ├── scrape/
│   │       │   ├── profile/
│   │       │   │   └── route.ts  # API: scrape profile
│   │       │   └── posts/
│   │       │       └── route.ts  # API: scrape posts
│   │       └── chat/
│   │           └── route.ts       # API: AI chat
│   │
│   ├── lib/
│   │   ├── scrape/
│   │   │   └── scrapeCreatorsClient.ts  # 🔌 ScrapeCreators API
│   │   └── utils/
│   │       └── cn.ts              # Utility functions
│   │
│   └── types/
│       └── database.types.ts      # TypeScript types
│
├── .env.local                     # ⚙️ Environment variables
├── package.json
├── tailwind.config.ts
└── README.md                      # 📖 המסמך הזה
```

---

## 🎨 דפים (Screens)

### 1. דף הבית (`/`)
- לוגו של Israel Bidur
- 4 כפתורי פיצ'רים מרכזיים
- סטטיסטיקות (10K+ משתמשים, 500+ טאלנטים)
- CTA "בואו נתחיל"

### 2. צ'אט (`/chat`)
- ממשק צ'אט מלא עם AI
- הודעות של משתמש ושל AI
- Suggested actions (כפתורי המלצות)
- Typing indicator
- Input עם שליחה

### 3. טאלנטים (`/talent`)
- רשימת טאלנטים מובילים
- חיפוש וסינון לפי קטגוריה
- כרטיסים מעוצבים עם:
  - תמונת פרופיל
  - Verified badge
  - מספר עוקבים
  - Bio קצר

### 4. סקרים (`/poll`)
- *(בבנייה)*
- הצבעה אינטראקטיבית
- תוצאות בזמן אמת

### 5. טריוויה (`/trivia`)
- *(בבנייה)*
- שאלות על עולם הבידור
- מערכת ניקוד

---

## 🔌 API Endpoints

### `POST /api/scrape/profile`
סורק פרופיל Instagram של טאלנט

**Request:**
```json
{
  "username": "noa_kirel"
}
```

**Response:**
```json
{
  "success": true,
  "profile": {
    "username": "noa_kirel",
    "full_name": "נועה קירל",
    "followers_count": 3200000,
    "is_verified": true,
    ...
  }
}
```

### `POST /api/scrape/posts`
סורק פוסטים של טאלנט

**Request:**
```json
{
  "username": "noa_kirel",
  "limit": 10
}
```

**Response:**
```json
{
  "success": true,
  "posts": [...],
  "count": 10
}
```

### `POST /api/chat`
שולח הודעה לAI

**Request:**
```json
{
  "message": "מי זאת נועה קירל?",
  "conversationId": "optional-id"
}
```

**Response:**
```json
{
  "success": true,
  "content": "נועה קירל היא זמרת...",
  "messageId": "123",
  "metadata": {
    "suggestedActions": ["ספר לי עוד", ...]
  }
}
```

---

## 🛠️ טכנולוגיות

### Frontend
- **Next.js 14** - App Router, RSC
- **React 18** - Components, Hooks
- **TypeScript 5** - Type safety
- **Tailwind CSS** - Utility-first styling
- **react-hot-toast** - Notifications

### Backend
- **Next.js API Routes** - RESTful API
- **ScrapeCreators API** - Instagram scraping
- **OpenAI** *(planned)* - AI chat

### Database *(planned)*
- **Supabase** - PostgreSQL + Auth + Realtime

---

## 🎨 עיצוב ו-UI

### צבעים
```css
--primary: #f42525;         /* Israel Bidur Red */
--primary-dark: #d31a1a;
--plum-noir: #2E073F;       /* Text heading */
--verdant-green: #2D5A27;   /* Verified badge */
--cloud-dancer: #F5F5F0;    /* Background light */
```

### פונטים
- **Hebrew**: Heebo (400, 500, 700, 900)
- **English**: Plus Jakarta Sans (400, 500, 700, 800)

### אנימציות
- `fade-in` - Fade in with slide up
- `slide-up` - Slide from bottom
- `hotspot-pulse` - Pulsating hotspots
- `bounce` - Bouncing elements

---

## 📊 מדדי הצלחה

### Week 1 (Current)
- ✅ Next.js setup
- ✅ ScrapeCreators integration
- ✅ 5 main screens (home, chat, talent)
- ✅ 3 API routes
- ⏳ shadcn/ui setup (in progress)

### Week 2-4 (Next)
- [ ] Database (Supabase)
- [ ] Authentication
- [ ] Real AI integration (OpenAI)
- [ ] Poll system
- [ ] Trivia system

### Week 5-8 (Future)
- [ ] WhatsApp notifications
- [ ] Analytics
- [ ] Admin dashboard
- [ ] Production deployment

---

## 🔐 Security

### Environment Variables
כל המפתחות הרגישים נמצאים ב-`.env.local` ולא מועלים ל-Git:

```bash
# ✅ Safe
.env.local (in .gitignore)

# ❌ Never commit
SCRAPECREATORS_API_KEY
OPENAI_API_KEY
Database credentials
```

### Rate Limiting
ScrapeCreators client כולל:
- ✅ Automatic retries
- ✅ Exponential backoff
- ✅ Timeout handling

---

## 📖 מסמכים נוספים

- **[PRODUCT-SPEC.md](../PRODUCT-SPEC.md)** - מסמך אפיון מלא
- **[../DEMO-README.md](../DEMO-README.md)** - הדמו המקורי (HTML)

---

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Connect to Vercel
vercel

# Set environment variables
vercel env add SCRAPECREATORS_API_KEY
vercel env add NEXT_PUBLIC_SUPABASE_URL
# ... etc

# Deploy to production
vercel --prod
```

### Environment Variables on Vercel
1. Dashboard → Project → Settings → Environment Variables
2. Add all keys from `.env.local`
3. Redeploy

---

## 🐛 Troubleshooting

### npm install fails
```bash
# Clear cache
npm cache clean --force

# Delete node_modules
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### API errors (401/403)
- בדוק ש-`SCRAPECREATORS_API_KEY` קיים ב-`.env.local`
- Restart dev server

### Tailwind not working
```bash
# Rebuild Tailwind
npm run build
npm run dev
```

---

## 📞 תמיכה

- **Issues**: GitHub Issues
- **Email**: support@israel-bidur.com
- **Docs**: [Full Documentation](../PRODUCT-SPEC.md)

---

**Built with ❤️ for Israel Bidur**  
© 2026 All rights reserved.

# Israel Bidur — Google Stitch Prompt Guide

מסמך פרומפטים מלא למערכת "ישראל בידור" לשימוש ב-Google Stitch.
כל הפרומפטים בעברית/אנגלית, מאורגנים לפי מסך ומודול.

---

## 0. Master Prompt (להדבקה ב-Stitch — התחלה)

```
An Israeli entertainment intelligence platform called "Israel Bidur".

App structure:
1. Landing: Hero with title "ישראל בידור", gradient violet-orange, subtitle about smart bot, CTA "בואו נדבר!" to chat. Three feature cards: full content, AI-powered (Gemini), always updated. Minimal, professional, RTL-ready.
2. Chat: Header with back/settings, messages (user right dark bubble, assistant left white bubble), input at bottom with send button. Optional trending strip with thumbnail cards. Suggested action pills.
3. Admin: Dashboard with 6 metric cards, 4 module cards (Hot Content, US Trends, Users, Deliveries), trending preview strip, quick actions (Scrape, Cron, View Talents), add-talent form, talents list, cron schedule info.
4. Admin sub-pages: Hot Content (thumbnail cards + heat chart), US Trends (expandable trend cards + bar chart), Deliveries (funnel + pie + list), Users (pie + growth bar + list).

Design: Premium SaaS, zinc/violet palette, rounded-xl, subtle borders, no emojis, Lucide-style icons. Hebrew RTL. Professional minimal.
```

---

## 1. Overview — High-Level App Concept

**English (start here):**

An entertainment intelligence platform for Israeli content. It has three main areas:
1. **Public Web**: Landing page + AI chat about the Instagram account "Israel Bidur"
2. **Admin Dashboard**: Internal dashboard for content managers — hot content, US trends, users, deliveries
3. **Chat**: RAG-powered AI assistant that answers questions about posts, highlights, and talent data

The app targets Hebrew-speaking users (RTL). Design: premium SaaS aesthetic, minimalist, professional. Primary color: violet/zinc. No emojis in production UI. Use Lucide-style icons.

**Vibe adjectives:** Professional, minimal, confident, modern, architectural.

---

## 2. Landing Page

**Prompt (detailed):**

Create a landing page for "Israel Bidur" — an Israeli entertainment AI bot.

- **Hero section**: Centered layout. Large title "ישראל בידור" in bold, gradient text (violet to orange, subtle). Subtitle: "The smart bot for everything about Israel Bidur content." One primary CTA button: "Let's talk" linking to chat.
- **Feature cards**: Three cards in a row (1 col mobile, 3 cols desktop). Each card: icon area, title, short description. Topics: Full content access, AI-powered answers (Gemini), always up to date.
- **Background**: Light gradient (violet-50 to white to orange-50). Dark mode: zinc-950 base.
- **Typography**: Clean sans-serif. Headings 2xl–4xl, body 16px.
- **Spacing**: Generous padding, 8px base scale.

---

## 3. Chat Page

**Prompt ( detailed ):**

A chat interface for an AI assistant that answers questions about Israel Bidur Instagram content.

**Layout:**
- **Header**: Sticky top. Left: back arrow. Center: "Israel Bidur AI" + status "Online". Right: settings icon. Height ~56px. Border bottom. RTL support.
- **Messages area**: Scrollable. Max width ~672px centered. Messages alternate: user (right-aligned, dark bubble), assistant (left-aligned, white bubble with border). Each message: avatar/initials for assistant, text content, optional rich attachments (content cards, talent cards).
- **Input area**: Fixed bottom. Rounded input with send button (arrow up icon) on the right. Placeholder: "Ask anything...". Border, no heavy shadow.
- **Trending strip**: Optional horizontal scroll at top when chat is empty. Small thumbnail cards (thumbnail, title, heat badge). "Trending now" label.

**Cards:**
- **Content card**: Image thumbnail, title, source badge, heat score badge. Rounded corners, subtle border.
- **Talent card**: Circular avatar, name, username, followers count. Category tag. Horizontal layout.

**Suggested actions**: Pills below assistant message. Examples: "What is trending?", "Show top talents". Clickable, rounded.

---

## 4. Admin Dashboard — Main Page

**Prompt:**
Create an admin dashboard for content operations.

**Header:** Logo "IB", title "Israel Bidur — Admin", links: Chat AI, Back to App.

**Metrics row:** 6 metric cards in a grid. Each card: label, large number, small icon. Metrics: Hot Content, Avg Heat, US Trends, Users, Sent Today, CTR. Cards: white bg, subtle border, rounded-xl.

**Module cards:** 4 cards in a grid. Each: icon, title, short description, count. Links to: Hot Content, US Trends, Users, Deliveries. Hover: slight border change.

**Trending preview strip:** Horizontal scroll of small cards. Each: thumbnail, heat badge, talent name, title snippet. "View all" link.

**Quick actions:** 3 buttons in a row — Scrape All Talents, Run Cron Job, View Talents. Primary and secondary variants.

**Add Talent:** Input field + "Scrape" button. Placeholder: @username.

**Talents table:** List of talent rows. Each row: avatar, name, username, followers, posts, status badge (completed/failed), "Scrape" button.

**Cron schedule:** Info card with clock icon. List of job names and schedules.

---

## 5. Admin — Hot Content Page

**Prompt:**

Content management page showing hot Israeli content ranked by heat score.

**Header:** Back link, title "Hot Content — IL", test phone input, refresh button.

**Metrics:** 4 cards — Total Items, Avg Heat, Max Heat, Instagram count.

**Chart:** Area chart for heat score distribution. Top 15 items. Muted colors (zinc scale). X: item name, Y: score.

**Content list:** Each item is a horizontal card:
- Left: thumbnail image (or talent pic) ~140px wide
- Center: talent @username, followers, title (2 lines), heat gauge bar (thin progress bar), metrics row (views, shares, comments, growth %)
- Right: "Open" link button, "Send" (push) button

Cards: white bg, border, rounded-xl. Hover: border darkens.

---

## 6. Admin — US Trends Page

**Prompt:**

Page for US entertainment trends with Israel localization angles.

**Header:** Back, title "US Trends", stats (new / used), refresh.

**Chart:** Bar chart — trend topic (x) vs score (y). Muted zinc colors.

**Trend cards:** Each expandable. Header: status badge (new/used/ignored), date, score, topic, source tags. Buttons: Mark used (check), Dismiss (x).

**Expanded content:**
- Block: "Why it's hot in the US" — text
- Block: "Israel prediction (3–7 days)" — text
- List: Local angles (bullets)
- Card: Hebrew headlines (quoted), recommended format

**Sources:** List of links with title and source name.

---

## 7. Admin — Deliveries Page

**Prompt:**

Delivery statistics and funnel for WhatsApp/Email pushes.

**Metrics:** 5 cards — Sent Today, Failed Today, Sent This Week, Clicks, CTR.

**Charts row (2 cols):**
- Funnel: Horizontal bar chart. Steps: Sent, Opened (est), Clicked, Stopped. Muted colors.
- Pie chart: Channel distribution (WhatsApp, Email).

**Recent list:** Table/list. Each row: status icon (sent/queued/failed), delivery type, channel, optional error, timestamp.

---

## 8. Admin — Users Page

**Prompt:**

User management and segmentation.

**Metrics:** 4 cards — Total Users, WhatsApp Active, Email Active, WA Opt-in Rate.

**Charts row (2 cols):**
- Pie chart: Preference distribution (Daily, Breaking only, Weekly, Off)
- Bar chart: User growth over time (date vs new users)

**Users list:** Each row: avatar (initials if no pic), phone/email, badges (WA, Email), preference label, signup date.

---

## 9. Design System Summary (for Stitch theme)

**Colors:**
- Base: zinc-50 (light bg), zinc-950 (dark bg)
- Surfaces: white / zinc-900
- Borders: zinc-200 / zinc-800
- Accent: violet-600 (primary), emerald for success, red for error
- Charts: zinc-400, zinc-500, zinc-600 — muted

**Typography:**
- Headings: font-semibold, tracking-tight
- Body: 14–16px
- Labels: 11–13px, medium weight

**Radius:** rounded-xl (12px) default, rounded-2xl (16px) for large cards.

**Spacing:** 8px base (gap-2, p-4, etc.).

**Icons:** Lucide-style, 16–20px, stroke-based.

---

## 10. Content & Copy Reference

### Chat — System behavior
- Answers only from provided RAG context (Israel Bidur posts, highlights, insights)
- Hebrew only, warm tone, 2–4 sentences
- No made-up facts
- Follow-up questions: direct, start with question word (מה, איך, למה...)

### WhatsApp push
- Headline: up to 8 words
- Why hot: up to 120 chars
- CTA: one short question
- No clickbait, natural Hebrew

### Profile extractor
- Interests: reality, music, gossip, tv_series, sports, politics, fashion, food, comedy, drama, streaming, concerts, eurovision
- Sensitivities: politics, violence, hard_gossip, religion, sexual_content
- Tone: light, serious, cynical, mixed

### US Trend ideas
- Output: why_hot_us, israel_prediction_3_7_days, local_angles, recommended_format (Reel/Story/Article/Poll), hebrew_headlines

---

## 11. Iterative Refinement (Stitch best practices)

- **One change per prompt** when refining
- **Be specific** — e.g. "On the Hot Content page, make the heat gauge bar 4px high and use zinc-400 fill"
- **Reference elements** — "primary CTA button on landing page", "metric card in row 2"
- **Save screenshots** after each working step

---

*Generated from Israel Bidur codebase — prompts, conversation handlers, and UI components.*

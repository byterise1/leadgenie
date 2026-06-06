# LeadGenie — Living Project Plan
> **Rule**: Update this file after EVERY change. One edit to data/style/copy here means update every place it appears across all pages.
> **Last updated**: 2026-06-06 (session 3)

---

## 1. Tech Stack

| Item | Value |
|---|---|
| Framework | Next.js 15.2.1 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 3 (JIT) |
| Animation | Framer Motion (`motion.div`, `whileInView`) |
| Font | Montserrat (forced via `globals.css` `!important`) |
| AI | Groq SDK — model `llama-3.3-70b-versatile` |
| Avatars | `https://i.pravatar.cc/150?img=N` (real photos) |
| Deployment | Vercel |
| Git remote | `https://github.com/Sallu3211/leadgenie.git` |
| Auto-push | `.git/hooks/post-commit` runs `git push origin HEAD` |

---

## 2. Project Structure

```
app/
├── page.tsx              ← Homepage (MAIN — 'use client', 1000+ lines)
├── globals.css           ← Global styles, gradients, animations
├── layout.tsx            ← Root layout, Montserrat font
├── pricing/page.tsx
├── templates/page.tsx
├── about/page.tsx
├── contact/page.tsx
├── blog/page.tsx
├── blog/[slug]/page.tsx
├── dashboard/page.tsx
├── login/page.tsx
├── signup/page.tsx
├── help/page.tsx
├── privacy/page.tsx
├── terms/page.tsx
├── cookies/page.tsx
├── gdpr/page.tsx
├── anti-spam/page.tsx
└── use-cases/
    ├── agency/page.tsx
    ├── b2b-sales/page.tsx
    ├── consulting/page.tsx
    ├── ecommerce/page.tsx
    ├── recruitment/page.tsx
    └── saas/page.tsx

components/
├── Navbar.tsx
└── Footer.tsx

api/
└── generate-email/route.ts   ← Groq AI endpoint
```

---

## 3. Design System

### Colors (Tailwind + custom)
| Role | Value | Usage |
|---|---|---|
| Primary blue | `#3b82f6` / `blue-500` | Stats, accents, borders |
| Deep blue | `#1d4ed8` / `blue-700` | Hero gradient |
| Darkest blue | `#1a3480` | Hero gradient start |
| Green accent | `#10b981` / `emerald-500` | Reply rate stats |
| Purple accent | `#8b5cf6` / `violet-500` | ROI / multiplier stats |
| Amber accent | `#f59e0b` / `amber-500` | Ratings / time stats |
| Emerald accent | `#059669` | Cost/savings stats |
| Gray text | `text-gray-900` / `text-gray-500` | Body copy |
| Logo gray | `text-gray-400` | Trust logo icons (no brand colors) |
| Card border | `border-blue-200` | Feature card outlines |

### Gradients (defined in `globals.css`)
| Class | Gradient | Used on |
|---|---|---|
| `.hero-gradient` | `160deg, #1a3480 → #1d4ed8 → #2563eb → #3b82f6 → #93c5fd` | Hero section, use-case heroes |
| `.cta-gradient` | `150deg, #1e3a8a → #1d4ed8 → #2563eb → #3b82f6` | CTA bottom section |
| `.teal-gradient` | `135deg, #0e7490 → #0284c7 → #1d4ed8` | (available, not currently used) |
| `.purple-gradient` | `135deg, #5b21b6 → #4338ca → #1d4ed8` | (available, not currently used) |

### Typography
- Font: Montserrat, forced globally via `html, body, * { font-family: ...; !important }`
- H1 hero: `text-4xl sm:text-5xl lg:text-[60px] font-extrabold tracking-tight`
- Section H2: `text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1]`
- Body: `text-base sm:text-lg text-gray-500 leading-relaxed`
- Stat numbers: `text-2xl sm:text-3xl font-extrabold tracking-tight`

### Container
```css
.container { width: min(1160px, calc(100% - 3rem)); margin: 0 auto; }
```

### Animations (`globals.css`)
| Class | Animation | Speed | Direction |
|---|---|---|---|
| `.animate-marquee` | `marquee-scroll` | 55s | left (forward) |
| `.animate-marquee-r` | `marquee-scroll` | 65s | right (reverse) |
| `.animate-testimonials` | `marquee-scroll` | 110s | left (unused) |
| `.animate-testimonials-r` | `marquee-scroll` | 130s | right (unused) |
| `.scroll-hide` | hide scrollbar | — | both axes |

**Hover-pause**: `.animate-marquee:hover, .animate-marquee-r:hover { animation-play-state: paused; }`  
**Keyframe**: `from { translateX(0) } to { translateX(-50%) }` — requires 4× duplicate items for seamless loop.

---

## 4. Shared Data (change here → update all pages)

### Avatars — `AVATAR_PHOTOS[]` in `page.tsx`
All real photos via `https://i.pravatar.cc/150?img=N`

| Index | img# | Name used |
|---|---|---|
| 0 | 47 | Mike Ellis |
| 1 | 68 | Briken Bufi |
| 2 | 48 | Tom Brady |
| 3 | 3 | Alex Baldovin |
| 4 | 44 | Priya Nair |
| 5 | 12 | David Park |
| 6 | 5 | Sophie Laurent |
| 7 | 65 | Ryan Chen |
| 8 | 32 | James Walker |

**Rule**: Use `<PersonAvatar idx={N} size={px} />` for ALL person images. Never use initials or SVG faces.  
**Use-case pages**: Use inline `<img src="https://i.pravatar.cc/150?img=N" style={{ borderRadius:'50%', objectFit:'cover' }} />`.

### Brand Logos — `BRANDS` (single array)
**Style**: Mixed icon-only and text/icon+text, gray (`text-gray-400`), icons `w-8 h-8`, text `text-[22px] font-semibold tracking-tight`, no box/border, spacing `px-9 py-2`. Single row scrolls left (55s).

**Type**: `{ name: string; icon?: ReactNode; label?: string }` — icon only, label only, or both side by side.

| Logo | Renders as |
|---|---|
| Google | text: "Google" |
| Microsoft | icon: 4 squares |
| Slack | icon: hash grid |
| Instagram | icon: camera |
| Facebook | icon: f |
| aws | text: "aws" |
| Cloudflare | icon: cloud + text: "Cloudflare" |
| LinkedIn | icon: in |
| HubSpot | text: "HubSpot" |
| Notion | icon: N block |
| stripe | text: "stripe" |
| Zapier | text: "Zapier" |
| apollo | text: "apollo" |

**Marquee**: Single row only, 4× repetitions, `animate-marquee` (55s left).

### Testimonials — `testimonials[]`
9 cards. Displayed as single horizontal mouse-scroll row (overflow-x-auto, scroll-hide). Full-width with `maskFade` gradient on edges.

| Name | Role | Company | Avatar Idx |
|---|---|---|---|
| Mike Ellis | Co-Founder, Kale Acquisition | Kale | 0 |
| Briken Bufi | CEO, Aella Creative Force | Aella | 1 |
| Alex Baldovin | CEO, Authbound | Authbound | 3 |
| David Park | Head of Growth, Ripple Labs | Ripple | 5 |
| Sophie Laurent | Founder, Prolific Agency | Prolific | 6 |
| Ryan Chen | VP Sales, Momentum Capital | Momentum | 7 |
| Tom Brady | VP Sales, NextGenSoft | NextGenSoft | 2 |
| Priya Nair | Growth Lead, Launchify | Launchify | 4 |
| James Walker | Sales Director, GrowStack | GrowStack | 8 |

**Card style**: `w-[420px] bg-white rounded-3xl p-8 border border-gray-100 shadow-lg hover:shadow-xl`, quote mark SVG, 5 stars, base text, 50px avatar, company pill (blue).

### Homepage Stats (4 boxes, horizontal icon + number)
| Value | Label | Sub | Color | BG |
|---|---|---|---|---|
| 8,500+ | Active Users | Sales teams & agencies | `#3b82f6` | `bg-blue-50` |
| 42M+ | Emails Delivered | 97%+ inbox placement | `#6366f1` | `bg-indigo-50` |
| 76% | Avg Open Rate | vs 21% industry average | `#10b981` | `bg-emerald-50` |
| 4.9/5 | G2 Rating | From 1,200+ reviews | `#f59e0b` | `bg-amber-50` |

---

## 5. Homepage Sections (`app/page.tsx`)

### Section Order
1. **Navbar** (component)
2. **Hero** — blue gradient, H1, tagline, subtext, AI search bar
3. **Trusted By** — 2-row auto-scroll logo marquee
4. **Stats** — 4-col horizontal icon+number bar
5. **Feature 1** — Unlimited Sending Accounts (text LEFT, card RIGHT)
6. **Feature 2** — Email Warmup (card LEFT, text RIGHT)
7. **Feature 3** — Campaign Builder (text LEFT, card RIGHT)
8. **Feature 4** — Unibox (card LEFT, text RIGHT)
9. **Feature 5** — Analytics (text LEFT, card RIGHT)
10. **AI Workflows** — 3 workflow trigger cards
11. **Testimonials** — full-width mouse-scroll row
12. **CTA** — dark blue gradient, final signup push
13. **Footer** (component)

### Feature Card Rules (sections 1, 3, 4 specifically)
- **NO colored gradient outer background** — removed dark blue/purple wrappers
- **Border**: `border border-blue-200` (subtle blue outline)
- **Background**: `bg-white`
- **Shadow**: `shadow-sm`
- Section 2 (Warmup) and Section 5 (Analytics): already plain white, no outer wrapper to remove

### Feature Section 1 — Unlimited Sending Accounts
- `bg-white py-24`, layout: `flex-row` (text left, card right)
- Card: `bg-white rounded-2xl overflow-hidden shadow-sm border border-blue-200`
- Shows 5 email accounts with health bars, status badges, send counts

### Feature Section 2 — Email Warmup
- `bg-gray-50 py-24`, layout: `flex-row-reverse` (card left, text right)
- Card: `bg-white rounded-2xl shadow-2xl ring-1 ring-black/8`
- Shows warmup dashboard: inbox rate 97.3%, spam 0.4%, health 98/100, 30-day bar chart

### Feature Section 3 — Campaign Builder
- `bg-white py-24`, layout: `flex-row` (text left, card right)
- Card: `bg-white rounded-2xl shadow-sm border border-blue-200 p-5 sm:p-6`
- Two inner sub-cards (`bg-gray-50 rounded-2xl p-4 border border-gray-100`): sequence steps + AI preview

### Feature Section 4 — Unibox
- `bg-gray-50 py-24`, layout: `flex-row-reverse` (card left, text right)
- Card: `bg-white rounded-2xl overflow-hidden shadow-sm border border-blue-200`
- Shows unified inbox with 5 sample replies, filter tabs, tags

### Feature Section 5 — Analytics
- `bg-white py-24`, layout: `flex-row` (text left, card right)
- Card: `bg-white rounded-2xl shadow-2xl ring-1 ring-black/8 overflow-hidden border border-gray-100`
- Shows campaign stats grid + line/bar charts

### AI Workflows Section
- `bg-gray-50 py-24`, 3-column grid of trigger cards
- **NO top colored bar** (removed gradient accent bar from top of each card)
- Icon boxes: border-only (`border-2 border-{color}-200`), no fill
- 3 cards: Lead Opens → Follow-up | Lead Replies → Tag | Meeting Booked → Stop sequence

### Testimonials Section
- `bg-white py-24`
- Heading centered inside `.container`
- Scroll strip: full-width (outside container width), `maskFade` gradient edges
- `overflow-x-auto scroll-hide`, cursor grab
- Padding inside: `1rem 8vw 2rem`
- Scroll hint below: ← arrows

### Hero AI Search Bar
- White rounded bar, Groq API `/api/generate-email`
- Shows email draft result or answer
- State: `query`, `loading`, `result`, `error`

---

## 6. Use-Case Pages (6 pages — server components, no 'use client')

All share the same structure:
1. Hero (`.hero-gradient py-20 text-center`)
2. Stats bar (4 cols, horizontal icon+number)
3. Feature grid (3-col, 6 cards with emoji icons)
4. Testimonial quote block (`bg-gray-50 py-20`)
5. CTA section

### Stats Design (ALL 6 pages — same pattern)
```
grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100
  each cell: flex items-center gap-4 py-8 px-6 hover:bg-gray-50/60
    icon box: w-11 h-11 rounded-2xl, style={{ background:'#eff6ff', color:'#3b82f6' }}
    number: text-2xl font-extrabold, style={{ color: accent }}
    label: text-xs font-semibold text-gray-500 mt-1
```

### Stats Data Per Page
| Page | Stat 1 | Stat 2 | Stat 3 | Stat 4 |
|---|---|---|---|---|
| **Agency** | 500+ Agencies (blue/users) | 20%+ Reply Rate (green/trend) | Unlimited Workspaces (purple/building) | 4.9/5 Rating (amber/star) |
| **B2B Sales** | 47 Meetings/Mo (blue/calendar) | 18% Reply Rate (green/trend) | 3× Faster (purple/rocket) | $0 Extra Cost (emerald/dollar) |
| **Consulting** | 1,200+ Firms (blue/building) | 28% Discovery Rate (green/trend) | 5× More Leads (purple/rocket) | 2 hrs Saved (amber/clock) |
| **Ecommerce** | 3,000+ Brands (blue/building) | 22% Reply Rate (green/trend) | 10× ROI (purple/rocket) | 48h Setup (amber/clock) |
| **Recruitment** | 3× Candidates (blue/users) | 25% Response Rate (green/trend) | 50% Faster (purple/clock) | 10× ROI (amber/rocket) |
| **SaaS** | 2,000+ Companies (blue/building) | 61% Open Rate (green/mail) | 10× ROI (purple/rocket) | 14 days First Meetings (amber/calendar) |

### Testimonial Quote Per Page
| Page | Quote person | Photo | Title |
|---|---|---|---|
| Agency | Mike Ellis | img=47 | Co-Founder, Kale Acquisition |
| B2B Sales | Briken Bufi | img=68 | CEO, Aella Creative Force |
| Consulting | David Park | img=12 | Head of Growth, Ripple Labs |
| Ecommerce | Tom Kim | img=44 | Head of Wholesale, Brightleaf Goods |
| Recruitment | Sarah Reynolds | img=5 | Head of Talent, Growthbound Recruiting |
| SaaS | Alex Baldovin | img=3 | CEO, Authbound |

---

## 7. Key Components

### Navbar (`components/Navbar.tsx`)
- Logo: "LeadGenie" with sparkle icon
- Nav items: Campaigns, Email Accounts, Warmup, Unibox, Analytics, Deliverability (no Integrations in nav)
- CTA: "Start Free" → `/signup`

### Footer (`components/Footer.tsx`)
- Dark background
- Links: Use Cases, Resources, Company, Legal
- No irrelevant features (no CRM, Automations, API links)

### `SectionBadge` component
- Light mode: `bg-blue-50 border border-blue-100 text-blue-600`
- Dark mode (on gradient sections): `bg-white/15 border border-white/30 text-white/85`

### `PersonAvatar` component
- `<img src={AVATAR_PHOTOS[idx % 9]} style={{ borderRadius:'50%', objectFit:'cover' }} />`
- Default size: 40px. TestimonialCard: 50px.

### `BrandPill` component
- Icon only, no text, gray, large (`[&_svg]:!w-10 [&_svg]:!h-10`)
- No border, no box, just floating icon

### `TestimonialCard` component
- 420px wide, rounded-3xl, shadow-lg
- Quote mark SVG (blue-100), 5 yellow stars, base text, 50px avatar, blue company pill

### `maskFade` constant
```js
{ WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
  maskImage: '...' }
```
Used on: logo marquee rows, testimonial scroll strip.

---

## 8. Rules & Decisions

| Rule | Detail |
|---|---|
| Avatars | Always `pravatar.cc` real photos. Never SVG faces or initials. |
| Logos | Icon-only, gray, no boxes, no text labels, hover-pause on marquee |
| Feature card borders | `border-blue-200` (not gray) on sections 1, 3, 4 |
| No colored card backgrounds | Removed dark blue/purple gradient outer wrappers from cards |
| Workflow card icons | Border-only ring (`border-2 border-{color}-200`), no fill |
| Workflow cards | No top gradient accent bar (removed) |
| Stats style | Horizontal: icon box left + colored number + label right |
| Testimonials | Single row, overflow-x-auto, scroll-hide, maskFade, 420px cards |
| Logo marquee | Single row, 4× repetitions, 55s left-scroll. Mix of icon-only + text-only + icon+text |
| AI | Groq only (free tier). Never paid APIs. |
| Nav links | Must point to real pages. Never `/signup` redirect for nav items. |
| Commit syntax | `git commit -m "title\`n\`nCo-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"` |
| Auto-push | post-commit hook → no manual `git push` needed |
| Font | Montserrat forced globally, no other fonts |
| Layout | 2-column alternating for feature sections (text+card flip each section) |

---

## 9. Dashboard Rules & Architecture

### Credits System
- 100 free credits shown in the top header bar (sticky, z-20) on ALL dashboard pages
- Header: `DashboardLayout` in `app/dashboard/layout.tsx` — always renders the credits pill
- Credits pill: green pulse dot + `{remaining} / {total} credits` + progress bar + "Get more →" → `/pricing`
- When credits run out, prompt upgrade

### Email Accounts (`app/dashboard/email-accounts/page.tsx`)
- **4 connection types**: Gmail OAuth, Gmail App Password, Outlook OAuth, Custom SMTP
- **Each account has its own per-account daily limit** (editable inline in the table)
- Gmail App Password: needs 16-char code, instructions shown in modal
- Accounts listed with: #number, email, type badge, status (active/warming/error), health bar, daily limit (editable), remove button
- Health bar: green ≥80%, amber ≥50%, red <50%

### Email Templates (`app/dashboard/templates/page.tsx`)
- **3 editor tabs**: Edit | Preview | HTML
- **HTML tab**: shows generated HTML (auto-build from body) with copy button + `<iframe>` rendered preview
- **Formatting toolbar** (body field): Bold `<strong>`, Italic `<em>`, Underline `<u>`, Link `<a>`, List `<ul>`, Button `<a>` styled as CTA
- **Unsubscribe block**: always at bottom, editable text, required for compliance. Keep `{{unsubscribe_link}}` variable.
- **Clicking backdrop closes any modal** — all modals use `onClick={e => e.target === e.currentTarget && onClose()}`
- Built-in templates are editable but not deletable (no delete button on `builtIn: true`)

### Campaign Creation (`app/dashboard/campaigns/new/page.tsx`)
- **Step 0 — Details**: Name, Goal (6 options), Sending Accounts selector, Campaign Daily Cap
- **Sending Accounts**: multi-select with "All accounts" toggle. Shows each account email + type + per-account limit. Rotates sends across selected accounts.
- **Daily limit is set at CAMPAIGN level only** — removed from Settings > Sending Defaults
- **Campaign Daily Cap**: optional override over sum of account limits. If left blank, auto = sum of selected account limits.
- **Step 1 — Sequence**: "Pick from template library" button per step → opens template picker modal (shows all templates from `/dashboard/templates`)
- **Template picker modal**: backdrop click closes it; shows template name, category badge, subject preview, first body line
- **Step 3 — Review**: shows account count + total daily limit in summary

### Settings (`app/dashboard/settings/page.tsx`)
- **4 tabs only**: Profile, Sending Defaults, Notifications, Plan & Billing
- **No API Keys tab** (removed — too technical, not needed for MVP)
- **No Team tab** (removed — Pro feature, not useful on free plan)
- **Sending Defaults**: From name, min delay between sends, sending hours, active days, warmup toggle. NO daily limit here — that's per campaign.

---

## 10. Pending / Future Items

- [ ] Wire real Supabase data to accounts + templates (currently mock data in campaign wizard)
- [ ] Connect credits to real backend (currently static 100)
- [ ] If adding new feature section: follow 2-col alternating layout, blue-200 border card, no colored background
- [ ] If adding new use-case page: copy structure from existing, use pravatar avatar, horizontal stats with icons

---

## 10. Change Log

| Date | Change |
|---|---|
| 2026-06-06 | Initial plan created |
| 2026-06-06 | Replaced SVG avatars with pravatar.cc real photos across all pages |
| 2026-06-06 | Removed lightning bolt SVG from hero and CTA titles |
| 2026-06-06 | Trust logos changed to bordered pills (then later to icon-only no box) |
| 2026-06-06 | Feature sections changed to 2-column alternating layout |
| 2026-06-06 | Stats bar redesigned to horizontal icon + colored number |
| 2026-06-06 | Testimonials: auto-slider → 2-row marquee → single overflow-x-auto row |
| 2026-06-06 | Updated stats on all 6 use-case pages to match homepage horizontal style |
| 2026-06-06 | Testimonials scroll made full-width with maskFade gradient edges |
| 2026-06-06 | Cards made wider (420px), quote mark added, avatar 50px |
| 2026-06-06 | Logos: replaced companies with Google/Microsoft/Slack/LinkedIn etc., gray, icon-only |
| 2026-06-06 | Logo marquee: changed from 2 rows (opposite scroll) to 1 row; mixed icon+text like reference image |
| 2026-06-06 | Feature cards: removed blue/purple gradient backgrounds, added border-blue-200 |
| 2026-06-06 | Workflow cards: removed top accent bar, changed icon fills to border rings |
| 2026-06-06 | Logo icons enlarged to w-10 h-10, text label removed from BrandPill |

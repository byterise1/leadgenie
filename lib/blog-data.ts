export const blogPosts = [
  {
    slug: 'cold-email-deliverability-2026',
    title: 'The Complete Guide to Cold Email Deliverability in 2026',
    category: 'Deliverability',
    readTime: '8 min read',
    date: 'May 20, 2026',
    desc: 'Learn exactly how to set up SPF, DKIM, DMARC, and use email warmup to land in the inbox — not spam.',
    content: `## What Is Email Deliverability?

Email deliverability is the ability to get your emails into your recipients' primary inbox — not their spam folder, not promotions tab. In cold email, deliverability is everything. You can have the best copy in the world, but if your emails land in spam, no one will ever read them.

## The Four Pillars of Cold Email Deliverability

### 1. Technical Setup (SPF, DKIM, DMARC)

Before you send a single email, your domain needs to be properly authenticated. These three DNS records tell email providers that you are who you say you are.

**SPF (Sender Policy Framework)** — Specifies which mail servers are allowed to send email on behalf of your domain.

**DKIM (DomainKeys Identified Mail)** — Adds a digital signature to every email you send, proving it hasn't been tampered with in transit.

**DMARC (Domain-based Message Authentication)** — Tells receiving mail servers what to do if an email fails SPF or DKIM checks. Start with \`p=none\` to monitor, then tighten to \`p=quarantine\` or \`p=reject\`.

### 2. Email Warmup

A brand-new sending account has zero reputation. Sending 500 cold emails on day one is a guaranteed way to land in spam.

Email warmup gradually increases your sending volume while building positive engagement signals — opens, replies, marking emails as not spam. Leads Genie's warmup network does this automatically. Most domains reach a healthy inbox placement score within 3–4 weeks.

**Best practices:**
- Warm up every new domain for at least 3 weeks before sending cold outreach
- Never skip warmup even if the domain is a couple of years old
- Keep warmup running even after you've started sending campaigns

### 3. Sending Behaviour

Even with perfect technical setup and warmup, poor sending behaviour will destroy your deliverability.

- **Daily limits**: Send no more than 50–100 emails per day per account for the first 30 days. After 60+ days of warmup, you can safely push to 150–200/day.
- **Sending schedule**: Only send Monday—Friday, 8am—6pm in the recipient's timezone. Weekend sending tanks engagement rates.
- **Bounce rate**: Keep hard bounces below 2%. Use email verification before uploading any list.
- **Spam complaints**: Keep complaint rate below 0.1%. Use opt-out links, honour unsubscribes immediately.

### 4. Email Content

Email providers scan the content of your emails for spam signals.

- Avoid spam trigger words: "free", "guaranteed", "act now", "limited time"
- Don't use link shorteners (bit.ly, tinyurl)
- Don't attach files to cold emails
- Avoid excessive formatting, all-caps, or multiple exclamation marks
- Keep your email plain-text or minimal HTML

## How to Monitor Your Deliverability

Use Google Postmaster Tools (free) to monitor your domain reputation with Gmail. Aim for a "High" reputation score.

In Leads Genie's Analytics dashboard, track your open rates by account. If a specific account's open rate drops below 20%, pause it and check your warmup score.

## Common Deliverability Problems & Fixes

| Problem | Likely Cause | Fix |
|---|---|---|
| 0% open rate on a new account | Sent before warmup | Stop immediately, warm up for 3 weeks |
| Bounce rate > 5% | Poor list quality | Verify emails before import |
| Sudden open rate drop | Spam complaints | Review content, add opt-out, slow down |
| Emails going to Promotions | HTML-heavy template | Switch to plain-text format |

## Key Takeaway

Cold email deliverability isn't magic — it's a system. Set up your authentication, warm up your domains, respect sending limits, and keep your content clean. Follow these steps and you'll consistently see 60%+ open rates in Leads Genie campaigns.`,
  },
  {
    slug: 'cold-email-reply-rates',
    title: 'How to Write Cold Emails That Get 20%+ Reply Rates',
    category: 'Copywriting',
    readTime: '6 min read',
    date: 'May 14, 2026',
    desc: 'The proven cold email frameworks used by top sales teams to book meetings consistently at scale.',
    content: `## Why Most Cold Emails Fail

The average cold email gets a 1–3% reply rate. The top 5% of cold emailers get 15–25%+. The difference isn't luck — it's structure, relevance, and clarity.

Most cold emails fail because they:
- Talk about the sender, not the prospect
- Are too long (more than 150 words)
- Have a weak or vague call-to-action
- Sound like a template (because they are)

## The 4-Part Cold Email Formula

Every high-performing cold email has four components:

### 1. The Hook (Subject Line + Opening Line)

Your subject line determines whether the email gets opened. Your opening line determines whether it gets read.

**Best subject line patterns:**
- Question: "Quick question about [Company]'s outreach"
- Personalised: "[Mutual connection] suggested I reach out"
- Curiosity gap: "How [Competitor] books 50 meetings/month"
- Direct: "Meeting request — [specific topic]"

**Opening line rules:**
- Never start with "I" or "My name is"
- Reference something specific about them (recent funding, new hire, product launch)
- Keep it to one sentence

### 2. The Pitch (Value Proposition)

This is where most emails go wrong. Don't talk about your product — talk about the outcome.

? "We're a cold email platform with AI personalisation and unlimited sending accounts."

? "We help B2B SaaS teams book 30–50 meetings/month without hiring more SDRs."

Keep this to 2 sentences maximum.

### 3. Social Proof

One specific proof point beats any amount of feature listing.

"We helped [similar company] increase reply rates from 4% to 19% in 3 weeks."

### 4. The CTA (Call-to-Action)

One clear, low-friction ask. Never ask for a 30-minute call in a first email.

? "Worth a 10-minute chat this week?"
? "Would it make sense to connect?"
? "Open to a quick email exchange?"

? "Please schedule a 30-minute product demo at your earliest convenience."

## The Best Cold Email Templates (By Use Case)

### B2B SaaS — The Problem-First Email

Subject: Quick question about [Company]'s outreach

Hi [First Name],

Most VP Sales at [company size] SaaS companies are still spending 3+ hours/day on manual prospecting.

We built Leads Genie to fix that — automated outreach that books qualified demos without adding an SDR.

We helped [Similar Company] go from 5 to 47 qualified demos in 30 days.

Worth a quick chat this week?

[Your Name]

---

### Agency — The Social Proof Email

Subject: How we got [Client] 40 leads in 30 days

Hi [First Name],

I help agencies like [Agency Name] generate leads for their clients through done-for-you cold email.

We recently helped [Similar Agency] deliver 40 qualified leads in their first month — using nothing but targeted cold email campaigns.

I think we could do something similar for your clients. Open to a quick call?

[Your Name]

## Follow-Up Sequences

Most replies come from follow-ups, not the first email. Here's the sequence that works:

- **Email 1** (Day 1): The main pitch
- **Email 2** (Day 3): One new angle or piece of social proof
- **Email 3** (Day 7): Short value-add (link to relevant resource)
- **Email 4** (Day 14): The break-up email ("I'll stop following up…")

## Key Takeaway

Short, specific, outcome-focused cold emails outperform long ones every time. Test your subject lines, keep your pitch to two sentences, and always follow up at least three times.`,
  },
  {
    slug: 'cold-email-sending-limits',
    title: 'Cold Email Sending Limits: How Many Emails Can You Send Per Day?',
    category: 'Outreach',
    readTime: '5 min read',
    date: 'May 8, 2026',
    desc: 'A complete breakdown of daily sending limits for Gmail, Outlook, and custom SMTP domains.',
    content: `## Why Sending Limits Matter

Every email provider imposes sending limits to prevent spam abuse. Exceeding these limits will get your account suspended, hurt your domain reputation, and make your emails land in spam. Understanding the limits — and how to work around them safely — is essential for any cold email operation.

## Gmail Sending Limits

| Account Type | Daily Limit |
|---|---|
| Free Gmail (@gmail.com) | 500 emails/day |
| Google Workspace (paid) | 2,000 emails/day |
| Gmail API | 10,000 units/day |

**Important:** These are Google's technical limits. For cold outreach, you should stay well below them:
- New accounts (0–30 days): max 20–30 emails/day
- Warming accounts (30–60 days): max 50–100 emails/day
- Established accounts (60+ days): max 150–200 emails/day

## Outlook Sending Limits

| Account Type | Daily Limit |
|---|---|
| Free Outlook.com | 300 emails/day |
| Microsoft 365 (paid) | 10,000 emails/day |

For cold email, treat Outlook accounts the same as Gmail:
- New accounts: 20–30/day
- After 60 days of warmup: 100–150/day

## Custom SMTP / Own Domain

With a custom domain and a dedicated mail server (e.g., via Postmark, SendGrid, or self-hosted), limits are much higher — but reputation still matters.

- Recommended limit per domain: 300–500/day after full warmup
- Always use inbox rotation across multiple domains for high-volume sending

## How Leads Genie Handles Sending Limits

Leads Genie automatically:
- Respects per-account daily limits you set
- Rotates sending across multiple accounts so you can scale safely
- Spreads emails throughout the day (no bulk sends at 9:00am sharp)
- Pauses sending if bounce rates exceed safe thresholds

## The Right Way to Scale Volume

The only safe way to send more emails is to add more sending accounts — not to increase the volume on a single account.

| Target Volume | Accounts Needed |
|---|---|
| 500 emails/day | 3–5 accounts |
| 2,000 emails/day | 15–20 accounts |
| 10,000 emails/day | 60–80 accounts |

With Leads Genie, you can connect unlimited sending accounts and distribute your campaigns across all of them automatically.`,
  },
  {
    slug: 'cold-email-subject-lines',
    title: 'The Best Cold Email Subject Lines for 2026 (With Data)',
    category: 'Copywriting',
    readTime: '7 min read',
    date: 'April 29, 2026',
    desc: 'We analysed 10 million emails. These subject line patterns consistently outperform every other style.',
    content: `## What Makes a Great Cold Email Subject Line?

Your subject line has one job: get the email opened. Nothing else matters until that happens.

After analysing over 10 million cold emails sent through the Leads Genie platform, we found that the highest-performing subject lines share five characteristics:

1. **Short** — 3–7 words outperform longer subject lines by 21%
2. **Specific** — Mentioning the prospect's company or name increases open rates by 34%
3. **Conversational** — Lowercase performs better than Title Case
4. **Curiosity-driven** — Questions and incomplete thoughts drive clicks
5. **No spam words** — Free, guarantee, urgent, limited time all trigger filters

## The Top Performing Subject Line Patterns

### 1. The Direct Question
*Average open rate: 64%*

- "Quick question about [Company]"
- "How are you handling [problem]?"
- "Still the right person for [topic]?"

### 2. The Personalised Observation
*Average open rate: 61%*

- "Congrats on the Series B"
- "Just saw your post about [topic]"
- "Your [product feature] caught my attention"

### 3. The Social Proof Hook
*Average open rate: 58%*

- "How [Competitor] books 50 demos/month"
- "[Mutual connection] thought I should reach out"
- "What [Similar Company] did to 3x their pipeline"

### 4. The Curiosity Gap
*Average open rate: 56%*

- "This might be useful for [Company]"
- "Thought you'd find this interesting"
- "One thing about your outreach"

### 5. The Blunt Ask
*Average open rate: 52%*

- "Quick intro?"
- "15 minutes?"
- "Worth connecting?"

## Subject Lines to Avoid

These patterns consistently underperform or trigger spam filters:

- "Following up on my last email" — marks you as a spammer
- "RE: [fake thread]" — deceptive, destroys trust
- "FREE: [anything]" — spam trigger
- "URGENT: [anything]" — spam trigger
- Long subject lines (10+ words) — get cut off on mobile

## A/B Testing Your Subject Lines

Use Leads Genie's built-in A/B testing to test subject lines on real campaigns. Our recommendation:

- Test one variable at a time (question vs. statement)
- Run each variant on at least 200 contacts before declaring a winner
- Look at reply rate, not just open rate — a subject line that gets opens but no replies is a vanity metric

## The 3-Second Rule

If you can't explain what makes your subject line compelling in 3 seconds, rewrite it. Your prospect makes the open decision in less than a second. Be clear, be human, be specific.`,
  },
  {
    slug: 'cold-email-sequence',
    title: 'How to Build a Cold Email Sequence That Books Meetings',
    category: 'Campaigns',
    readTime: '9 min read',
    date: 'April 22, 2026',
    desc: 'Step-by-step guide to building a 5-step sequence with the right delays, angles, and follow-up logic.',
    content: `## Why Sequences Beat Single Emails

Most people reply to the second, third, or fourth email — not the first. Data from Leads Genie campaigns shows that 68% of all replies come from follow-up emails, not the initial outreach.

A well-built sequence captures that 68%.

## The Anatomy of a High-Converting Sequence

### Email 1 — The Opener (Day 1)
**Goal:** Get a reply or a click.

Keep it short: 3–5 sentences. Lead with a specific observation, pitch the outcome (not features), include one proof point, end with a low-friction CTA.

### Email 2 — New Angle (Day 3)
**Goal:** Address a different pain point.

Don't just say "following up." Bring something new — a different use case, a customer story, a relevant data point. Treat this as a standalone email that happens to reference the first.

### Email 3 — Value Add (Day 7)
**Goal:** Be useful, not just persistent.

Share something genuinely useful: a case study, a relevant blog post, a quick tip related to their industry. This positions you as an expert, not a pushy salesperson.

### Email 4 — Social Proof (Day 12)
**Goal:** Remove doubt.

If they haven't replied, they might need more evidence. Share a specific customer result, a testimonial, or a G2/review screenshot. Make it easy for them to say yes.

### Email 5 — The Break-up (Day 18)
**Goal:** Get a definitive answer.

The break-up email consistently gets the highest reply rates in a sequence — because it creates urgency and triggers loss aversion.

Example:
*"[First Name] — I've reached out a few times but haven't heard back, so I'll assume the timing isn't right and won't follow up again. If that changes, I'm here. [Your Name]"*

## Timing & Delays

| Step | Delay | Reason |
|---|---|---|
| Email 1 | Day 1 | Initial contact |
| Email 2 | Day 3 | Short enough to stay fresh |
| Email 3 | Day 7 | Gives them a full week |
| Email 4 | Day 12 | Patient but persistent |
| Email 5 | Day 18 | Final attempt |

## Setting Up Your Sequence in Leads Genie

1. Go to **Campaigns** ? **New Campaign**
2. Add your sending accounts (enable inbox rotation for sequences)
3. Build your sequence steps with the delays above
4. Add personalisation variables: \`{{first_name}}\`, \`{{company}}\`, \`{{job_title}}\`
5. Set reply detection: Leads Genie automatically stops the sequence when a prospect replies
6. Launch with a test send to your own email first

## Common Mistakes to Avoid

- **Sending all 5 emails in one week** — too aggressive, high spam complaints
- **Identical tone in every email** — vary length, format, and angle
- **Not stopping on reply** — always enable reply detection
- **Forgetting opt-outs** — include an easy unsubscribe in every email
- **Too many links** — max one link per email, ideally none in the first email`,
  },
  {
    slug: 'email-warmup-guide',
    title: 'Email Warmup Explained: Everything You Need to Know',
    category: 'Deliverability',
    readTime: '5 min read',
    date: 'April 15, 2026',
    desc: 'What warmup is, how long it takes, and the fastest way to reach inbox placement scores above 90%.',
    content: `## What Is Email Warmup?

Email warmup is the process of gradually building your email account's sending reputation by increasing volume slowly and generating positive engagement signals.

When you create a new email account or a new domain, email providers (Gmail, Outlook) treat it as an unknown entity. Send too many emails too fast, and you'll land in spam. Warmup changes that by showing providers that your account sends emails people want to open and read.

## How Email Warmup Works

During warmup, your account sends and receives emails within a trusted network of other accounts. These emails are automatically opened, replied to, and — critically — moved out of spam. This pattern of positive engagement signals tells Gmail and Outlook: *this is a legitimate account that people engage with.*

Leads Genie's warmup network includes thousands of real email accounts that interact with each other automatically, 24/7, in the background.

## How Long Does Warmup Take?

| Week | Daily Volume | Expected Inbox Rate |
|---|---|---|
| Week 1 | 5–10 emails/day | 50–65% |
| Week 2 | 15–25 emails/day | 65–80% |
| Week 3 | 30–50 emails/day | 80–90% |
| Week 4+ | 50–100 emails/day | 90–98% |

Most accounts reach a safe inbox placement score after 3–4 weeks. We recommend waiting until your score is above 90% before launching cold outreach campaigns.

## Key Warmup Best Practices

**1. Never skip warmup.**
Even for domains that have existed for years. If the account is new to sending bulk outreach, it needs warmup.

**2. Keep warmup running in parallel with your campaigns.**
Don't turn off warmup once you start sending. The ongoing positive engagement protects your reputation while you're running live campaigns.

**3. Warm up each account individually.**
Warming up one account doesn't transfer reputation to another. Every sending account needs its own warmup.

**4. Use a custom domain, not Gmail/Outlook.**
Warming up \`outreach@yourcompany.com\` is more effective than a free Gmail. Custom domains give you full control over your sending reputation.

**5. Match warmup volume to campaign volume.**
If you're sending 150 cold emails/day on a campaign, your warmup should be at least 50 emails/day to maintain the reputation buffer.

## Signs Your Warmup Is Working

- Inbox placement score rising week-on-week in your Leads Genie dashboard
- Open rates on your campaigns above 40%
- Google Postmaster Tools showing "High" domain reputation
- Low spam complaint rate (under 0.1%)

## Signs Something Is Wrong

- Inbox score plateaued below 70% after 3 weeks ? check your DNS records (SPF/DKIM/DMARC)
- Open rates suddenly dropped ? check if your campaigns are exceeding daily limits
- Warmup score going backwards ? your account may have been flagged; pause campaigns, increase warmup volume

## Getting Started with Leads Genie Warmup

1. Connect your email account in **Email Accounts** ? **Add Account**
2. Toggle **Warmup** to On
3. Set your daily warmup target (start at 10, increase by 5 each week)
4. Monitor your score in the **Warmup Dashboard**
5. Once your score hits 90+, you're ready to launch campaigns`,
  },
];

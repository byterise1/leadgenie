export function toSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export type HelpArticle = { q: string; a: string };
export type HelpSection = {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  articles: HelpArticle[];
};

export const helpSections: HelpSection[] = [
  {
    id: 'getting-started',
    emoji: '🚀',
    title: 'Getting Started',
    subtitle: 'Set up your account and launch your first campaign in under 10 minutes.',
    articles: [
      {
        q: 'Creating your Lead Genie account',
        a: `Go to leadgenie.ai → click "Start Free Trial" → sign up with Google or email.\n\nOnce inside, you'll land on the Overview dashboard. Your account is on the Free plan with 3 campaign slots, up to 500 leads, and 1 connected email account.`,
      },
      {
        q: 'Connecting Gmail or Outlook',
        a: `Go to **Email Accounts** in the sidebar → click **"+ Add Account"** → choose Gmail OAuth (recommended for best deliverability).\n\nYou'll be redirected to Google to authorize Lead Genie. Once approved, your account appears with a green "Active" badge.\n\nFor Outlook or any other provider, choose Custom SMTP — enter your host, port, username and password.`,
      },
      {
        q: 'Setting up email warmup',
        a: `Before sending cold campaigns, warm up your inbox for 2–3 weeks.\n\nGo to **Warmup** → toggle warmup ON for your account. Lead Genie automatically sends small batches of real-looking emails that get opened and replied to, building your sender reputation.\n\nYou'll see your Health Score increase daily. Aim for 80+ before launching your first campaign.`,
      },
      {
        q: 'Uploading your first prospect list',
        a: `Go to **Leads** → click **"+ New List"** → give it a name (e.g., "SaaS Founders June") → click **Upload File**.\n\nPrepare a CSV with these columns:\n- Email (required)\n- First Name\n- Last Name\n- Company\n- Website\n\nThe importer removes duplicate emails automatically. You'll see a summary of how many were imported vs. skipped.`,
      },
      {
        q: 'Launching your first campaign',
        a: `Go to **Campaigns** → **New Campaign**.\n\n**Step 1 — Leads**: Choose the list you uploaded.\n**Step 2 — Schedule**: Set your sending window (e.g., 9 AM–5 PM), active days (Mon–Fri), and min/max delay between emails.\n**Step 3 — Review**: Confirm settings and click **Launch**.\n\nYour campaign will start sending during the next active window.`,
      },
    ],
  },
  {
    id: 'campaigns',
    emoji: '📧',
    title: 'Campaigns',
    subtitle: 'Everything about building, launching, and optimising your cold email campaigns.',
    articles: [
      {
        q: 'Creating a multi-step sequence',
        a: `In the campaign builder, click **"+ Add Step"** to add follow-up emails.\n\n- Step 1: Your initial cold email\n- Step 2+: Follow-ups, sent only to leads who haven't replied\n\nSet a delay between steps (e.g., "3 days after previous step"). If a lead replies at any step, they stop receiving emails automatically.`,
      },
      {
        q: 'Setting sending schedules',
        a: `**Sending window**: Hours of day to send (e.g., 9 AM–5 PM in your timezone).\n**Active days**: Days of the week (e.g., Mon–Fri only).\n**Min / Max delay**: Random gap between each email send. This makes sending look natural to spam filters.\n**Daily limit**: Max emails per day across all connected accounts.\n\nThe **Completes In** estimate shows how many days until all leads get all steps.`,
      },
      {
        q: 'A/B testing subject lines',
        a: `Currently, Lead Genie doesn't have built-in A/B testing.\n\nBest practice: create two separate campaigns with different subject lines and split your lead list. Compare open rates in Analytics after 3–5 days.`,
      },
      {
        q: 'Adding personalisation variables',
        a: `Use double curly braces in your email body and subject:\n\n- {{first_name}} — lead's first name\n- {{last_name}} — lead's last name\n- {{email}} — lead's email address\n- {{company}} — lead's company\n- {{website}} — lead's website\n\nIf the field is empty for a lead, the variable is left blank. Fill in your CSV columns to avoid blank personalisations.`,
      },
      {
        q: 'Pausing and resuming campaigns',
        a: `Open any campaign → click the **Pause** button at the top right.\n\nEmails already queued will not be sent while paused. Click **Resume** to continue from where it left off.\n\nLeads who received emails while the campaign was active will receive their next follow-up on schedule after you resume.`,
      },
    ],
  },
  {
    id: 'warmup',
    emoji: '🔥',
    title: 'Email Warmup',
    subtitle: 'Understanding warmup, monitoring your score, and troubleshooting deliverability.',
    articles: [
      {
        q: 'How email warmup works',
        a: `When you send cold emails from a fresh inbox, spam filters are suspicious — they've never seen volume from this address before.\n\nWarmup fixes this by gradually sending real-looking emails between real inboxes. These emails get opened and marked "Not Spam", signalling to Gmail, Outlook, and others that this is a trustworthy sender.\n\nLead Genie automates this entirely — no manual action needed once enabled.`,
      },
      {
        q: 'Reading your warmup score',
        a: `Your **Health Score** (0–100) is shown on the Email Accounts page.\n\n- **80–100**: Ready to run campaigns at full volume\n- **60–79**: Warming up, limit campaign volume to 20–30 emails/day\n- **Below 60**: Not ready — continue warming, do not run cold campaigns yet\n\nThe score updates daily based on inbox placement rates.`,
      },
      {
        q: 'Warmup best practices',
        a: `- Enable warmup before you connect an account to any campaign\n- Run warmup for at least 14 days before your first cold send\n- Start campaigns at low volume (20–30 emails/day) even after warmup is complete\n- Don't turn off warmup while running campaigns — it should always run in the background\n- Use a real domain, not a free Gmail/Yahoo address, for best results`,
      },
      {
        q: 'How long does warmup take?',
        a: `Typically **2–4 weeks** to reach a Health Score of 80+.\n\nBrand-new domains with no email history take longer. Domains that have sent emails before (even if not cold outreach) warm up faster.\n\nYou'll see the score climb daily on the Email Accounts page.`,
      },
      {
        q: 'Troubleshooting spam placement',
        a: `If emails are landing in spam:\n\n1. **Check your Health Score** — if below 70, pause campaigns and keep warming\n2. **Check your content** — avoid spam trigger words: Free!, Guaranteed!, Unsubscribe, Click here\n3. **Add SPF/DKIM records** to your domain's DNS\n4. **Lower volume** — reduce daily limit and increase min delay\n5. **Avoid too many links or images** — plain text emails land in inbox more reliably`,
      },
    ],
  },
  {
    id: 'unibox',
    emoji: '📥',
    title: 'Unibox',
    subtitle: 'Managing all your replies from one place and labelling prospects.',
    articles: [
      {
        q: 'Navigating the Unibox',
        a: `Go to **Unibox** in the sidebar.\n\nThe left panel shows all replies from your campaigns, newest first. Unread threads are shown in bold with a blue dot.\n\nClick any thread to open it in the right panel and read the full message. Opening a thread marks it as read and instantly updates the unread count badge in the sidebar.`,
      },
      {
        q: 'Labelling replies by intent',
        a: `Open a thread → scroll to the bottom of the right panel → click one of the **"Mark as"** buttons:\n\n- **Interested** — lead wants to know more (hot lead, follow up manually)\n- **Not Interested** — lead declined\n- **Out of Office** — auto-reply, revisit after they're back\n- **Do Not Contact** — removes lead from all future campaigns permanently\n\nOnce labelled, use the **filter dropdown** at the top of the thread list to see only leads of that type (e.g., all "Interested" replies).`,
      },
      {
        q: 'Filtering by campaign or account',
        a: `Use the filter dropdown at the top of the thread list to show:\n- **All** — every reply\n- **Interested** — hot leads ready for follow-up\n- **Not Interested** — declined leads\n- **Out of Office** — temporary out-of-office replies\n- **Do Not Contact** — leads who must not be emailed again\n\nEach thread shows the campaign it came from as a blue badge under the sender's name.`,
      },
      {
        q: 'Replying from the Unibox',
        a: `Currently, Unibox is read-only — you can read and label replies, but must reply directly from Gmail or your email client.\n\nThis keeps your reply in the same email thread and ensures proper deliverability. We're working on adding native reply functionality.`,
      },
      {
        q: 'Syncing new replies',
        a: `Replies sync automatically every 2 minutes in the background — you don't need to stay on the Unibox page.\n\nTo sync immediately, click the **Sync** button at the top right of the Unibox. A message will confirm how many new replies were found.`,
      },
    ],
  },
  {
    id: 'analytics',
    emoji: '📊',
    title: 'Analytics',
    subtitle: 'Interpreting your metrics, tracking opens and clicks, and improving performance.',
    articles: [
      {
        q: 'Understanding your dashboard',
        a: `The **Analytics** page shows:\n\n- **Emails Sent** — total across all campaigns\n- **Open Rate** — % of recipients who opened (tracked via a 1×1 pixel)\n- **Click Rate** — % who clicked a link\n- **Reply Rate** — % who replied (most important metric)\n- **Bounce Rate** — % of undeliverable addresses\n\nThe table below shows per-campaign breakdown. Active campaigns sort to the top.`,
      },
      {
        q: 'Open rate vs. reply rate',
        a: `**Open rate** tells you if your subject line works. A good cold email open rate is 40–70%.\n\n**Reply rate** tells you if your email body and offer work. A good cold reply rate is 3–8%. Above 10% is excellent.\n\nFocus on reply rate — it's the true measure of campaign effectiveness. Open rate can be inflated by email security scanners.`,
      },
      {
        q: 'Click tracking explained',
        a: `Every link in your emails is automatically wrapped with a tracking URL. When a recipient clicks it, Lead Genie records a click event.\n\n**Note**: Security scanners sometimes click all links in an email to check for malware. This can inflate click rates. Focus on reply rate as your primary signal.`,
      },
      {
        q: 'Exporting campaign reports',
        a: `Export is not yet available directly from the app. To get your data:\n\n1. Go to your Supabase dashboard\n2. Open the sent_emails or campaign_leads table\n3. Use the CSV download option\n\nNative export to CSV will be added in a future update.`,
      },
      {
        q: 'How are opens tracked?',
        a: `A tiny invisible 1×1 pixel image is inserted at the bottom of each email. When the recipient's email client loads images, the pixel fires and we record an open.\n\nGmail loads images through its own servers about 5–15 seconds after delivery (to protect user privacy). Lead Genie filters these out by only counting opens that happen **30+ seconds after send time**, ensuring you only see real human opens.`,
      },
    ],
  },
  {
    id: 'billing',
    emoji: '💳',
    title: 'Billing & Plans',
    subtitle: 'Managing your subscription, upgrading, and understanding your credits.',
    articles: [
      {
        q: 'What are the available plans?',
        a: `**Free** — 3 campaigns, 500 leads, 1 email account, 1,000 emails/month\n**Pro** — Unlimited campaigns, unlimited leads, unlimited accounts, 50,000 emails/month\n**Agency** — Everything in Pro + 200,000 emails/month + priority support\n\nGo to **Billing** in the sidebar to see current usage and upgrade.`,
      },
      {
        q: 'What are AI credits?',
        a: `AI credits are used when you generate emails with the AI on the homepage or in the campaign builder.\n\nSending emails does **not** consume AI credits. You can send thousands of emails without using a single credit.\n\nFree accounts get 100 AI credits. Credits reset monthly on Pro and Agency plans. The credit usage shows in the sidebar and header.`,
      },
      {
        q: 'Upgrading or downgrading your plan',
        a: `Go to **Billing** → click **Upgrade**.\n\nYour current usage and limits are shown on the billing page. Upgrading takes effect immediately. Downgrading takes effect at the end of your billing cycle.`,
      },
      {
        q: 'Adding team members',
        a: `Team member management is coming in a future update.\n\nCurrently each account is single-user. Contact support if you need a multi-seat setup and we'll help manually.`,
      },
      {
        q: 'Refund policy',
        a: `Refunds are available within 7 days of purchase if you haven't used your account significantly.\n\nContact support at the email below with your account email and reason. We typically respond within 24 hours on business days.`,
      },
    ],
  },
];

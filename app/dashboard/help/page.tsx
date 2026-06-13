'use client';

import { useState } from 'react';
import Link from 'next/link';

const sections = [
  {
    id: 'quickstart',
    title: 'Quick Start',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
      </svg>
    ),
    articles: [
      {
        q: 'How do I get started with LeadGenie?',
        a: `Getting started takes 3 steps:\n\n1. **Connect your email account** — Go to Email Accounts → click "Connect Gmail". Authorize LeadGenie to send emails on your behalf. You can connect multiple accounts for higher volume.\n\n2. **Add your leads** — Go to Leads → create a list → upload a CSV file with columns: First Name, Last Name, Email, Company (optional). Or add leads one by one manually.\n\n3. **Create a campaign** — Go to Campaigns → New Campaign → pick your leads list, write your email steps, set your schedule, and launch.`,
      },
      {
        q: 'What is warmup and do I need it?',
        a: `Warmup gradually builds your email account's sending reputation before you run campaigns. Without warmup, sending hundreds of cold emails from a fresh inbox risks landing in spam.\n\nWe recommend warming up new accounts for at least 2–3 weeks before launching campaigns. Go to Warmup → enable it for your account. It sends small batches of real-looking emails that get opened and replied to automatically, building your sender score.`,
      },
    ],
  },
  {
    id: 'campaigns',
    title: 'Campaigns',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
      </svg>
    ),
    articles: [
      {
        q: 'How do multi-step campaigns (follow-ups) work?',
        a: `A campaign can have multiple email steps. Step 1 is the first cold email. Steps 2, 3, etc. are follow-ups sent only to leads who haven't replied.\n\nWhen setting up steps:\n- Set a **delay** between steps (e.g., "3 days after step 1")\n- If a lead replies at any step, they are removed from the sequence automatically — no more emails sent to them\n- Use {{first_name}}, {{company}}, {{website}} variables to personalize each email`,
      },
      {
        q: 'What do the schedule settings mean?',
        a: `**Sending window**: The hours of the day emails go out (e.g., 9 AM – 5 PM). Emails are sent during this window only.\n\n**Active days**: Which days of the week to send (e.g., Mon–Fri). Emails scheduled for inactive days are pushed to the next active day.\n\n**Min / Max delay**: A random delay between each email, picked between these two values. This makes sending look natural, not robotic.\n\n**Daily limit**: Max emails per day across all accounts. Useful to stay within safe sending limits.\n\nThe **Completes In** estimate on the Review step shows how many days until all leads receive all steps at your current settings.`,
      },
      {
        q: 'Why did my campaign stop before reaching all leads?',
        a: `Campaigns stop sending to a lead when:\n- The lead replied (automatically removed from sequence)\n- The lead unsubscribed (clicked the unsubscribe link)\n- The lead's status was set to "Do Not Contact" in Unibox\n\nThe campaign itself pauses if you click Pause on the campaign page, or if your email account is disconnected.`,
      },
      {
        q: 'Can I use personalization variables?',
        a: `Yes. In the email body and subject line, use double-curly-brace variables:\n\n- {{first_name}} — lead's first name\n- {{last_name}} — lead's last name\n- {{email}} — lead's email address\n- {{company}} — lead's company\n- {{website}} — lead's website\n\nIf a variable is missing from the lead's data, it is left blank. Make sure your CSV has those columns filled in.`,
      },
    ],
  },
  {
    id: 'leads',
    title: 'Leads',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    articles: [
      {
        q: 'How do I import leads from a CSV?',
        a: `Go to Leads → select or create a list → click "Upload File".\n\nYour CSV should have headers in the first row. Supported column names:\n- **Email** (required) — email, Email, email_address\n- **First Name** — first_name, firstName, First Name\n- **Last Name** — last_name, lastName, Last Name\n- **Company** — company, Company, company_name\n- **Website** — website, Website\n\nThe importer detects duplicates both within your file and against leads already in your account. Duplicate emails are skipped automatically.`,
      },
      {
        q: 'What does the lead status mean?',
        a: `Each lead has a status:\n\n- **Active** — in a campaign sequence, will receive follow-ups\n- **Replied** — lead replied, removed from sequence\n- **Unsubscribed** — clicked unsubscribe, will never receive emails again\n- **Bounced** — email could not be delivered\n- **Do Not Contact** — manually marked in Unibox, excluded from all campaigns`,
      },
    ],
  },
  {
    id: 'inbox',
    title: 'Unibox (Inbox)',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z"/>
      </svg>
    ),
    articles: [
      {
        q: 'How does Unibox work?',
        a: `Unibox collects all replies from your connected Gmail accounts into one place. It syncs in the background every 2 minutes — you don't need to keep the Unibox tab open.\n\nReplies are matched to the lead and campaign they belong to, so you always know the context of each conversation.`,
      },
      {
        q: 'What do the filter tags (Interested, Not Interested, etc.) do?',
        a: `When you open a reply, you can "Mark as" one of these statuses:\n\n- **Interested** — lead wants to know more, great for follow-up pipeline\n- **Not Interested** — lead declined, use to stop wasting time\n- **Out of Office** — auto-reply, revisit later\n- **Do Not Contact** — removes lead from all future campaigns permanently\n\nOnce tagged, use the filter dropdown at the top of the thread list to see only Interested replies, for example. This helps you manage a large inbox without missing hot leads.`,
      },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
      </svg>
    ),
    articles: [
      {
        q: 'What do Open Rate, Click Rate, and Reply Rate mean?',
        a: `**Open Rate** — percentage of sent emails that were opened. LeadGenie tracks this using a tiny invisible tracking pixel. Gmail pre-fetches images within seconds of delivery, so we only count opens that happen 30+ seconds after sending to avoid false positives.\n\n**Click Rate** — percentage of recipients who clicked a link in your email.\n\n**Reply Rate** — percentage of leads who replied. This is the most important metric for cold email. A reply rate above 5% is excellent.`,
      },
      {
        q: 'Why does my open rate look high or low?',
        a: `Open tracking can be affected by:\n\n- **Security scanners** — some corporate email servers pre-scan emails and click all links/images. This can inflate open rates.\n- **Gmail image proxy** — Gmail loads tracking pixels through its own servers to protect privacy. We filter out known bot patterns.\n- **Plain-text emails** — if a recipient's email client doesn't load images, opens won't be tracked.\n\nReply rate is a more reliable signal than open rate for cold email performance.`,
      },
    ],
  },
  {
    id: 'deliverability',
    title: 'Deliverability',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    ),
    articles: [
      {
        q: 'How do I avoid landing in spam?',
        a: `The main factors that affect deliverability:\n\n1. **Warm up your inbox first** — never send cold campaigns from a brand-new email address without warming up for 2–3 weeks\n2. **Keep daily volume low** — start at 20–30 emails/day and increase gradually over weeks\n3. **Use random delays** — our Min/Max delay randomizes send timing so it doesn't look like a mass blast\n4. **Write naturally** — avoid spam trigger words (Free!, Guaranteed!, Click here!), don't use too many links or images\n5. **Include unsubscribe link** — enable it per email step. This is required by law (CAN-SPAM, GDPR) and improves deliverability\n6. **Use a custom domain** — sending from a branded domain (you@yourcompany.com) builds better reputation than Gmail/Yahoo personal accounts`,
      },
      {
        q: 'What is SPF, DKIM, DMARC and do I need them?',
        a: `These are email authentication records that prove your emails are legitimate:\n\n- **SPF** — tells receivers which servers are allowed to send on behalf of your domain\n- **DKIM** — adds a cryptographic signature to each email, proving it wasn't tampered\n- **DMARC** — tells receivers what to do with emails that fail SPF/DKIM\n\nIf you're sending from Gmail, Google handles DKIM automatically. For custom domains, set these up in your domain's DNS settings. Without them, emails are much more likely to land in spam.`,
      },
    ],
  },
];

export default function HelpPage() {
  const [activeSection, setActiveSection] = useState('quickstart');
  const [openArticle, setOpenArticle] = useState<string | null>(null);

  const current = sections.find(s => s.id === activeSection);

  const renderBody = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (!line.trim()) return <br key={i}/>;
      const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j} className="text-gray-900">{part.slice(2, -2)}</strong>;
        }
        return part;
      });
      if (line.match(/^\d+\./)) {
        return <p key={i} className="mb-1 pl-2">{parts}</p>;
      }
      if (line.startsWith('- ')) {
        return <p key={i} className="mb-1 pl-4 text-gray-600 before:content-['·'] before:mr-2 before:text-gray-400">{parts}</p>;
      }
      return <p key={i} className="mb-1">{parts}</p>;
    });
  };

  return (
    <main className="flex-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Help & Guide</h1>
          <p className="text-sm text-gray-400 mt-0.5">Everything you need to run great campaigns.</p>
        </div>
        <Link href="/dashboard" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
          ← Back to dashboard
        </Link>
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <nav className="w-52 shrink-0 space-y-0.5">
          {sections.map(s => (
            <button key={s.id} onClick={() => { setActiveSection(s.id); setOpenArticle(null); }}
              className={`w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeSection === s.id ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}>
              <span className={activeSection === s.id ? 'text-blue-600' : 'text-gray-400'}>{s.icon}</span>
              {s.title}
            </button>
          ))}
        </nav>

        {/* Articles */}
        <div className="flex-1 max-w-2xl">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <span className="text-blue-600">{current?.icon}</span>
              <h2 className="text-base font-bold text-gray-900">{current?.title}</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {current?.articles.map((article, idx) => {
                const key = `${activeSection}-${idx}`;
                const isOpen = openArticle === key;
                return (
                  <div key={key}>
                    <button
                      onClick={() => setOpenArticle(isOpen ? null : key)}
                      className="w-full flex items-center justify-between text-left px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-sm font-semibold text-gray-900 pr-4">{article.q}</span>
                      <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-5 text-sm text-gray-600 leading-relaxed space-y-0.5 bg-gray-50/50">
                        {renderBody(article.a)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 bg-blue-50 border border-blue-100 rounded-2xl px-6 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">Still need help?</p>
              <p className="text-xs text-gray-500 mt-0.5">Can't find what you're looking for? Reach out and we'll help.</p>
            </div>
            <a href="mailto:support@leadgenie.ai" className="text-xs font-bold text-blue-600 hover:text-blue-700 whitespace-nowrap transition-colors">
              Contact support →
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

'use client';

import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FAQAccordion } from '@/components/FAQAccordion';

const templates = [
  {
    category: 'SaaS',
    title: 'The Problem-First Cold Email',
    subject: 'Quick question about {{company_name}} prospecting',
    preview: `Hi {{first_name}},

Most {{job_title}}s at {{company_size}} SaaS companies are still spending 3+ hours a day on manual prospecting.

We built Leads Genie to fix that — automated outreach that books qualified demos without an SDR.

Worth a 15-minute call this week?

{{your_name}}`,
    stats: { open: '62%', reply: '19%' },
  },
  {
    category: 'Agency',
    title: 'The Social Proof Agency Pitch',
    subject: '47 leads in 30 days for {{company_name}}?',
    preview: `Hi {{first_name}},

We helped {{similar_company}} generate 47 qualified leads in their first month using cold email — without adding headcount.

I think we can do the same for {{company_name}}.

Mind if I share what we did specifically?

{{your_name}}`,
    stats: { open: '58%', reply: '22%' },
  },
  {
    category: 'B2B Sales',
    title: 'The Short & Direct Opener',
    subject: 'Quick question, {{first_name}}',
    preview: `{{first_name}} — quick question.

Are you currently happy with how many qualified leads your team is generating each month?

Asking because most {{job_title}}s I speak with say they're leaving pipeline on the table.

{{your_name}}`,
    stats: { open: '71%', reply: '24%' },
  },
  {
    category: 'Recruitment',
    title: 'The Passive Candidate Outreach',
    subject: '{{role}} opportunity at {{our_company}}',
    preview: `Hi {{first_name}},

I came across your background on LinkedIn — your experience at {{current_company}} is exactly what we're looking for.

We're hiring a {{role}} at {{our_company}} and I'd love to have a no-pressure chat to see if it might be a fit.

Would you be open to a quick call this week?

{{your_name}}`,
    stats: { open: '67%', reply: '21%' },
  },
  {
    category: 'Follow-up',
    title: 'The Gentle Follow-up',
    subject: 'Re: {{company_name}} — quick follow up',
    preview: `Hi {{first_name}},

Just wanted to bump this to the top of your inbox in case it got buried.

Still happy to share how {{similar_company}} used Leads Genie to book 30 meetings in 3 weeks.

Worth a quick chat?

{{your_name}}`,
    stats: { open: '48%', reply: '14%' },
  },
  {
    category: 'Break-up',
    title: 'The Break-up Email',
    subject: 'Closing the loop, {{first_name}}',
    preview: `{{first_name}},

I've reached out a few times but haven't heard back — I'll assume the timing isn't right and won't follow up again.

If that ever changes, I'm here.

Best,
{{your_name}}`,
    stats: { open: '55%', reply: '18%' },
  },
];

const catColors: Record<string, string> = {
  SaaS:        'bg-blue-100 text-blue-700',
  Agency:      'bg-purple-100 text-purple-700',
  'B2B Sales': 'bg-green-100 text-green-700',
  Recruitment: 'bg-orange-100 text-orange-700',
  'Follow-up': 'bg-yellow-100 text-yellow-700',
  'Break-up':  'bg-red-100 text-red-700',
};

function useTemplate(t: { title: string; subject: string; preview: string }) {
  try {
    localStorage.setItem('prefill_template', JSON.stringify({ subject: t.subject, body: t.preview }));
  } catch {}
  window.location.href = '/dashboard/campaigns/new';
}

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        <section className="hero-gradient py-20 text-center">
          <div className="container">
            <span className="inline-block text-xs font-bold bg-white/20 text-white rounded-full px-3 py-1 mb-5 uppercase tracking-widest">Templates</span>
            <h1 className="text-4xl sm:text-5xl lg:text-[60px] font-extrabold text-white leading-[1.08] tracking-tight">Cold Email Templates That Work</h1>
            <p className="mt-4 text-blue-100 text-lg leading-relaxed max-w-xl mx-auto">
              Proven cold email templates used by 30,000+ Leads Genie users.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="container max-w-[1100px]">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map(t => (
                <div key={t.title} className="border border-gray-100 rounded-2xl overflow-hidden flex flex-col bg-white hover:shadow-sm transition-shadow">
                  <div className="p-6 border-b border-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 ${catColors[t.category]}`}>{t.category}</span>
                      <div className="flex items-center gap-3 text-[11px] text-gray-400 font-medium">
                        <span>Open {t.stats.open}</span>
                        <span>Reply {t.stats.reply}</span>
                      </div>
                    </div>
                    <h2 className="text-sm font-bold text-gray-900">{t.title}</h2>
                  </div>
                  <div className="p-6 bg-gray-50 flex-1">
                    <pre className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap font-sans">
                      {t.preview}
                    </pre>
                  </div>
                  <div className="p-4 bg-white">
                    <button
                      onClick={() => useTemplate(t)}
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold bg-blue-600 text-white rounded-xl py-2.5 hover:bg-blue-700 transition-colors">
                      Use This Template
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-14 text-center">
              <p className="text-gray-500 text-sm mb-4">Sign up to access 100+ templates and import them directly into your campaigns.</p>
              <button
                onClick={() => { window.location.href = '/signup'; }}
                className="inline-flex items-center bg-gray-900 text-white text-sm font-semibold rounded-full px-7 py-3 hover:bg-gray-700 transition-colors">
                Get All Templates Free
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                </svg>
              </button>
            </div>
          </div>
        </section>

        <FAQAccordion />
      </main>
      <Footer />
    </div>
  );
}

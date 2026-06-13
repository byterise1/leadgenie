import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

const templates = [
  {
    category: 'SaaS',
    title: 'The Problem-First Cold Email',
    preview: `Hi {{first_name}},

Most {{job_title}}s at {{company_size}} SaaS companies are still spending 3+ hours a day on manual prospecting.

We built Lead Genie to fix that — automated outreach that books qualified demos without an SDR.

Worth a 15-minute call this week?

{{your_name}}`,
    stats: { open: '62%', reply: '19%' },
  },
  {
    category: 'Agency',
    title: 'The Social Proof Agency Pitch',
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
    preview: `{{first_name}} — quick question.

Are you currently happy with how many qualified leads your team is generating each month?

Asking because most {{job_title}}s I speak with say they're leaving pipeline on the table.

{{your_name}}`,
    stats: { open: '71%', reply: '24%' },
  },
  {
    category: 'Recruitment',
    title: 'The Passive Candidate Outreach',
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
    preview: `Hi {{first_name}},

Just wanted to bump this to the top of your inbox in case it got buried.

Still happy to share how {{similar_company}} used Lead Genie to book 30 meetings in 3 weeks.

Worth a quick chat?

{{your_name}}`,
    stats: { open: '48%', reply: '14%' },
  },
  {
    category: 'Break-up',
    title: 'The Break-up Email',
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

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        <section className="border-b border-gray-100 py-16 text-center">
          <div className="container max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Templates</p>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">Cold Email Templates That Work</h1>
            <p className="mt-4 text-gray-500 text-base leading-relaxed max-w-lg mx-auto">
              Proven cold email templates used by 30,000+ Lead Genie users.
              Copy, customise, and launch in minutes.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="container max-w-5xl">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map(t => (
                <div key={t.title} className="border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-5 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 ${catColors[t.category]}`}>{t.category}</span>
                      <div className="flex items-center gap-3 text-[11px] text-gray-400 font-medium">
                        <span>Open {t.stats.open}</span>
                        <span>Reply {t.stats.reply}</span>
                      </div>
                    </div>
                    <h2 className="text-sm font-bold text-gray-900">{t.title}</h2>
                  </div>
                  <div className="p-5 bg-gray-50">
                    <pre className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap font-sans">
                      {t.preview}
                    </pre>
                  </div>
                  <div className="p-4 bg-white">
                    <Link href="/signup"
                      className="w-full flex items-center justify-center text-xs font-semibold bg-blue-600 text-white rounded-xl py-2.5 hover:bg-blue-700 transition-colors">
                      Use This Template →
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-14 text-center">
              <p className="text-gray-500 text-sm mb-4">Sign up to access 100+ templates and import them directly into your campaigns.</p>
              <Link href="/signup"
                className="inline-flex items-center bg-gray-900 text-white text-sm font-semibold rounded-full px-7 py-3 hover:bg-gray-700 transition-colors">
                Get All Templates Free →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

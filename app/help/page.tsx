import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

const categories = [
  {
    icon: '🚀',
    title: 'Getting Started',
    desc: 'Set up your account, connect your first email account, and launch your first campaign in under 10 minutes.',
    articles: ['Creating your LeadGenie account', 'Connecting Gmail or Outlook', 'Setting up email warmup', 'Uploading your first prospect list', 'Launching your first campaign'],
  },
  {
    icon: '📧',
    title: 'Campaigns',
    desc: 'Everything about building, launching, and optimising your cold email campaigns.',
    articles: ['Creating a multi-step sequence', 'Setting sending schedules', 'A/B testing subject lines', 'Adding personalisation variables', 'Pausing and resuming campaigns'],
  },
  {
    icon: '🔥',
    title: 'Email Warmup',
    desc: 'Understanding warmup, monitoring your score, and troubleshooting deliverability issues.',
    articles: ['How email warmup works', 'Reading your warmup score', 'Warmup best practices', 'How long does warmup take?', 'Troubleshooting spam placement'],
  },
  {
    icon: '📥',
    title: 'Unibox',
    desc: 'Managing all your replies from one place, labelling prospects, and handing off to your team.',
    articles: ['Navigating the Unibox', 'Labelling replies by intent', 'Assigning replies to teammates', 'Replying from the Unibox', 'Filtering by campaign or account'],
  },
  {
    icon: '📊',
    title: 'Analytics',
    desc: 'Interpreting your metrics, tracking email opens and clicks, and improving performance.',
    articles: ['Understanding your dashboard', 'Open rate vs. reply rate', 'Click tracking explained', 'Exporting campaign reports', 'Setting up conversion tracking'],
  },
  {
    icon: '💳',
    title: 'Billing & Plans',
    desc: 'Managing your subscription, upgrading your plan, and understanding your invoice.',
    articles: ['Upgrading or downgrading your plan', 'Cancelling your subscription', 'Downloading invoices', 'Adding team members', 'Refund policy'],
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        <section className="border-b border-gray-100 py-16 text-center">
          <div className="container max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Help Center</p>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">How can we help?</h1>
            <p className="mt-4 text-gray-500 text-base max-w-lg mx-auto leading-relaxed">
              Browse guides and tutorials for every part of LeadGenie. Can&apos;t find what you need?
              <Link href="/contact" className="text-blue-600 hover:underline ml-1">Contact support →</Link>
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="container max-w-5xl">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map(cat => (
                <div key={cat.title} className="border border-gray-200 rounded-2xl p-6 hover:shadow-sm transition-shadow">
                  <span className="text-3xl">{cat.icon}</span>
                  <h2 className="mt-3 text-base font-bold text-gray-900">{cat.title}</h2>
                  <p className="mt-1 text-sm text-gray-500 leading-relaxed mb-4">{cat.desc}</p>
                  <ul className="space-y-2">
                    {cat.articles.map(a => (
                      <li key={a}>
                        <Link href="/signup" className="text-sm text-blue-600 hover:underline flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                          </svg>
                          {a}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-14 border border-gray-200 rounded-2xl p-8 text-center">
              <p className="text-lg font-bold text-gray-900 mb-2">Still need help?</p>
              <p className="text-gray-500 text-sm mb-6">Our support team responds within a few hours on business days.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/contact"
                  className="border border-gray-200 text-gray-700 text-sm font-semibold rounded-full px-7 py-3 hover:bg-gray-50 transition-colors">
                  Contact Support
                </Link>
                <Link href="/signup"
                  className="bg-gray-900 text-white text-sm font-semibold rounded-full px-7 py-3 hover:bg-gray-700 transition-colors">
                  Start Free Trial
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

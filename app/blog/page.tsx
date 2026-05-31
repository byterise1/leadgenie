import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

const posts = [
  { title: 'The Complete Guide to Cold Email Deliverability in 2026', category: 'Deliverability', time: '8 min read', desc: 'Learn exactly how to set up SPF, DKIM, DMARC, and use email warmup to land in the inbox — not spam.' },
  { title: 'How to Write Cold Emails That Get 20%+ Reply Rates',      category: 'Copywriting',  time: '6 min read', desc: 'The proven cold email frameworks used by top sales teams to book meetings consistently at scale.'       },
  { title: 'Cold Email Sending Limits: How Many Emails Can You Send?', category: 'Outreach',     time: '5 min read', desc: 'A complete breakdown of daily sending limits for Gmail, Outlook, and custom SMTP domains.'               },
  { title: 'The Best Cold Email Subject Lines for 2026 (With Data)',   category: 'Copywriting',  time: '7 min read', desc: 'We analysed 10 million emails. These subject line patterns consistently outperform every other style.'  },
  { title: 'How to Build a Cold Email Sequence That Books Meetings',   category: 'Campaigns',    time: '9 min read', desc: 'Step-by-step guide to building a 5-step sequence with the right delays, angles, and follow-up logic.'    },
  { title: 'Email Warmup Explained: Everything You Need to Know',      category: 'Deliverability', time: '5 min read', desc: 'What warmup is, how long it takes, and the fastest way to reach inbox placement scores above 90%.'    },
];

const catColors: Record<string, string> = {
  Deliverability: 'bg-blue-100 text-blue-700',
  Copywriting:    'bg-purple-100 text-purple-700',
  Outreach:       'bg-green-100 text-green-700',
  Campaigns:      'bg-orange-100 text-orange-700',
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        <section className="border-b border-gray-100 py-16 text-center">
          <div className="container max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Blog</p>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">Cold Email Resources</h1>
            <p className="mt-4 text-gray-500 text-base leading-relaxed max-w-lg mx-auto">
              Guides, strategies, and data-driven insights to help you send better cold emails,
              improve deliverability, and book more meetings.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="container max-w-5xl">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map(post => (
                <Link key={post.title} href="/signup"
                  className="border border-gray-200 rounded-2xl p-6 hover:shadow-md hover:-translate-y-0.5 transition-all group block">
                  <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 ${catColors[post.category] || 'bg-gray-100 text-gray-600'}`}>
                    {post.category}
                  </span>
                  <h2 className="mt-3 text-base font-bold text-gray-900 leading-snug group-hover:text-blue-600 transition-colors">
                    {post.title}
                  </h2>
                  <p className="mt-2 text-sm text-gray-500 leading-relaxed">{post.desc}</p>
                  <p className="mt-4 text-xs text-gray-400 font-medium">{post.time}</p>
                </Link>
              ))}
            </div>

            <div className="text-center mt-14">
              <p className="text-gray-500 text-sm mb-4">More articles coming soon. Subscribe to get them first.</p>
              <Link href="/signup"
                className="inline-flex items-center bg-gray-900 text-white text-sm font-semibold rounded-full px-7 py-3 hover:bg-gray-700 transition-colors">
                Get Started Free →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

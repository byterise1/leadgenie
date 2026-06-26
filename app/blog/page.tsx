import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import Link from 'next/link';
import { blogPosts } from '@/lib/blog-data';

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
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">Cold Email Resources</h1>
            <p className="mt-4 text-gray-500 text-base leading-relaxed max-w-lg mx-auto">
              Guides, strategies, and data-driven insights to help you land in the inbox,
              write better emails, and book more meetings.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="container max-w-[1100px]">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogPosts.map(post => (
                <Link key={post.slug} href={`/blog/${post.slug}`}
                  className="border border-gray-200 rounded-2xl p-6 hover:shadow-md hover:-translate-y-0.5 transition-all group block">
                  <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 ${catColors[post.category] || 'bg-gray-100 text-gray-600'}`}>
                    {post.category}
                  </span>
                  <h2 className="mt-3 text-base font-bold text-gray-900 leading-snug group-hover:text-blue-600 transition-colors">
                    {post.title}
                  </h2>
                  <p className="mt-2 text-sm text-gray-500 leading-relaxed">{post.desc}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-gray-400 font-medium">{post.readTime}</p>
                    <p className="text-xs text-gray-400">{post.date}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

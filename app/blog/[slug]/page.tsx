import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import Link from 'next/link';
import { blogPosts } from '@/lib/blog-data';
import { notFound } from 'next/navigation';

const catColors: Record<string, string> = {
  Deliverability: 'bg-blue-100 text-blue-700',
  Copywriting:    'bg-purple-100 text-purple-700',
  Outreach:       'bg-green-100 text-green-700',
  Campaigns:      'bg-orange-100 text-orange-700',
};

export function generateStaticParams() {
  return blogPosts.map(p => ({ slug: p.slug }));
}

function parseInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="bg-gray-100 dark:bg-gray-800 text-blue-700 dark:text-blue-400 rounded px-1.5 py-0.5 text-[0.85em] font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function renderMarkdown(content: string): React.ReactNode[] {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="my-4 space-y-2 pl-5 list-disc marker:text-blue-500">
          {listItems.map((item, i) => (
            <li key={i} className="text-gray-700 dark:text-gray-300 leading-relaxed">{item}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={`h2-${i}`} className="text-2xl font-extrabold text-gray-900 dark:text-white mt-10 mb-4 leading-tight">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={`h3-${i}`} className="text-lg font-bold text-gray-900 dark:text-white mt-7 mb-3">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith('- ')) {
      listItems.push(parseInline(line.slice(2)));
    } else if (line.trim() === '') {
      flushList();
    } else if (line.trim()) {
      flushList();
      elements.push(
        <p key={`p-${i}`} className="text-gray-700 dark:text-gray-300 leading-relaxed my-4">
          {parseInline(line)}
        </p>
      );
    }
  }
  flushList();
  return elements;
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = blogPosts.find(p => p.slug === params.slug);
  if (!post) notFound();

  const related = blogPosts.filter(p => p.slug !== post.slug && p.category === post.category).slice(0, 3);
  const others  = blogPosts.filter(p => p.slug !== post.slug && p.category !== post.category).slice(0, 3 - related.length);
  const suggested = [...related, ...others].slice(0, 3);

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:text-white">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="hero-gradient pb-20 pt-20">
          <div className="container max-w-[760px] text-center">
            <Link href="/blog" className="inline-flex items-center gap-1.5 text-blue-200 hover:text-white text-xs font-semibold mb-6 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
              Back to Blog
            </Link>
            <div className="mb-4">
              <span className={`text-[11px] font-bold rounded-full px-3 py-1.5 ${catColors[post.category] || 'bg-white/20 text-white'}`}>
                {post.category}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-[1.1] tracking-tight">
              {post.title}
            </h1>
            <p className="mt-4 text-blue-100 text-base leading-relaxed max-w-lg mx-auto">{post.desc}</p>
            <div className="mt-5 flex items-center justify-center gap-4 text-blue-200 text-xs font-medium">
              <span>{post.date}</span>
              <span className="w-1 h-1 rounded-full bg-blue-300" />
              <span>{post.readTime}</span>
            </div>
          </div>
        </section>

        {/* Article */}
        <section className="py-14">
          <div className="container max-w-[760px]">
            <article className="prose-custom">
              {renderMarkdown(post.content || '')}
            </article>

            {/* CTA */}
            <div className="mt-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white text-center">
              <h3 className="text-xl font-extrabold mb-2">Ready to improve your deliverability?</h3>
              <p className="text-blue-200 text-sm mb-5 leading-relaxed">
                Leads Genie&apos;s AI warmup network and built-in verification help you land in the inbox every time.
              </p>
              <Link href="/signup"
                className="inline-flex items-center gap-2 bg-white text-blue-700 text-sm font-bold rounded-full px-8 py-3 hover:bg-blue-50 transition-colors">
                Start Free — No Card Needed
              </Link>
            </div>
          </div>
        </section>

        {/* Related Posts */}
        {suggested.length > 0 && (
          <section className="py-14 bg-gray-50">
            <div className="container max-w-[1100px]">
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mb-6">More Articles</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {suggested.map(p => (
                  <Link key={p.slug} href={`/blog/${p.slug}`}
                    className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 hover:shadow-md hover:-translate-y-0.5 transition-all group block">
                    <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 ${catColors[p.category] || 'bg-gray-100 text-gray-600'}`}>
                      {p.category}
                    </span>
                    <h3 className="mt-3 text-sm font-bold text-gray-900 dark:text-white leading-snug group-hover:text-blue-600 transition-colors">
                      {p.title}
                    </h3>
                    <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">{p.desc}</p>
                    <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">{p.readTime}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

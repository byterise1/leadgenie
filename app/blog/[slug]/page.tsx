import { notFound } from 'next/navigation';
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

export function generateStaticParams() {
  return blogPosts.map(p => ({ slug: p.slug }));
}

/* Next.js 15: params is a Promise and must be awaited */
export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = blogPosts.find(p => p.slug === slug);
  if (!post) notFound();

  const related = blogPosts.filter(p => p.slug !== slug).slice(0, 3);
  const lines = post.content.split('\n');

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        {/* Header */}
        <section className="border-b border-gray-100 py-14">
          <div className="container max-w-3xl">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Blog
            </Link>
            <span
              className={`text-[11px] font-bold rounded-full px-2.5 py-1 ${catColors[post.category] || 'bg-gray-100 text-gray-600'}`}
            >
              {post.category}
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
              {post.title}
            </h1>
            <div className="mt-4 flex items-center gap-3 text-sm text-gray-400">
              <span>{post.date}</span>
              <span>·</span>
              <span>{post.readTime}</span>
            </div>
          </div>
        </section>

        {/* Article body */}
        <section className="py-14">
          <div className="container max-w-3xl">
            <div className="space-y-4">
              {lines.map((line, i) => {
                if (line.startsWith('## ')) {
                  return (
                    <h2 key={i} className="text-2xl font-bold text-gray-900 mt-10 mb-2">
                      {line.replace('## ', '')}
                    </h2>
                  );
                }
                if (line.startsWith('### ')) {
                  return (
                    <h3 key={i} className="text-lg font-bold text-gray-900 mt-7 mb-2">
                      {line.replace('### ', '')}
                    </h3>
                  );
                }
                /* bold standalone lines */
                if (/^\*\*[^*]+\*\*$/.test(line.trim())) {
                  return (
                    <p key={i} className="font-bold text-gray-900">
                      {line.replace(/\*\*/g, '')}
                    </p>
                  );
                }
                /* bullet list */
                if (line.startsWith('- ')) {
                  return (
                    <li key={i} className="ml-6 list-disc text-gray-600 text-base leading-relaxed">
                      {line.replace('- ', '')}
                    </li>
                  );
                }
                /* table row */
                if (line.startsWith('| ') && !line.includes('---')) {
                  const cells = line.split('|').filter(c => c.trim());
                  const nextLine = lines[i + 1] || '';
                  const isHeader = nextLine.includes('---');
                  return (
                    <tr key={i} className={isHeader ? 'bg-gray-50' : 'border-t border-gray-100'}>
                      {cells.map((cell, j) =>
                        isHeader ? (
                          <th
                            key={j}
                            className="px-4 py-2.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wide"
                          >
                            {cell.trim()}
                          </th>
                        ) : (
                          <td key={j} className="px-4 py-2.5 text-sm text-gray-600">
                            {cell.trim()}
                          </td>
                        )
                      )}
                    </tr>
                  );
                }
                /* table separator — skip */
                if (line.startsWith('|') && line.includes('---')) return null;
                /* horizontal rule */
                if (line.trim() === '---') {
                  return <hr key={i} className="border-gray-200 my-6" />;
                }
                /* empty line */
                if (line.trim() === '') return <div key={i} className="h-1" />;
                /* code-style lines starting with backtick */
                if (line.startsWith('`') && line.endsWith('`')) {
                  return (
                    <code
                      key={i}
                      className="block bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 font-mono"
                    >
                      {line.replace(/`/g, '')}
                    </code>
                  );
                }
                /* default paragraph */
                return (
                  <p key={i} className="text-base text-gray-600 leading-relaxed">
                    {line}
                  </p>
                );
              })}
            </div>

            {/* CTA */}
            <div className="mt-14 border border-blue-100 bg-blue-50 rounded-2xl p-8 text-center">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Ready to put this into practice?
              </h3>
              <p className="text-gray-500 text-sm mb-5">
                Start your free trial and run your first campaign in under 10 minutes.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center bg-blue-600 text-white font-semibold text-sm rounded-full px-7 py-3 hover:bg-blue-700 transition-colors"
              >
                Start Free Trial →
              </Link>
            </div>
          </div>
        </section>

        {/* Related posts */}
        {related.length > 0 && (
          <section className="py-14 bg-gray-50 border-t border-gray-100">
            <div className="container max-w-[1100px]">
              <h2 className="text-xl font-bold text-gray-900 mb-8">More Articles</h2>
              <div className="grid sm:grid-cols-3 gap-5">
                {related.map(p => (
                  <Link
                    key={p.slug}
                    href={`/blog/${p.slug}`}
                    className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all group block"
                  >
                    <span
                      className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${catColors[p.category] || 'bg-gray-100 text-gray-600'}`}
                    >
                      {p.category}
                    </span>
                    <h3 className="mt-3 text-sm font-bold text-gray-900 leading-snug group-hover:text-blue-600 transition-colors">
                      {p.title}
                    </h3>
                    <p className="mt-2 text-xs text-gray-400">{p.readTime}</p>
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

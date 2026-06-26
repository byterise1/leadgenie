import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { helpSections, toSlug } from '@/lib/help-articles';

export function generateStaticParams() {
  return helpSections.flatMap(section =>
    section.articles.map(article => ({ slug: toSlug(article.q) }))
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  for (const section of helpSections) {
    const article = section.articles.find(a => toSlug(a.q) === slug);
    if (article) {
      return {
        title: `${article.q} — Leads Genie Help`,
        description: article.a.slice(0, 160).replace(/\*\*/g, '').replace(/\n/g, ' '),
      };
    }
  }
  return { title: 'Help — Leads Genie' };
}

function renderBody(text: string) {
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <br key={i} />;
    const renderInline = (raw: string) =>
      raw.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={j} className="text-gray-900 font-semibold">{part.slice(2, -2)}</strong>
          : part
      );
    if (/^\d+\./.test(line)) {
      return <p key={i} className="mb-2 pl-2 text-gray-600">{renderInline(line)}</p>;
    }
    if (line.startsWith('- ')) {
      return (
        <p key={i} className="mb-2 pl-3 text-gray-600 flex gap-2">
          <span className="text-gray-400 shrink-0">·</span>
          <span>{renderInline(line.slice(2))}</span>
        </p>
      );
    }
    return <p key={i} className="mb-2 text-gray-600">{renderInline(line)}</p>;
  });
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let foundSection = null;
  let foundArticle = null;

  for (const section of helpSections) {
    const article = section.articles.find(a => toSlug(a.q) === slug);
    if (article) {
      foundSection = section;
      foundArticle = article;
      break;
    }
  }

  if (!foundSection || !foundArticle) notFound();

  const otherArticles = foundSection.articles.filter(a => a.q !== foundArticle!.q);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main className="py-12">
        <div className="container max-w-4xl">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8">
            <Link href="/help" className="hover:text-blue-600 transition-colors">Help Center</Link>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            <span className="text-gray-500">{foundSection.title}</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            <span className="text-gray-700 font-medium truncate">{foundArticle.q}</span>
          </nav>

          <div className="grid lg:grid-cols-3 gap-10">
            {/* Article content */}
            <div className="lg:col-span-2">
              <div className="mb-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
                  {foundSection.title}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-3 mb-6 leading-snug">
                {foundArticle.q}
              </h1>

              <div className="prose max-w-none text-base leading-relaxed">
                {renderBody(foundArticle.a)}
              </div>

              {/* Contact CTA */}
              <div className="mt-10 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl px-6 py-6 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">Still need help?</p>
                  <p className="text-xs text-gray-500 mt-0.5">Our support team responds within a few hours on business days.</p>
                </div>
                <Link
                  href="/contact"
                  className="shrink-0 inline-flex items-center gap-1.5 bg-blue-600 text-white text-sm font-bold rounded-xl px-5 py-2.5 hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  Contact Support →
                </Link>
              </div>
            </div>

            {/* Sidebar: other articles in section */}
            <aside className="space-y-3">
              <div className="sticky top-6">
                <Link href="/help" className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-blue-600 transition-colors mb-5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
                  Back to Help Center
                </Link>

                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  More in {foundSection.title}
                </p>
                <div className="space-y-1">
                  {otherArticles.map(a => (
                    <Link
                      key={a.q}
                      href={`/help/${toSlug(a.q)}`}
                      className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors group"
                    >
                      <svg className="w-3.5 h-3.5 mt-0.5 text-gray-300 group-hover:text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                      </svg>
                      {a.q}
                    </Link>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100 space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">All sections</p>
                  {helpSections.map(s => (
                    <Link
                      key={s.id}
                      href={`/help#${s.id}`}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                        s.id === foundSection!.id
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      {s.title}
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

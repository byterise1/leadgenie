import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FAQAccordion } from '@/components/FAQAccordion';
import Link from 'next/link';
import { helpSections, toSlug } from '@/lib/help-articles';

export const metadata = {
  title: 'Help Center — Leads Genie',
  description: 'Browse guides and tutorials for every part of Leads Genie.',
};

const sectionIcons: Record<string, React.ReactNode> = {
  'getting-started': (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448"/>
    </svg>
  ),
  campaigns: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
    </svg>
  ),
  warmup: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"/>
    </svg>
  ),
  unibox: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z"/>
    </svg>
  ),
  analytics: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
    </svg>
  ),
  billing: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/>
    </svg>
  ),
};

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        <section className="hero-gradient pb-24 pt-20 text-center">
          <div className="container">
            <span className="inline-block text-xs font-bold bg-white/20 text-white rounded-full px-3 py-1 mb-5 uppercase tracking-widest">Help Center</span>
            <h1 className="text-4xl sm:text-5xl lg:text-[60px] font-extrabold text-white leading-[1.08] tracking-tight">How can we help?</h1>
            <p className="mt-4 text-blue-100 text-lg max-w-lg mx-auto leading-relaxed">
              Browse guides and tutorials for every part of Leads Genie.{' '}
              <Link href="/contact" className="text-white underline hover:text-blue-100">Contact support</Link>
              {' '}if you need more help.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="container max-w-[1100px]">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {helpSections.map(section => (
                <div key={section.id} id={section.id} className="border border-gray-100 rounded-2xl p-6 hover:shadow-sm transition-shadow">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                    {sectionIcons[section.id]}
                  </div>
                  <h2 className="text-base font-bold text-gray-900">{section.title}</h2>
                  <p className="mt-1 text-sm text-gray-500 leading-relaxed mb-4">{section.subtitle}</p>
                  <ul className="space-y-2">
                    {section.articles.map(article => (
                      <li key={article.q}>
                        <Link
                          href={`/help/${toSlug(article.q)}`}
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5 group"
                        >
                          <svg className="w-3.5 h-3.5 text-blue-400 shrink-0 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                          </svg>
                          {article.q}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-14 border border-gray-100 rounded-2xl p-6 text-center">
              <p className="text-lg font-bold text-gray-900 mb-2">Still need help?</p>
              <p className="text-gray-500 text-sm mb-6">Our support team responds within a few hours on business days.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/contact"
                  className="border border-gray-200 text-gray-700 text-sm font-semibold rounded-full px-7 py-3 hover:bg-gray-50 transition-colors">
                  Contact Support
                </Link>
                <Link href="/login"
                  className="bg-gray-900 text-white text-sm font-semibold rounded-full px-7 py-3 hover:bg-gray-700 transition-colors">
                  Sign In to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </section>
        <FAQAccordion />
      </main>
      <Footer />
    </div>
  );
}

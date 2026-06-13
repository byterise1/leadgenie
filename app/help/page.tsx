import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import Link from 'next/link';
import { helpSections, toSlug } from '@/lib/help-articles';

export const metadata = {
  title: 'Help Center — Lead Genie',
  description: 'Browse guides and tutorials for every part of Lead Genie.',
};

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
              Browse guides and tutorials for every part of Lead Genie. Can&apos;t find what you need?{' '}
              <Link href="/contact" className="text-blue-600 hover:underline">Contact support →</Link>
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="container max-w-5xl">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {helpSections.map(section => (
                <div key={section.id} id={section.id} className="border border-gray-200 rounded-2xl p-6 hover:shadow-sm transition-shadow">
                  <span className="text-3xl">{section.emoji}</span>
                  <h2 className="mt-3 text-base font-bold text-gray-900">{section.title}</h2>
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

            <div className="mt-14 border border-gray-200 rounded-2xl p-8 text-center">
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
      </main>
      <Footer />
    </div>
  );
}

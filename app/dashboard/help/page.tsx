'use client';

import { useState } from 'react';
import Link from 'next/link';
import { helpSections as sections } from '@/lib/help-articles';

export default function HelpPage() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [selectedArticleIdx, setSelectedArticleIdx] = useState<number | null>(null);

  const current = sections.find(s => s.id === activeSection)!;
  const selectedArticle = selectedArticleIdx !== null ? current.articles[selectedArticleIdx] : null;

  const selectSection = (id: string) => {
    setActiveSection(id);
    setSelectedArticleIdx(null);
  };

  const renderBody = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (!line.trim()) return <br key={i} />;
      const renderInline = (raw: string) =>
        raw.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
          part.startsWith('**') && part.endsWith('**')
            ? <strong key={j} className="text-gray-900 font-semibold">{part.slice(2, -2)}</strong>
            : part
        );
      if (/^\d+\./.test(line)) {
        return <p key={i} className="mb-1.5 pl-2">{renderInline(line)}</p>;
      }
      if (line.startsWith('- ')) {
        return <p key={i} className="mb-1.5 pl-3 text-gray-600"><span className="text-gray-400 mr-2">·</span>{renderInline(line.slice(2))}</p>;
      }
      return <p key={i} className="mb-1.5">{renderInline(line)}</p>;
    });
  };

  return (
    <main className="flex-1 p-4 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Help & Guide</h1>
          <p className="text-sm text-gray-400 mt-0.5">Everything you need to run great campaigns.</p>
        </div>
        <Link href="/dashboard" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
          ← Back
        </Link>
      </div>

      {/* Mobile section selector */}
      <div className="flex sm:hidden gap-1 bg-gray-100 rounded-xl p-1 mb-5 overflow-x-auto">
        {sections.map(s => (
          <button key={s.id} onClick={() => selectSection(s.id)}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeSection === s.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}>
            {s.title}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Section nav — desktop only */}
        <nav className="hidden sm:block w-52 shrink-0 space-y-0.5">
          {sections.map(s => (
            <button key={s.id} onClick={() => selectSection(s.id)}
              className={`w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeSection === s.id ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}>
              {s.title}
            </button>
          ))}
        </nav>

        {/* Right panel */}
        <div className="flex-1 min-w-0 sm:max-w-2xl">
          {selectedArticle ? (
            /* Full article view */
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <button
                  onClick={() => setSelectedArticleIdx(null)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
                  {current.title}
                </button>
                <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                <span className="text-xs text-gray-400 truncate">{selectedArticle.q}</span>
              </div>
              <div className="px-6 py-6">
                <h3 className="text-base font-bold text-gray-900 mb-4">{selectedArticle.q}</h3>
                <div className="text-sm text-gray-600 leading-relaxed space-y-0.5">
                  {renderBody(selectedArticle.a)}
                </div>
              </div>
            </div>
          ) : (
            /* Article list view */
            <>
              <div className="mb-4 px-1">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-lg font-bold text-gray-900">{current.title}</h2>
                </div>
                <p className="text-sm text-gray-400 pl-10">{current.subtitle}</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {current.articles.map((article, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedArticleIdx(idx)}
                      className="w-full flex items-center justify-between text-left px-6 py-4 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                          <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                          </svg>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors pr-4 truncate">{article.q}</span>
                      </div>
                      <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-500 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Contact support CTA */}
          <div className="mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
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
              target="_blank"
              className="sm:shrink-0 w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl px-4 py-2.5 hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              Contact Support
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

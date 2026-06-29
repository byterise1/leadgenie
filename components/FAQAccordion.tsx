'use client';

import { useState } from 'react';

const DEFAULT_FAQS = [
  { q: 'Is there a free plan?', a: 'Yes — our Free plan lets you run 3 campaigns, import up to 500 leads, and send 1,000 emails per month with no credit card required.' },
  { q: 'How does email warmup work?', a: 'Leads Genie automatically exchanges warmup emails between a pool of real inboxes to build your sender reputation. This tells email providers your domain is legitimate before you launch campaigns.' },
  { q: 'Can I use my Gmail or Outlook account?', a: 'Yes. Connect Gmail via OAuth or App Password, Outlook/Office 365, or any IMAP/SMTP account in seconds.' },
  { q: 'How is Leads Genie different from Instantly or Lemlist?', a: 'Leads Genie combines unlimited sending accounts, built-in email verification, AI personalisation, and a unified inbox — all in one platform at a fraction of the cost.' },
  { q: 'Is cold email legal?', a: 'Yes, when done right. Leads Genie enforces CAN-SPAM and GDPR compliance with mandatory unsubscribe links, opt-out tracking, and suppression lists.' },
  { q: 'What happens after my trial?', a: 'You stay on the Free plan automatically. No charges, no surprises. Upgrade only when you need more sending volume or accounts.' },
];

export function FAQAccordion({ faqs = DEFAULT_FAQS }: { faqs?: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="py-24 bg-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <span className="inline-block text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-full px-3 py-1 mb-4 uppercase tracking-widest">FAQ</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight mb-4">Frequently Asked Questions</h2>
          <p className="text-gray-500 dark:text-gray-500 text-base leading-relaxed">Everything you need to know about Leads Genie. Can't find an answer? <a href="/contact" className="text-blue-600 font-semibold hover:underline">Contact us.</a></p>
        </div>

        <div className="max-w-2xl mx-auto divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
          {faqs.map((faq, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className={`transition-colors ${isOpen ? 'bg-blue-50/40' : 'bg-white hover:bg-gray-50/60'}`}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left gap-4 group">
                  <span className={`text-sm font-semibold leading-snug transition-colors ${isOpen ? 'text-blue-700' : 'text-gray-900 dark:text-white group-hover:text-blue-600'}`}>
                    {faq.q}
                  </span>
                  <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all ${isOpen ? 'bg-blue-600 text-white rotate-180' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/>
                    </svg>
                  </span>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
                  <p className="px-6 pb-5 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

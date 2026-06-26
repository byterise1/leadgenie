'use client';

import { useState } from 'react';

const DEFAULT_FAQS = [
  { q: 'Is there a free plan?', a: 'Yes — our Free plan lets you run 3 campaigns, import up to 500 leads, and send 1,000 emails per month with no credit card required.' },
  { q: 'How does email warmup work?', a: 'Leads Add automatically exchanges warmup emails between a pool of real inboxes to build your sender reputation. This tells email providers your domain is legitimate before you launch campaigns.' },
  { q: 'Can I use my Gmail or Outlook account?', a: 'Yes. Connect Gmail via OAuth or App Password, Outlook/Office 365, or any IMAP/SMTP account in seconds.' },
  { q: 'How is Leads Add different from Instantly or Lemlist?', a: 'Leads Add combines unlimited sending accounts, built-in email verification, AI personalisation, and a unified inbox — all in one platform at a fraction of the cost.' },
  { q: 'Is cold email legal?', a: 'Yes, when done right. Leads Add enforces CAN-SPAM and GDPR compliance with mandatory unsubscribe links, opt-out tracking, and suppression lists.' },
  { q: 'What happens after my trial?', a: 'You stay on the Free plan automatically. No charges, no surprises. Upgrade only when you need more sending volume or accounts.' },
];

export function FAQAccordion({ faqs = DEFAULT_FAQS }: { faqs?: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-2">Frequently Asked Questions</h2>
          <p className="text-center text-gray-500 mb-10">Everything you need to know about Leads Add.</p>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left gap-4">
                  <span className="text-sm font-bold text-gray-900">{faq.q}</span>
                  <svg className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>
                {open === i && (
                  <div className="px-6 pb-5 text-sm text-gray-500 leading-relaxed border-t border-gray-50 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

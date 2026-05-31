'use client';

import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        <section className="border-b border-gray-100 py-16 text-center">
          <div className="container max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Contact</p>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">Get in Touch</h1>
            <p className="mt-4 text-gray-500 text-base leading-relaxed">
              Have a question, a sales inquiry, or need support? We&apos;re here to help.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="container max-w-4xl">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Contact options */}
              <div className="space-y-6">
                {[
                  { icon: '💬', title: 'Sales',   desc: 'Talk to our team about plans and pricing.',   email: 'sales@leadgenie.io'    },
                  { icon: '🛠️', title: 'Support', desc: 'Get help with your account or campaigns.',     email: 'help@leadgenie.io'     },
                  { icon: '🤝', title: 'Partners', desc: 'Explore affiliate and reseller opportunities.', email: 'partners@leadgenie.io' },
                  { icon: '📰', title: 'Press',   desc: 'Media inquiries and press kit requests.',       email: 'press@leadgenie.io'    },
                ].map(c => (
                  <div key={c.title} className="flex items-start gap-4 border border-gray-200 rounded-2xl p-5">
                    <span className="text-2xl">{c.icon}</span>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{c.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 mb-2">{c.desc}</p>
                      <a href={`mailto:${c.email}`} className="text-sm text-blue-600 hover:underline font-medium">{c.email}</a>
                    </div>
                  </div>
                ))}
              </div>

              {/* Form */}
              <div className="border border-gray-200 rounded-2xl p-7">
                {sent ? (
                  <div className="text-center py-8">
                    <span className="text-4xl mb-4 block">✅</span>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Message sent!</h3>
                    <p className="text-sm text-gray-500">We&apos;ll get back to you within 24 hours.</p>
                  </div>
                ) : (
                  <form onSubmit={e => { e.preventDefault(); setSent(true); }} className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-900 mb-5">Send a Message</h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">First name</label>
                        <input required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Last name</label>
                        <input required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email</label>
                      <input type="email" required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Subject</label>
                      <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        <option>Sales inquiry</option>
                        <option>Technical support</option>
                        <option>Billing question</option>
                        <option>Partnership</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Message</label>
                      <textarea required rows={4} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white font-semibold text-sm rounded-xl py-3 hover:bg-blue-700 transition-colors">
                      Send Message
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

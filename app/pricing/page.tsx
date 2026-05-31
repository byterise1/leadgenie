'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const plans = [
  {
    name: 'Growth',
    tagline: 'For solo founders & small teams',
    price: { monthly: 47, yearly: 37 },
    cta: 'Start Free Trial',
    featured: false,
    features: [
      'Unlimited Email Accounts',
      'Unlimited Email Warmup',
      '1,000 Uploaded Contacts',
      '5,000 Emails / Month',
      'Unibox (Unified Inbox)',
      'Basic Analytics',
      'Chat Support',
    ],
  },
  {
    name: 'Hypergrowth',
    tagline: 'Most popular for growing teams',
    price: { monthly: 97, yearly: 77 },
    cta: 'Start Free Trial',
    featured: true,
    features: [
      'Unlimited Email Accounts',
      'Unlimited Email Warmup',
      '25,000 Uploaded Contacts',
      '100,000 Emails / Month',
      'Unibox (Unified Inbox)',
      'Advanced Analytics & Tracking',
      'AI Personalisation',
      'Follow-up Sequences',
      'Premium Live Support',
    ],
  },
  {
    name: 'Light Speed',
    tagline: 'For high-volume outreach teams',
    price: { monthly: 358, yearly: 297 },
    cta: 'Start Free Trial',
    featured: false,
    features: [
      'Everything in Hypergrowth +',
      '100,000 Uploaded Contacts',
      '500,000 Emails / Month',
      'Private Sending Infrastructure',
      'Deliverability Monitoring',
      'Priority Support',
      'API Access',
    ],
  },
  {
    name: 'Enterprise',
    tagline: 'Custom plans for large teams',
    price: { monthly: null, yearly: null },
    cta: 'Book a Call',
    featured: false,
    features: [
      'Everything in Light Speed +',
      'Unlimited Contacts & Emails',
      'Dedicated IP Addresses',
      'Custom Sending Infrastructure',
      'White-label Options',
      'SLA & Uptime Guarantee',
      'Dedicated Account Manager',
    ],
  },
];

const faqs = [
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel your subscription at any time from your account dashboard. You keep access until the end of your billing period.' },
  { q: 'How does the free trial work?', a: 'Start with a 14-day free trial — no credit card required. Full access to all features on the plan you choose.' },
  { q: 'What counts as an "email account"?', a: 'Any Gmail, Outlook, or custom SMTP inbox you connect as a sending account. All plans include unlimited sending accounts.' },
  { q: 'Do you offer refunds?', a: 'Monthly plans: no refunds for partial months. Annual plans: full refund within 14 days if you\'ve sent fewer than 1,000 emails.' },
  { q: 'Can I upgrade or downgrade?', a: 'Yes, at any time. Upgrades take effect immediately. Downgrades take effect at your next billing cycle.' },
  { q: 'Is there a limit on team members?', a: 'Hypergrowth and above include unlimited team seats. Growth plan includes 1 user seat.' },
];

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>

        {/* Header */}
        <section className="border-b border-gray-100 py-16 text-center">
          <div className="container max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
              Simple, transparent pricing
            </h1>
            <p className="mt-4 text-gray-500 text-base leading-relaxed max-w-lg mx-auto">
              Start free for 14 days. No credit card required. Upgrade when you&apos;re ready.
            </p>

            {/* Billing toggle */}
            <div className="mt-8 flex items-center justify-center gap-3">
              <span className={`text-sm font-semibold ${!yearly ? 'text-gray-900' : 'text-gray-400'}`}>Monthly</span>
              <button
                onClick={() => setYearly(v => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${yearly ? 'bg-blue-600' : 'bg-gray-300'}`}
                aria-label="Toggle yearly billing">
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${yearly ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className={`text-sm font-semibold ${yearly ? 'text-gray-900' : 'text-gray-400'}`}>
                Yearly
                <span className="ml-2 text-[11px] font-bold bg-green-100 text-green-700 rounded-full px-2 py-0.5">Save 20%</span>
              </span>
            </div>
          </div>
        </section>

        {/* Plans */}
        <section className="py-16">
          <div className="container">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
              {plans.map((plan, i) => (
                <motion.div key={plan.name}
                  initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className={`relative rounded-2xl p-6 flex flex-col ${
                    plan.featured
                      ? 'bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-2xl ring-2 ring-blue-500 ring-offset-2 scale-[1.03] z-10'
                      : 'bg-white border border-gray-200 shadow-sm'
                  }`}>
                  {plan.featured && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-gray-900 text-white text-[11px] font-bold rounded-full px-3 py-1">Most Popular</span>
                    </div>
                  )}

                  <h3 className={`text-lg font-bold mb-1 ${plan.featured ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                  <p className={`text-xs mb-5 ${plan.featured ? 'text-blue-200' : 'text-gray-400'}`}>{plan.tagline}</p>

                  {/* Price */}
                  <div className="mb-5">
                    {plan.price.monthly !== null ? (
                      <>
                        <span className={`text-4xl font-extrabold ${plan.featured ? 'text-white' : 'text-gray-900'}`}>
                          ${yearly ? plan.price.yearly : plan.price.monthly}
                        </span>
                        <span className={`text-sm ml-1 ${plan.featured ? 'text-blue-200' : 'text-gray-400'}`}>/mo</span>
                        {yearly && (
                          <p className={`text-xs mt-1 ${plan.featured ? 'text-blue-200' : 'text-gray-400'}`}>
                            Billed ${(plan.price.yearly! * 12).toLocaleString()} yearly
                          </p>
                        )}
                      </>
                    ) : (
                      <span className={`text-4xl font-extrabold ${plan.featured ? 'text-white' : 'text-gray-900'}`}>Custom</span>
                    )}
                  </div>

                  {/* CTA */}
                  <Link href={plan.cta === 'Book a Call' ? '/contact' : '/signup'}
                    className={`w-full text-center text-sm font-bold rounded-full py-3 mb-6 transition-colors block ${
                      plan.featured
                        ? 'bg-white text-blue-700 hover:bg-blue-50'
                        : 'bg-gray-900 text-white hover:bg-gray-700'
                    }`}>
                    {plan.cta}
                  </Link>

                  {/* Features */}
                  <ul className="space-y-2.5 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2.5">
                        <svg className={`w-4 h-4 mt-0.5 shrink-0 ${plan.featured ? 'text-blue-200' : 'text-blue-600'}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                        </svg>
                        <span className={`text-sm ${plan.featured ? 'text-blue-100' : 'text-gray-600'}`}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>

            {/* Trust bar */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-400">
              {['14-day free trial', 'No credit card required', 'Cancel anytime', 'Instant setup'].map(item => (
                <span key={item} className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                  </svg>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Feature comparison table */}
        <section className="py-16 bg-gray-50">
          <div className="container max-w-4xl">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Compare Plans</h2>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-4 text-gray-500 font-semibold">Feature</th>
                    {['Growth', 'Hypergrowth', 'Light Speed', 'Enterprise'].map(p => (
                      <th key={p} className={`px-4 py-4 text-center font-bold ${p === 'Hypergrowth' ? 'text-blue-600' : 'text-gray-900'}`}>{p}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    { feature: 'Email Accounts',      vals: ['Unlimited', 'Unlimited', 'Unlimited', 'Unlimited'] },
                    { feature: 'Email Warmup',         vals: ['✓', '✓', '✓', '✓'] },
                    { feature: 'Monthly Emails',       vals: ['5,000', '100,000', '500,000', 'Unlimited'] },
                    { feature: 'Contacts',             vals: ['1,000', '25,000', '100,000', 'Unlimited'] },
                    { feature: 'Unibox',               vals: ['✓', '✓', '✓', '✓'] },
                    { feature: 'AI Personalisation',   vals: ['—', '✓', '✓', '✓'] },
                    { feature: 'Follow-up Sequences',  vals: ['3 steps', 'Unlimited', 'Unlimited', 'Unlimited'] },
                    { feature: 'Analytics & Tracking', vals: ['Basic', 'Advanced', 'Advanced', 'Custom'] },
                    { feature: 'API Access',           vals: ['—', '—', '✓', '✓'] },
                    { feature: 'Dedicated IPs',        vals: ['—', '—', '—', '✓'] },
                    { feature: 'Support',              vals: ['Chat', 'Live', 'Priority', 'Dedicated'] },
                  ].map(row => (
                    <tr key={row.feature} className="hover:bg-gray-50">
                      <td className="px-6 py-3.5 text-gray-700 font-medium">{row.feature}</td>
                      {row.vals.map((v, i) => (
                        <td key={i} className={`px-4 py-3.5 text-center ${v === '—' ? 'text-gray-300' : 'text-gray-700'} ${i === 1 ? 'font-semibold text-blue-700' : ''}`}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16">
          <div className="container max-w-3xl">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {faqs.map(faq => (
                <div key={faq.q} className="border border-gray-200 rounded-2xl p-6">
                  <h3 className="text-base font-bold text-gray-900 mb-2">{faq.q}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="hero-gradient py-20">
          <div className="container text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to start booking meetings?</h2>
            <p className="text-blue-100 text-base mb-8 max-w-md mx-auto">Join 30,000+ teams using LeadGenie to scale cold email outreach.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/signup" className="bg-white text-blue-700 font-bold text-sm rounded-full px-8 py-3.5 hover:bg-blue-50 transition-colors shadow-lg">
                Start Free Trial
              </Link>
              <Link href="/contact" className="border border-white/30 text-white font-semibold text-sm rounded-full px-8 py-3.5 hover:bg-white/10 transition-colors">
                Talk to Sales
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}

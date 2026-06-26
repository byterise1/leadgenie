'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

type Plan = {
  id: string;
  name: string;
  tagline: string;
  monthly_price: number;
  annual_price: number;
  features: string[];
  highlighted: boolean;
  cta_label: string;
  active?: boolean;
};

const FALLBACK_PLANS: Plan[] = [
  {
    id: 'free', name: 'Free', tagline: 'Get started at no cost',
    monthly_price: 0, annual_price: 0,
    features: ['3 campaigns', '500 leads', '91 emails per mo', '1 email account', 'Built-in templates', 'Basic analytics'],
    highlighted: false, cta_label: 'Current Plan',
  },
  {
    id: 'starter', name: 'Starter', tagline: 'For solo founders and small teams',
    monthly_price: 29, annual_price: 23,
    features: ['10 campaigns', '5000 leads', '5000 emails per mo', '5 email accounts', 'Full analytics', 'Chat support'],
    highlighted: false, cta_label: 'Start Free Trial',
  },
  {
    id: 'pro', name: 'Pro', tagline: 'Most popular for growing teams',
    monthly_price: 49, annual_price: 39,
    features: ['Unlimited campaigns', 'Unlimited leads', '50000 emails per mo', 'Unlimited accounts', 'AI email writer', 'A/B testing', 'Priority support'],
    highlighted: true, cta_label: 'Start Free Trial',
  },
  {
    id: 'growth', name: 'Growth', tagline: 'Everything in Pro, built for scale',
    monthly_price: 99, annual_price: 79,
    features: ['Everything in Pro', '5 workspaces', 'Advanced analytics', 'Dedicated account manager', 'Custom integrations'],
    highlighted: false, cta_label: 'Start Free Trial',
  },
  {
    id: 'agency', name: 'Agency', tagline: 'For high-volume outreach teams',
    monthly_price: 149, annual_price: 119,
    features: ['Everything in Growth', 'Unlimited workspaces', 'White-label reports', 'Dedicated CSM', 'SLA guarantee', 'Onboarding session'],
    highlighted: false, cta_label: 'Contact Sales',
  },
];

const faqs = [
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel at any time from your account dashboard. You keep access until the end of your billing period.' },
  { q: 'How does the free trial work?', a: 'Start with full access — no credit card required. Upgrade when you\'re ready to send at scale.' },
  { q: 'What counts as an "email account"?', a: 'Any Gmail, Outlook, or custom SMTP inbox you connect as a sending account. All plans include unlimited accounts.' },
  { q: 'Do you offer refunds?', a: 'Monthly plans: no refunds for partial months. Annual plans: full refund within 14 days if you\'ve sent fewer than 1,000 emails.' },
  { q: 'Can I upgrade or downgrade?', a: 'Yes, at any time. Upgrades take effect immediately. Downgrades take effect at your next billing cycle.' },
  { q: 'Is there a limit on team members?', a: 'Pro and Agency plans include unlimited team seats.' },
];

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/pricing', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setPlans([...data].sort((a, b) => a.monthly_price - b.monthly_price));
        } else {
          setPlans(FALLBACK_PLANS);
        }
      })
      .catch(() => setPlans(FALLBACK_PLANS))
      .finally(() => setLoading(false));
  }, []);

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
              Start free. No credit card required. Upgrade when you&apos;re ready to scale.
            </p>

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
            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5 max-w-7xl mx-auto">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 animate-pulse">
                    <div className="h-5 w-20 bg-gray-100 rounded"/>
                    <div className="h-3 w-32 bg-gray-100 rounded"/>
                    <div className="h-10 w-24 bg-gray-100 rounded"/>
                    <div className="h-10 bg-gray-100 rounded-full"/>
                    {[1,2,3,4,5].map(j => <div key={j} className="h-3 bg-gray-100 rounded w-full"/>)}
                  </div>
                ))}
              </div>
            ) : (
            <div className={`grid gap-5 items-start mx-auto ${plans.length <= 3 ? 'max-w-5xl sm:grid-cols-3' : plans.length === 4 ? 'max-w-6xl sm:grid-cols-2 lg:grid-cols-4' : 'max-w-7xl sm:grid-cols-2 lg:grid-cols-5'}`}>
              {plans.map((plan, i) => (
                <motion.div key={plan.id}
                  initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className={`relative rounded-2xl p-6 flex flex-col ${
                    plan.highlighted
                      ? 'bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-2xl ring-2 ring-blue-500 ring-offset-2 scale-[1.03] z-10'
                      : 'bg-white border border-gray-200 shadow-sm'
                  }`}>
                  {plan.highlighted && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-gray-900 text-white text-[11px] font-bold rounded-full px-3 py-1">Most Popular</span>
                    </div>
                  )}

                  <h3 className={`text-lg font-bold mb-1 ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                  <p className={`text-xs mb-5 ${plan.highlighted ? 'text-blue-200' : 'text-gray-400'}`}>{plan.tagline}</p>

                  <div className="mb-5">
                    <span className={`text-4xl font-extrabold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                      ${yearly ? plan.annual_price : plan.monthly_price}
                    </span>
                    <span className={`text-sm ml-1 ${plan.highlighted ? 'text-blue-200' : 'text-gray-400'}`}>/mo</span>
                    {yearly && plan.annual_price !== plan.monthly_price && (
                      <p className={`text-xs mt-1 ${plan.highlighted ? 'text-blue-200' : 'text-gray-400'}`}>
                        Billed ${(plan.annual_price * 12).toLocaleString()} yearly
                      </p>
                    )}
                  </div>

                  <Link href="/signup"
                    className={`w-full text-center text-sm font-bold rounded-full py-3 mb-6 transition-colors block ${
                      plan.highlighted
                        ? 'bg-white text-blue-700 hover:bg-blue-50'
                        : 'bg-gray-900 text-white hover:bg-gray-700'
                    }`}>
                    {plan.cta_label}
                  </Link>

                  <ul className="space-y-2.5 flex-1">
                    {(Array.isArray(plan.features) ? plan.features : []).map((f: string) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <svg className={`w-4 h-4 mt-0.5 shrink-0 ${plan.highlighted ? 'text-blue-200' : 'text-blue-600'}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                        </svg>
                        <span className={`text-sm ${plan.highlighted ? 'text-blue-100' : 'text-gray-600'}`}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
            )}
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

        {/* FAQ */}
        <section className="py-16 bg-gray-50">
          <div className="container max-w-3xl">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {faqs.map(faq => (
                <div key={faq.q} className="border border-gray-200 rounded-2xl p-6 bg-white">
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
            <p className="text-blue-100 text-base mb-8 max-w-md mx-auto">Join thousands of teams using LeadGenie to scale cold email outreach.</p>
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

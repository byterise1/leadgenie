'use client';

import Link from 'next/link';
import { useState } from 'react';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '/mo',
    current: true,
    tag: null,
    color: 'border-gray-200',
    features: ['3 campaigns', '500 leads', '1,000 emails/mo', '1 email account', 'Built-in templates'],
    limits: [
      { label: 'Campaigns', used: 0, max: 3 },
      { label: 'Leads', used: 0, max: 500 },
      { label: 'Emails this month', used: 0, max: 1000 },
    ],
    cta: null,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$49',
    period: '/mo',
    current: false,
    tag: 'Most Popular',
    color: 'border-blue-500',
    features: ['Unlimited campaigns', 'Unlimited leads', '50,000 emails/mo', 'Unlimited accounts', 'AI writing assistant', 'A/B testing', 'Priority support'],
    limits: null,
    cta: 'Upgrade to Pro',
  },
  {
    id: 'agency',
    name: 'Agency',
    price: '$149',
    period: '/mo',
    current: false,
    tag: null,
    color: 'border-gray-200',
    features: ['Everything in Pro', 'Multi-workspace', 'White-label reports', 'Dedicated success manager', 'Custom integrations', 'SLA guarantee'],
    limits: null,
    cta: 'Contact Sales',
  },
];

export default function BillingPage() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  return (
    <main className="flex-1 p-6 space-y-8 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Plan & Billing</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your subscription, usage, and payment details.</p>
      </div>

      {/* Current plan summary */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Current Plan</p>
            <div className="flex items-center gap-3">
              <p className="text-2xl font-extrabold text-gray-900">Free</p>
              <span className="text-xs font-bold text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">FREE</span>
            </div>
            <p className="text-sm text-gray-400 mt-1">$0/mo · Renews never</p>
          </div>
          <Link href="#plans" className="text-sm font-bold text-blue-600 border border-blue-200 rounded-xl px-4 py-2 hover:bg-blue-50 transition-colors">
            View plans ↓
          </Link>
        </div>

        {/* Usage meters */}
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            { label: 'Campaigns', used: 0, max: 3, icon: '📧' },
            { label: 'Leads', used: 0, max: 500, icon: '👥' },
            { label: 'Emails this month', used: 0, max: 1000, icon: '✉️' },
          ].map(m => (
            <div key={m.label} className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-600">{m.label}</span>
                <span className="text-xs font-bold text-gray-900">{m.used} <span className="text-gray-400 font-normal">/ {m.max}</span></span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${m.used / m.max > 0.8 ? 'bg-red-500' : m.used / m.max > 0.5 ? 'bg-amber-400' : 'bg-blue-500'}`}
                  style={{ width: `${Math.max(2, (m.used / m.max) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">{m.max - m.used} remaining</p>
            </div>
          ))}
        </div>
      </div>

      {/* Plans toggle */}
      <div id="plans">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-900">Choose a Plan</h2>
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {(['monthly', 'annual'] as const).map(b => (
              <button key={b} onClick={() => setBilling(b)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${billing === b ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                {b === 'monthly' ? 'Monthly' : 'Annual · 20% off'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {PLANS.map(plan => (
            <div key={plan.id}
              className={`bg-white rounded-2xl border-2 p-6 flex flex-col ${plan.color} ${plan.current ? 'relative' : ''}`}>
              {plan.current && (
                <span className="absolute -top-3 left-5 text-[10px] font-bold bg-emerald-500 text-white rounded-full px-2.5 py-1">Current plan</span>
              )}
              {plan.tag && (
                <span className="absolute -top-3 left-5 text-[10px] font-bold bg-blue-600 text-white rounded-full px-2.5 py-1">{plan.tag}</span>
              )}

              <div className="mb-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{plan.name}</p>
                <div className="flex items-end gap-1">
                  <p className="text-2xl font-extrabold text-gray-900">
                    {billing === 'annual' && plan.id !== 'free'
                      ? `$${Math.round(parseInt(plan.price.replace('$', '')) * 0.8)}`
                      : plan.price}
                  </p>
                  <p className="text-sm text-gray-400 mb-0.5">{plan.period}</p>
                </div>
                {billing === 'annual' && plan.id !== 'free' && (
                  <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Save 20% annually</p>
                )}
              </div>

              <ul className="space-y-2 flex-1 mb-5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                    <svg className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {plan.current ? (
                <div className="text-center text-xs font-bold text-gray-400 border border-gray-100 rounded-xl py-2.5">
                  Current plan
                </div>
              ) : (
                <button className={`w-full text-sm font-bold rounded-xl py-2.5 transition-colors ${
                  plan.id === 'pro'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}>
                  {plan.cta} →
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Billing details */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-5">Billing Details</h2>
        <div className="grid sm:grid-cols-2 gap-8">
          <div className="space-y-4">
            {[
              { label: 'Next billing date', value: '—', note: 'No active subscription' },
              { label: 'Payment method', value: 'Not added', note: 'Add a card to upgrade' },
              { label: 'Billing email', value: '—', note: 'Invoices sent here' },
            ].map(r => (
              <div key={r.label} className="flex items-start justify-between pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                <div>
                  <p className="text-xs font-semibold text-gray-500">{r.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{r.note}</p>
                </div>
                <span className="text-sm font-semibold text-gray-700">{r.value}</span>
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 mb-3">Invoices</p>
            <div className="flex flex-col items-center justify-center h-24 bg-gray-50 rounded-xl">
              <p className="text-sm font-semibold text-gray-400">No invoices yet</p>
              <p className="text-xs text-gray-400 mt-0.5">Invoices appear after your first payment</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

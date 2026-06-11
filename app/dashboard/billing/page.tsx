'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

type Cycle = 'monthly' | 'annual';

type Usage = {
  plan: string;
  credits_used: number;
  credits_total: number;
  usage: {
    campaigns: { used: number; max: number };
    leads: { used: number; max: number };
    emails: { used: number; max: number };
    accounts: { used: number; max: number };
  };
};

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    monthly: 0,
    annual: 0,
    highlight: false,
    cta: 'Current plan',
    features: ['3 campaigns', '500 leads', '1,000 emails / mo', '1 email account', 'Built-in templates', 'Basic analytics'],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthly: 49,
    annual: 39,
    highlight: true,
    cta: 'Upgrade to Pro',
    features: ['Unlimited campaigns', 'Unlimited leads', '50,000 emails / mo', 'Unlimited accounts', 'AI email writer', 'A/B testing', 'Unibox (all replies)', 'Priority support'],
  },
  {
    id: 'agency',
    name: 'Agency',
    monthly: 149,
    annual: 119,
    highlight: false,
    cta: 'Contact Sales',
    features: ['Everything in Pro', 'Multi-workspace', 'White-label reports', 'Dedicated CSM', 'Custom integrations', 'SLA guarantee', 'Onboarding session'],
  },
];

function UsageBar({ used, max, label }: { used: number; max: number; label: string }) {
  const pct = max === Infinity ? 0 : max === 0 ? 0 : Math.max(2, (used / max) * 100);
  const remaining = max === Infinity ? '∞' : String(max - used);
  const maxLabel = max === Infinity ? '∞' : String(max);
  const warn = max !== Infinity && pct > 80;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        <span className="text-xs font-bold text-gray-700">{used}<span className="text-gray-400 font-normal">/{maxLabel}</span></span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${warn ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, pct)}%` }}/>
      </div>
      <p className="text-[10px] text-gray-400">{remaining} remaining</p>
    </div>
  );
}

export default function BillingPage() {
  const [cycle, setCycle] = useState<Cycle>('monthly');
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    fetch('/api/billing/usage')
      .then(r => r.json())
      .then(data => { if (!data.error) setUsage(data); })
      .catch(() => {});
  }, []);

  const currentPlan = usage?.plan || 'free';

  return (
    <main className="flex-1 p-6 space-y-7">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Plan & Billing</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your subscription, usage, and payment details.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-extrabold text-gray-900 capitalize">{currentPlan} Plan</p>
                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 uppercase tracking-wide">{currentPlan}</span>
              </div>
              <p className="text-sm text-gray-400 mt-0.5">{currentPlan === 'free' ? '$0 / month · No expiry' : 'Active subscription'}</p>
            </div>
          </div>
          <Link href="#plans"
            className="self-start sm:self-auto inline-flex items-center gap-1.5 text-sm font-bold text-white bg-blue-600 rounded-xl px-5 py-2.5 hover:bg-blue-700 transition-colors">
            Upgrade plan
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {usage ? (
            <>
              <UsageBar label="Campaigns" used={usage.usage.campaigns.used} max={usage.usage.campaigns.max} />
              <UsageBar label="Leads" used={usage.usage.leads.used} max={usage.usage.leads.max} />
              <UsageBar label="Emails / mo" used={usage.usage.emails.used} max={usage.usage.emails.max} />
              <UsageBar label="Email accounts" used={usage.usage.accounts.used} max={usage.usage.accounts.max} />
            </>
          ) : (
            [1,2,3,4].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3"/>
                <div className="h-1.5 bg-gray-100 rounded-full"/>
                <div className="h-2 bg-gray-100 rounded animate-pulse w-1/2"/>
              </div>
            ))
          )}
        </div>
      </div>

      <div id="plans" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Choose your plan</h2>
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {(['monthly', 'annual'] as Cycle[]).map(c => (
              <button key={c} onClick={() => setCycle(c)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${cycle === c ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {c === 'monthly' ? 'Monthly' : 'Annual · 20% off'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {PLANS.map(plan => {
            const price = cycle === 'annual' ? plan.annual : plan.monthly;
            const isCurrent = plan.id === currentPlan;
            return (
              <div key={plan.id}
                className={`relative rounded-2xl border-2 p-6 flex flex-col bg-white transition-shadow ${
                  plan.highlight ? 'border-blue-500 shadow-lg shadow-blue-100' : 'border-gray-200'
                }`}>
                {plan.highlight && !isCurrent && (
                  <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                    <span className="text-[10px] font-extrabold text-white bg-blue-600 rounded-full px-3 py-1 uppercase tracking-wide">Most Popular</span>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                    <span className="text-[10px] font-extrabold text-white bg-emerald-500 rounded-full px-3 py-1">Current Plan</span>
                  </div>
                )}
                <div className="mb-5">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{plan.name}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-extrabold text-gray-900">${price}</span>
                    <span className="text-sm text-gray-400 mb-1">/mo</span>
                  </div>
                  {cycle === 'annual' && plan.id !== 'free' && (
                    <p className="text-[11px] text-emerald-600 font-semibold mt-1">Save ${(plan.monthly - plan.annual) * 12}/yr</p>
                  )}
                </div>
                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-xs text-gray-600">
                      <svg className={`w-3.5 h-3.5 shrink-0 ${plan.highlight ? 'text-blue-500' : 'text-emerald-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button disabled={isCurrent}
                  className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    isCurrent ? 'bg-gray-100 text-gray-400 cursor-default' :
                    plan.highlight ? 'bg-blue-600 text-white hover:bg-blue-700' :
                    'border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}>
                  {isCurrent ? 'Current plan' : plan.cta}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Payment Method</h2>
          <div className="flex items-center gap-4 p-4 border border-dashed border-gray-200 rounded-xl mb-4">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-700">No payment method</p>
              <p className="text-xs text-gray-400">Add a card to upgrade your plan</p>
            </div>
          </div>
          <button className="w-full border border-gray-200 text-sm font-semibold text-gray-700 rounded-xl py-2.5 hover:bg-gray-50 transition-colors">
            + Add payment method
          </button>
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
            {[{ label: 'Next billing date', value: '—' }, { label: 'Billing email', value: '—' }].map(r => (
              <div key={r.label} className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{r.label}</span>
                <span className="text-xs font-semibold text-gray-700">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900">Invoice History</h2>
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-500">No invoices yet</p>
            <p className="text-xs text-gray-400 mt-0.5">Invoices appear here after your first payment</p>
          </div>
        </div>
      </div>
    </main>
  );
}

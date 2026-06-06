'use client';

import Link from 'next/link';
import { useState } from 'react';

const steps = ['Details', 'Sequence', 'Schedule', 'Review'];

export default function NewCampaignPage() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [emails, setEmails] = useState([{ subject: '', body: '', delay: 0 }]);

  const addStep = () => setEmails(e => [...e, { subject: '', body: '', delay: 3 }]);

  return (
    <main className="flex-1 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/campaigns" className="text-gray-400 hover:text-gray-700 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">New Campaign</h1>
          <p className="text-sm text-gray-400">Set up your cold email sequence</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center">
            <button onClick={() => setStep(i)} className="flex items-center gap-2">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < step ? 'bg-blue-600 text-white' : i === step ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-100 text-gray-400'
              }`}>
                {i < step ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg> : i + 1}
              </span>
              <span className={`text-sm font-semibold ${i === step ? 'text-gray-900' : 'text-gray-400'}`}>{s}</span>
            </button>
            {i < steps.length - 1 && <div className={`w-12 h-0.5 mx-2 ${i < step ? 'bg-blue-600' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      <div className="max-w-2xl">
        {/* Step 0 — Details */}
        {step === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Campaign Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. SaaS Founders Q3 Outreach"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">From Email Account</label>
              <div className="border border-dashed border-gray-200 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-400 mb-3">No email accounts connected yet</p>
                <Link href="/dashboard/email-accounts" className="text-xs font-bold text-blue-600 hover:underline">
                  + Connect an email account first
                </Link>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Daily Sending Limit</label>
              <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option>50 emails / day</option>
                <option>100 emails / day</option>
                <option>200 emails / day</option>
                <option>500 emails / day</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Campaign Goal</label>
              <div className="grid grid-cols-3 gap-3">
                {['Book a Meeting', 'Demo Request', 'Partnership'].map(g => (
                  <button key={g} className="border border-gray-200 rounded-xl py-2.5 text-xs font-semibold text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 1 — Sequence */}
        {step === 1 && (
          <div className="space-y-4">
            {emails.map((email, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                    <span className="text-sm font-bold text-gray-900">{idx === 0 ? 'Initial Email' : `Follow-up ${idx}`}</span>
                  </div>
                  {idx > 0 && (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>Send after</span>
                      <select className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white">
                        {[1,2,3,5,7,14].map(d => <option key={d} value={d}>{d} days</option>)}
                      </select>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <input placeholder="Subject line" value={email.subject}
                    onChange={e => setEmails(em => em.map((x, i) => i === idx ? {...x, subject: e.target.value} : x))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
                  <textarea rows={5} placeholder="Email body... Use {{first_name}}, {{company}}, {{title}} for personalization"
                    value={email.body}
                    onChange={e => setEmails(em => em.map((x, i) => i === idx ? {...x, body: e.target.value} : x))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"/>
                </div>
              </div>
            ))}
            <button onClick={addStep}
              className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-4 text-sm font-semibold text-gray-400 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all">
              + Add Follow-up Step
            </button>
          </div>
        )}

        {/* Step 2 — Schedule */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
              <input type="date" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"/>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Sending Hours</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1">From</p>
                  <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500">
                    {['8:00 AM','9:00 AM','10:00 AM'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">To</p>
                  <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500">
                    {['5:00 PM','6:00 PM','7:00 PM'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Active Days</label>
              <div className="flex gap-2">
                {['M','T','W','Th','F','Sa','Su'].map((d, i) => (
                  <button key={d} className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${i < 5 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{d}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Timezone</label>
              <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500">
                <option>UTC (Coordinated Universal Time)</option>
                <option>EST (Eastern Standard Time)</option>
                <option>PST (Pacific Standard Time)</option>
                <option>GMT (Greenwich Mean Time)</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 3 — Review */}
        {step === 3 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            <h3 className="font-bold text-gray-900">Campaign Summary</h3>
            <div className="divide-y divide-gray-100">
              {[
                { label: 'Campaign Name', value: name || '—' },
                { label: 'Email Steps', value: `${emails.length} email${emails.length > 1 ? 's' : ''}` },
                { label: 'Daily Limit', value: '50 emails / day' },
                { label: 'Sending Days', value: 'Mon–Fri' },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between py-3">
                  <span className="text-sm text-gray-500">{r.label}</span>
                  <span className="text-sm font-semibold text-gray-900">{r.value}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700 font-medium">
              ⚠️ Connect an email account before launching.
            </div>
            <button className="w-full bg-blue-600 text-white font-bold text-sm rounded-xl py-3 hover:bg-blue-700 transition-colors">
              Launch Campaign →
            </button>
          </div>
        )}

        {/* Nav buttons */}
        <div className="flex items-center justify-between mt-6">
          <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            ← Back
          </button>
          {step < steps.length - 1 && (
            <button onClick={() => setStep(s => s + 1)}
              className="px-5 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
              Continue →
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

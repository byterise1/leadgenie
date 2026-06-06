'use client';

import { useState } from 'react';

const tabs = [
  { id: 'profile', label: 'Profile', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg> },
  { id: 'sending', label: 'Sending Defaults', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg> },
  { id: 'notifications', label: 'Notifications', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg> },
  { id: 'billing', label: 'Plan & Billing', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg> },
];

function Toggle({ defaultOn = false }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button onClick={() => setOn(v => !v)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${on ? 'bg-blue-600' : 'bg-gray-200'}`}>
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`}/>
    </button>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState('profile');

  return (
    <main className="flex-1 p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your account and preferences.</p>
      </div>

      <div className="flex gap-8">
        {/* Side tabs */}
        <nav className="w-52 shrink-0 space-y-0.5">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === t.id ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}>
              <span className={tab === t.id ? 'text-blue-600' : 'text-gray-400'}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 max-w-xl">

          {/* ── Profile ── */}
          {tab === 'profile' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
              <h2 className="text-base font-bold text-gray-900">Profile Information</h2>

              {/* Avatar */}
              <div className="flex items-center gap-4 pb-5 border-b border-gray-100">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold select-none">U</div>
                <div>
                  <button className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">Change photo</button>
                  <p className="text-xs text-gray-400 mt-0.5">JPG or PNG, max 2 MB</p>
                </div>
              </div>

              {[
                { label: 'Full Name', placeholder: 'John Smith', type: 'text' },
                { label: 'Email Address', placeholder: 'you@company.com', type: 'email' },
                { label: 'Company Name', placeholder: 'Acme Inc.', type: 'text' },
                { label: 'Website', placeholder: 'https://yoursite.com', type: 'url' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
                </div>
              ))}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Timezone</label>
                <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 transition">
                  {['UTC', 'US/Eastern (EST)', 'US/Pacific (PST)', 'Europe/London (GMT)', 'Asia/Karachi (PKT)', 'Asia/Dubai (GST)'].map(tz => (
                    <option key={tz}>{tz}</option>
                  ))}
                </select>
              </div>

              <button className="w-full bg-blue-600 text-white font-semibold text-sm rounded-xl py-3 hover:bg-blue-700 transition-colors">
                Save Changes
              </button>
            </div>
          )}

          {/* ── Sending Defaults ── */}
          {tab === 'sending' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
              <h2 className="text-base font-bold text-gray-900">Sending Defaults</h2>
              <p className="text-sm text-gray-400 -mt-2">These apply to all new campaigns unless overridden.</p>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Default "From" Name</label>
                <input placeholder="John at Acme" type="text"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Daily Email Limit</label>
                  <input type="number" defaultValue={50} min={1} max={500}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"/>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Min Delay (mins)</label>
                  <input type="number" defaultValue={5} min={1}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"/>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sending Hours</label>
                <div className="grid grid-cols-2 gap-3">
                  {[{ label: 'From', val: '08:00' }, { label: 'To', val: '18:00' }].map(t => (
                    <div key={t.label}>
                      <p className="text-xs text-gray-400 mb-1">{t.label}</p>
                      <input type="time" defaultValue={t.val}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"/>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Active Days</p>
                <div className="flex gap-2">
                  {['Mo','Tu','We','Th','Fr','Sa','Su'].map((d, i) => (
                    <button key={d} className={`w-9 h-9 rounded-full text-xs font-bold border transition-all ${i < 5 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-400 border-gray-200 hover:border-blue-300'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Email warmup</p>
                  <p className="text-xs text-gray-400">Auto-warm connected accounts</p>
                </div>
                <Toggle defaultOn />
              </div>

              <button className="w-full bg-blue-600 text-white font-semibold text-sm rounded-xl py-3 hover:bg-blue-700 transition-colors">
                Save Defaults
              </button>
            </div>
          )}

          {/* ── Notifications ── */}
          {tab === 'notifications' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-1">
              <h2 className="text-base font-bold text-gray-900 mb-4">Notification Preferences</h2>
              {[
                { label: 'New reply received', desc: 'When a prospect replies to any campaign', on: true },
                { label: 'Campaign completed', desc: 'When a campaign finishes sending', on: true },
                { label: 'Warmup health alert', desc: 'When warmup score drops below 80%', on: false },
                { label: 'Lead opens email', desc: 'Real-time open tracking notification', on: false },
                { label: 'Weekly performance report', desc: 'Summary email every Monday morning', on: true },
                { label: 'Unsubscribe received', desc: 'When a lead unsubscribes from your list', on: false },
              ].map(n => (
                <div key={n.label} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{n.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{n.desc}</p>
                  </div>
                  <Toggle defaultOn={n.on} />
                </div>
              ))}
            </div>
          )}

          {/* ── Billing ── */}
          {tab === 'billing' && (
            <div className="space-y-4">
              {/* Current plan */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Current Plan</h3>
                    <p className="text-sm text-gray-400 mt-0.5">Free — limited to 1 account & 500 leads</p>
                  </div>
                  <span className="bg-gray-100 text-gray-500 text-xs font-bold rounded-full px-3 py-1.5">FREE</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-5">
                  {[
                    { label: 'Email Accounts', val: '1 / 1', pct: 100 },
                    { label: 'Leads', val: '0 / 500', pct: 0 },
                    { label: 'Campaigns', val: '0 / 3', pct: 0 },
                    { label: 'Emails Sent', val: '0 / 1,000', pct: 0 },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{s.label}</p>
                      <p className="text-sm font-bold text-gray-900 mb-2">{s.val}</p>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${s.pct}%` }}/>
                      </div>
                    </div>
                  ))}
                </div>
                <a href="/pricing"
                  className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm rounded-xl py-3 hover:opacity-90 transition-opacity">
                  Upgrade to Pro — Unlimited Everything →
                </a>
              </div>

              {/* Pro plan preview */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-sm font-bold text-gray-900 mb-4">What you get with Pro</h3>
                <div className="space-y-2.5">
                  {[
                    'Unlimited email accounts',
                    'Unlimited leads & campaigns',
                    'Advanced analytics & reporting',
                    'AI-powered email writer',
                    'Unibox for all replies',
                    'Priority support',
                  ].map(f => (
                    <div key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                      <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}

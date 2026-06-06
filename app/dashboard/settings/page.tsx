'use client';

import { useState } from 'react';

const tabs = ['Profile', 'Notifications', 'Billing', 'API Keys', 'Team'];

export default function SettingsPage() {
  const [tab, setTab] = useState('Profile');

  return (
    <main className="flex-1 p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your account and preferences.</p>
      </div>

      <div className="flex gap-8">
        {/* Side tabs */}
        <nav className="w-44 shrink-0 space-y-1">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === t ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}>
              {t}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 max-w-xl">
          {tab === 'Profile' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
              <h2 className="text-base font-bold text-gray-900 mb-1">Profile Information</h2>
              <div className="flex items-center gap-4 pb-5 border-b border-gray-100">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">U</div>
                <div>
                  <button className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">Change avatar</button>
                  <p className="text-xs text-gray-400 mt-0.5">JPG, PNG up to 2MB</p>
                </div>
              </div>
              {[
                { label: 'Full Name', placeholder: 'John Smith', type: 'text' },
                { label: 'Email Address', placeholder: 'you@company.com', type: 'email' },
                { label: 'Company', placeholder: 'Acme Inc.', type: 'text' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
                </div>
              ))}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Timezone</label>
                <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500">
                  <option>UTC (Coordinated Universal Time)</option>
                  <option>EST (Eastern Standard Time)</option>
                  <option>PST (Pacific Standard Time)</option>
                </select>
              </div>
              <button className="w-full bg-blue-600 text-white font-semibold text-sm rounded-xl py-3 hover:bg-blue-700 transition-colors">
                Save Changes
              </button>
            </div>
          )}

          {tab === 'Billing' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Current Plan</h3>
                    <p className="text-sm text-gray-400">Free Plan — Limited features</p>
                  </div>
                  <span className="bg-gray-100 text-gray-600 text-xs font-bold rounded-full px-3 py-1.5">FREE</span>
                </div>
                <div className="space-y-2 mb-5">
                  {['1 email account','500 leads','3 campaigns','Basic analytics'].map(f => (
                    <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                      {f}
                    </div>
                  ))}
                </div>
                <a href="/pricing" className="block text-center w-full bg-blue-600 text-white font-bold text-sm rounded-xl py-3 hover:bg-blue-700 transition-colors">
                  Upgrade to Pro →
                </a>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Payment Method</h3>
                <div className="flex flex-col items-center py-8 text-center">
                  <p className="text-sm text-gray-400 mb-4">No payment method on file</p>
                  <button className="text-sm font-semibold text-blue-600 hover:text-blue-700 border border-blue-200 rounded-xl px-5 py-2.5 hover:bg-blue-50 transition-colors">
                    + Add Payment Method
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'API Keys' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-gray-900">API Keys</h2>
                <button className="flex items-center gap-2 text-sm font-semibold text-blue-600 border border-blue-200 rounded-xl px-4 py-2 hover:bg-blue-50 transition-colors">
                  + Generate Key
                </button>
              </div>
              <div className="flex flex-col items-center py-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"/></svg>
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">No API keys yet</p>
                <p className="text-xs text-gray-400">Generate an API key to integrate LeadGenie with your tools.</p>
              </div>
            </div>
          )}

          {tab === 'Notifications' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
              <h2 className="text-base font-bold text-gray-900">Notification Preferences</h2>
              {[
                { label: 'New reply received', desc: 'Get notified when a prospect replies to your email' },
                { label: 'Campaign completed', desc: 'Alert when a campaign finishes sending' },
                { label: 'Warmup health alert', desc: 'Notify when warmup score drops below 80%' },
                { label: 'Weekly summary', desc: 'Receive weekly performance report via email' },
              ].map(n => (
                <div key={n.label} className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{n.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{n.desc}</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors shrink-0 ml-4">
                    <span className="inline-block h-4 w-4 translate-x-1 rounded-full bg-white shadow transition-transform"/>
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === 'Team' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-gray-900">Team Members</h2>
                <button className="flex items-center gap-2 text-sm font-semibold text-blue-600 border border-blue-200 rounded-xl px-4 py-2 hover:bg-blue-50 transition-colors">
                  + Invite Member
                </button>
              </div>
              <div className="flex flex-col items-center py-10 text-center">
                <p className="text-sm text-gray-400 mb-1">Team collaboration is a Pro feature.</p>
                <a href="/pricing" className="text-sm font-semibold text-blue-600 hover:underline">Upgrade to invite teammates →</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

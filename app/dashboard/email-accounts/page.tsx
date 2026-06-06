'use client';

import { useState } from 'react';

export default function EmailAccountsPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <main className="flex-1 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Email Accounts</h1>
          <p className="text-sm text-gray-400 mt-0.5">Connect sending accounts and manage warmup.</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-blue-700 transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          Connect Account
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Accounts', value: '0', color: 'blue' },
          { label: 'Warming Up', value: '0', color: 'amber' },
          { label: 'Avg Health Score', value: '—', color: 'emerald' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-400 mb-2">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Empty state */}
      <div className="bg-white rounded-2xl border border-gray-100 p-16 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-5">
          <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"/></svg>
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-2">No email accounts connected</h3>
        <p className="text-sm text-gray-400 mb-6 max-w-sm leading-relaxed">
          Connect Gmail, Outlook, or custom SMTP accounts to start sending campaigns and warmup your sender reputation.
        </p>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold rounded-xl px-5 py-3 hover:bg-blue-700 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Connect Gmail
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl px-5 py-3 hover:bg-gray-50 transition-colors">
            Connect Outlook
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl px-5 py-3 hover:bg-gray-50 transition-colors">
            Custom SMTP
          </button>
        </div>
      </div>

      {/* Connect modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold text-gray-900">Connect Email Account</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="space-y-3 mb-6">
              {[
                { name: 'Gmail / Google Workspace', desc: 'Connect via OAuth — no password needed', icon: '📧' },
                { name: 'Microsoft Outlook', desc: 'Connect Office 365 or Outlook.com', icon: '📩' },
                { name: 'Custom SMTP', desc: 'Use any email provider with SMTP', icon: '⚙️' },
              ].map(opt => (
                <button key={opt.name}
                  className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left">
                  <span className="text-2xl">{opt.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{opt.name}</p>
                    <p className="text-xs text-gray-400">{opt.desc}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                </button>
              ))}
            </div>
            <button onClick={() => setShowModal(false)} className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
          </div>
        </div>
      )}
    </main>
  );
}

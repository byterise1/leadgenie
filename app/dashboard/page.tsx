'use client';

import Link from 'next/link';

const stats = [
  { label: 'Active Campaigns', value: '0', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>, color: 'blue' },
  { label: 'Emails Sent', value: '0', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/></svg>, color: 'indigo' },
  { label: 'Avg Open Rate', value: '—', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>, color: 'emerald' },
  { label: 'Avg Reply Rate', value: '—', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"/></svg>, color: 'violet' },
];

const colorMap: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  violet: 'bg-violet-50 text-violet-600',
};

const quickActions = [
  { step: 1, label: 'Connect Email', desc: 'Add Gmail, SMTP or IMAP', href: '/dashboard/email-accounts', color: 'blue' },
  { step: 2, label: 'Import Leads', desc: 'Upload CSV or add manually', href: '/dashboard/leads', color: 'indigo' },
  { step: 3, label: 'New Campaign', desc: 'Launch a cold email sequence', href: '/dashboard/campaigns/new', color: 'emerald' },
  { step: 4, label: 'Check Inbox', desc: 'Read and reply to prospects', href: '/dashboard/inbox', color: 'violet' },
];

const stepColor: Record<string, { num: string; bar: string; text: string }> = {
  blue:    { num: 'bg-blue-600 text-white',    bar: 'bg-blue-100',    text: 'text-blue-600' },
  indigo:  { num: 'bg-indigo-600 text-white',  bar: 'bg-indigo-100',  text: 'text-indigo-600' },
  emerald: { num: 'bg-emerald-600 text-white', bar: 'bg-emerald-100', text: 'text-emerald-600' },
  violet:  { num: 'bg-violet-600 text-white',  bar: 'bg-violet-100',  text: 'text-violet-600' },
};

export default function DashboardPage() {
  return (
    <main className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Overview</h1>
          <p className="text-sm text-gray-400 mt-0.5">Here's what's happening with your outreach.</p>
        </div>
        <Link href="/dashboard/campaigns/new"
          className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-blue-700 transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          New Campaign
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-500">{s.label}</p>
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorMap[s.color]}`}>{s.icon}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">No data yet</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent campaigns */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Recent Campaigns</h2>
            <Link href="/dashboard/campaigns" className="text-xs font-semibold text-blue-600 hover:text-blue-700">View all →</Link>
          </div>
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">No campaigns yet</p>
            <p className="text-xs text-gray-400 mb-5 max-w-xs">Create your first cold email campaign to start generating replies and meetings.</p>
            <Link href="/dashboard/campaigns/new" className="text-xs font-bold bg-blue-600 text-white rounded-xl px-5 py-2.5 hover:bg-blue-700 transition-colors">
              Create Campaign →
            </Link>
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* AI Co-pilot */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>
              <p className="text-xs font-bold text-blue-200 uppercase tracking-wider">AI Co-pilot</p>
            </div>
            <p className="text-sm font-bold mb-1">Generate your first campaign</p>
            <p className="text-xs text-blue-200 mb-4 leading-relaxed">Describe your target audience and let AI write your sequences.</p>
            <Link href="/dashboard/campaigns/new" className="block text-center text-xs font-bold bg-white text-blue-700 rounded-xl py-2.5 hover:bg-blue-50 transition-colors">
              Start with AI →
            </Link>
          </div>

          {/* Quick Actions — numbered step cards */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</p>
            <div className="space-y-2">
              {quickActions.map(a => (
                <Link key={a.label} href={a.href}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all group">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0 ${stepColor[a.color].num}`}>
                    {a.step}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 leading-none mb-0.5">{a.label}</p>
                    <p className="text-[10px] text-gray-400 truncate">{a.desc}</p>
                  </div>
                  <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                </Link>
              ))}
            </div>
          </div>

          {/* Setup Checklist */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Setup Checklist</p>
            <div className="space-y-2.5">
              {[
                { label: 'Create account', done: true },
                { label: 'Connect email account', done: false },
                { label: 'Import leads', done: false },
                { label: 'Launch first campaign', done: false },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${item.done ? 'bg-emerald-500' : 'border-2 border-gray-200'}`}>
                    {item.done && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                  </span>
                  <span className={`text-xs ${item.done ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </main>
  );
}

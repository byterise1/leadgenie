'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const quickActions = [
  { step: 1, label: 'Connect Email', desc: 'Add Gmail, SMTP or IMAP', href: '/dashboard/email-accounts', color: 'blue' },
  { step: 2, label: 'Import Leads', desc: 'Upload CSV or add manually', href: '/dashboard/leads', color: 'indigo' },
  { step: 3, label: 'New Campaign', desc: 'Launch a cold email sequence', href: '/dashboard/campaigns/new', color: 'emerald' },
  { step: 4, label: 'Check Inbox', desc: 'Read and reply to prospects', href: '/dashboard/inbox', color: 'violet' },
];

const stepColor: Record<string, { num: string }> = {
  blue:    { num: 'bg-blue-600 text-white' },
  indigo:  { num: 'bg-indigo-600 text-white' },
  emerald: { num: 'bg-emerald-600 text-white' },
  violet:  { num: 'bg-violet-600 text-white' },
};

const CACHE_KEY = 'lg_overview_stats';

export default function DashboardPage() {
  const [stats, setStats] = useState<null | Record<string, any>>(null);

  useEffect(() => {
    try { const c = sessionStorage.getItem(CACHE_KEY); if (c) setStats(JSON.parse(c)); } catch {}
    const fetchStats = () => fetch('/api/dashboard/stats').then(r => r.json()).then(d => {
      if (!d.error) { setStats(d); try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch {} }
    });
    fetchStats();
    const id = setInterval(fetchStats, 30000);
    return () => clearInterval(id);
  }, []);

  const statCards = [
    { label: 'Active Campaigns', value: stats ? String(stats.activeCampaigns) : '—' },
    { label: 'Emails Sent', value: stats ? String(stats.totalSent) : '—' },
    { label: 'Avg Open Rate', value: stats?.openRate ?? '—' },
    { label: 'Avg Click Rate', value: stats?.clickRate ?? '—' },
    { label: 'Avg Reply Rate', value: stats?.replyRate ?? '—' },
  ];

  return (
    <main className="flex-1 p-6 space-y-6">
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

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-400 mb-3">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-1.5">{s.value === '0' || s.value === '—' ? 'No data yet' : 'All time'}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Recent Campaigns</h2>
            <Link href="/dashboard/campaigns" className="text-xs font-semibold text-blue-600 hover:text-blue-700">View all →</Link>
          </div>
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">
              {(stats?.activeCampaigns ?? 0) > 0 ? `${stats!.activeCampaigns} active campaign${stats!.activeCampaigns > 1 ? 's' : ''}` : 'No campaigns yet'}
            </p>
            <p className="text-xs text-gray-400 mb-5 max-w-xs">
              {(stats?.totalSent ?? 0) > 0 ? `${stats!.totalSent} emails sent total.` : 'Create your first cold email campaign to start generating replies and meetings.'}
            </p>
            <Link href="/dashboard/campaigns/new" className="text-xs font-bold bg-blue-600 text-white rounded-xl px-5 py-2.5 hover:bg-blue-700 transition-colors">
              Create Campaign →
            </Link>
          </div>
        </div>

        <div className="space-y-4">
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
        </div>
      </div>
    </main>
  );
}

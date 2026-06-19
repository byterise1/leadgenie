'use client';

import { useState, useEffect, useCallback } from 'react';
import { Skeleton } from '@/components/Skeleton';

const ranges = ['7 days', '30 days', '90 days', 'All time'];

type SortKey = 'newest' | 'oldest' | 'most_sent' | 'status';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'most_sent', label: 'Most sent' },
  { value: 'status', label: 'By status' },
];

type Campaign = {
  id: string;
  name: string;
  status: string;
  created_at: string;
  sent: number;
  opened: number;
  replied: number;
  clicked: number;
  open_rate: string;
  click_rate: string;
  reply_rate: string;
};

type Stats = {
  activeCampaigns: number;
  totalSent: number;
  openRate: string;
  clickRate: string;
  replyRate: string;
  bounceRate: string;
  totalLeads: number;
  campaigns: Campaign[];
};

const STATUS_ORDER: Record<string, number> = { active: 0, paused: 1, completed: 2, draft: 3 };

function sortCampaigns(campaigns: Campaign[], sort: SortKey): Campaign[] {
  const list = [...campaigns];
  if (sort === 'newest') return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  if (sort === 'oldest') return list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  if (sort === 'most_sent') return list.sort((a, b) => b.sent - a.sent);
  if (sort === 'status') return list.sort((a, b) => {
    const od = (STATUS_ORDER[a.status] ?? 4) - (STATUS_ORDER[b.status] ?? 4);
    return od !== 0 ? od : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  return list;
}

const CACHE_KEY = 'lg_analytics_stats_v2';

export default function AnalyticsPage() {
  const [range, setRange] = useState('30 days');
  const [sort, setSort] = useState<SortKey>('newest');
  const [stats, setStats] = useState<Stats | null>(null);

  const fetchStats = useCallback(() => {
    fetch('/api/dashboard/stats')
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setStats(data);
          try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    try { const c = sessionStorage.getItem(CACHE_KEY); if (c) setStats(JSON.parse(c)); } catch {}
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const kpis = [
    { label: 'Emails Sent', value: stats ? String(stats.totalSent) : '—' },
    { label: 'Open Rate', value: stats?.openRate ?? '—' },
    { label: 'Click Rate', value: stats?.clickRate ?? '—' },
    { label: 'Reply Rate', value: stats?.replyRate ?? '—' },
    { label: 'Bounce Rate', value: stats?.bounceRate ?? '—' },
  ];

  return (
    <main className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track your campaign performance.</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {ranges.map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${range === r ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-400 mb-3">{k.label}</p>
            {!stats ? <Skeleton className="h-7 w-16 mb-2" /> : <p className="text-2xl font-bold text-gray-900 mb-1">{k.value}</p>}
            <p className="text-xs text-gray-400">{stats && stats.totalSent === 0 ? 'No data yet' : 'All campaigns'}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <h3 className="text-sm font-bold text-gray-900">Campaign Breakdown</h3>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {SORT_OPTIONS.map(o => (
              <button key={o.value} onClick={() => setSort(o.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${sort === o.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Campaign', 'Created', 'Status', 'Sent', 'Opened', 'Open Rate', 'Clicked', 'Click Rate', 'Replied', 'Reply Rate'].map(col => (
                  <th key={col} className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!stats ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-5 py-4"><Skeleton className={`h-3.5 ${j === 0 ? 'w-32' : j === 1 ? 'w-20' : 'w-12'}`} /></td>
                    ))}
                  </tr>
                ))
              ) : stats.campaigns.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-14 text-center text-sm text-gray-400">
                    No campaign data yet. Launch a campaign to see analytics.
                  </td>
                </tr>
              ) : sortCampaigns(stats.campaigns, sort).map(c => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-sm font-semibold text-gray-900 max-w-[180px] truncate">{c.name}</td>
                  <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    <span className="block text-[10px] text-gray-300">{new Date(c.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-bold rounded-full px-2.5 py-1 border capitalize ${
                      c.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      c.status === 'paused' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                      c.status === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                      'bg-gray-100 text-gray-500 border-gray-200'
                    }`}>{c.status}</span>
                  </td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-700">{c.sent}</td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-700">{c.opened}</td>
                  <td className="px-5 py-3 text-sm font-semibold text-gray-900">{c.open_rate}</td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-700">{c.clicked ?? 0}</td>
                  <td className="px-5 py-3 text-sm font-semibold text-gray-900">{c.click_rate ?? '—'}</td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-700">{c.replied}</td>
                  <td className="px-5 py-3 text-sm font-semibold text-gray-900">{c.reply_rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

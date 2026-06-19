'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Skeleton } from '@/components/Skeleton';

type RangeKey = 'today' | '7d' | '30d' | '90d' | 'all' | 'custom';
type SortKey  = 'newest' | 'oldest' | 'most_sent' | 'status';

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: 'today', label: 'Today'        },
  { value: '7d',    label: 'Last 7 days'  },
  { value: '30d',   label: 'Last 30 days' },
  { value: '90d',   label: 'Last 90 days' },
  { value: 'all',   label: 'All time'     },
  { value: 'custom',label: 'Custom'       },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest',    label: 'Newest first' },
  { value: 'oldest',    label: 'Oldest first' },
  { value: 'most_sent', label: 'Most sent'    },
  { value: 'status',    label: 'By status'    },
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
  if (sort === 'newest')    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  if (sort === 'oldest')    return list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  if (sort === 'most_sent') return list.sort((a, b) => b.sent - a.sent);
  if (sort === 'status')    return list.sort((a, b) => {
    const od = (STATUS_ORDER[a.status] ?? 4) - (STATUS_ORDER[b.status] ?? 4);
    return od !== 0 ? od : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  return list;
}

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getRangeDates(range: RangeKey, customFrom: string, customTo: string): { from: string; to: string } | null {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay   = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

  if (range === 'all') return null;

  if (range === 'today') {
    return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
  }
  if (range === 'custom') {
    if (!customFrom || !customTo) return null;
    const from = startOfDay(new Date(customFrom + 'T12:00:00'));
    const to   = endOfDay(new Date(customTo + 'T12:00:00'));
    return { from: from.toISOString(), to: to.toISOString() };
  }
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const from = new Date(now.getTime() - days * 86400000);
  return { from: from.toISOString(), to: now.toISOString() };
}

const CACHE_KEY = 'lg_analytics_stats_v3';

export default function AnalyticsPage() {
  const [range, setRange]           = useState<RangeKey>('30d');
  const [sort, setSort]             = useState<SortKey>('newest');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');
  const [stats, setStats]           = useState<Stats | null>(null);
  const [loading, setLoading]       = useState(false);
  const intervalRef                 = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStats = useCallback((rangeKey: RangeKey, cfrom: string, cto: string) => {
    const dates = getRangeDates(rangeKey, cfrom, cto);
    const params = new URLSearchParams();
    if (dates) { params.set('from', dates.from); params.set('to', dates.to); }
    const url = '/api/dashboard/stats' + (params.size ? '?' + params.toString() : '');

    setLoading(true);
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setStats(data);
          if (rangeKey === 'all') {
            try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const startPolling = useCallback((rangeKey: RangeKey, cfrom: string, cto: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => fetchStats(rangeKey, cfrom, cto), 30000);
  }, [fetchStats]);

  useEffect(() => {
    if (range === 'all') {
      try { const c = sessionStorage.getItem(CACHE_KEY); if (c) setStats(JSON.parse(c)); } catch {}
    } else {
      setStats(null);
    }

    if (range === 'custom') {
      // Pre-fill to last 7 days when Custom is first clicked
      const now = new Date();
      const week = new Date(now); week.setDate(week.getDate() - 7);
      const from = week.toISOString().slice(0, 10);
      const to   = now.toISOString().slice(0, 10);
      setCustomFrom(from);
      setCustomTo(to);
      fetchStats('custom', from, to);
      startPolling('custom', from, to);
    } else {
      fetchStats(range, '', '');
      startPolling(range, '', '');
    }

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [range, fetchStats, startPolling]);

  const applyCustomRange = () => {
    if (!customFrom || !customTo) return;
    fetchStats('custom', customFrom, customTo);
    startPolling('custom', customFrom, customTo);
  };

  const rangeLabel = RANGE_OPTIONS.find(r => r.value === range)?.label ?? '';

  const kpis = [
    { label: 'Emails Sent',  value: stats ? String(stats.totalSent) : '—' },
    { label: 'Open Rate',    value: stats?.openRate   ?? '—' },
    { label: 'Click Rate',   value: stats?.clickRate  ?? '—' },
    { label: 'Reply Rate',   value: stats?.replyRate  ?? '—' },
    { label: 'Bounce Rate',  value: stats?.bounceRate ?? '—' },
  ];

  return (
    <main className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track your campaign performance.</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-wrap">
          {RANGE_OPTIONS.map(o => (
            <button key={o.value} onClick={() => setRange(o.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${range === o.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date picker */}
      {range === 'custom' && (
        <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-5 py-4 flex-wrap">
          <span className="text-xs font-semibold text-gray-400 shrink-0">Date range</span>
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"/>
          <span className="text-xs text-gray-400">to</span>
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
            min={customFrom}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"/>
          <button onClick={applyCustomRange} disabled={!customFrom || !customTo}
            className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40">
            Apply
          </button>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-400 mb-3">{k.label}</p>
            {loading && !stats ? <Skeleton className="h-7 w-16 mb-2" /> : <p className="text-2xl font-bold text-gray-900 mb-1">{k.value}</p>}
            <p className="text-xs text-gray-400">{stats && stats.totalSent === 0 ? 'No data for period' : rangeLabel}</p>
          </div>
        ))}
      </div>

      {/* Campaign breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-900">Campaign Breakdown</h3>
            {loading && <span className="text-[10px] font-semibold text-blue-500 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">Updating…</span>}
            {!loading && range !== 'all' && stats && (
              <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">
                {rangeLabel}{range === 'custom' && customFrom ? `: ${customFrom} → ${customTo}` : ''}
              </span>
            )}
          </div>
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
              ) : (() => {
                const filtered = range === 'all'
                  ? sortCampaigns(stats.campaigns, sort)
                  : sortCampaigns(stats.campaigns.filter(c => c.sent > 0), sort);

                if (filtered.length === 0) {
                  const periodLabel =
                    range === 'today'  ? 'today' :
                    range === '7d'     ? 'in the last 7 days' :
                    range === '30d'    ? 'in the last 30 days' :
                    range === '90d'    ? 'in the last 90 days' :
                    range === 'custom' && customFrom
                      ? `between ${new Date(customFrom + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} and ${new Date(customTo + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                      : 'in this period';
                  return (
                    <tr>
                      <td colSpan={10} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                          <p className="text-sm font-semibold text-gray-500">No emails sent {periodLabel}</p>
                          <p className="text-xs text-gray-400">Try a different date range to see campaign data.</p>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return filtered.map(c => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-sm font-semibold text-gray-900 max-w-[180px] truncate">{c.name}</td>
                  <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    <span className="block text-[10px] text-gray-300">{new Date(c.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-bold rounded-full px-2.5 py-1 border capitalize ${
                      c.status === 'active'    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      c.status === 'paused'    ? 'bg-amber-50 text-amber-700 border-amber-100' :
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
              ));
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';

type Campaign = {
  id: string;
  user_id: string;
  user_name: string;
  name: string;
  status: string;
  sent: number;
  open_rate: string;
  reply_rate: string;
  daily_limit: number;
  created_at: string;
};

type Counts = { active: number; paused: number; completed: number; draft: number };

const STATUS_FILTERS = ['', 'active', 'paused', 'completed', 'draft'];
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400',
  paused: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400',
  completed: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400',
  draft: 'bg-gray-100 dark:bg-gray-800 text-gray-500',
};

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    fetch('/api/admin/campaigns?counts=1')
      .then(r => r.json())
      .then(d => { if (d.counts) setCounts(d.counts); })
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(page) });
    if (statusFilter) q.set('status', statusFilter);
    fetch(`/api/admin/campaigns?${q}`)
      .then(r => r.json())
      .then(d => { if (!d.error) { setCampaigns(d.campaigns); setTotal(d.total); } })
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const pages = Math.ceil(total / 25);

  return (
    <main className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">All Campaigns</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{total.toLocaleString()} total across all users</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 border-t-2 border-t-gray-400">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-3">Total Campaigns</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{counts ? (counts.active + counts.paused + counts.completed + counts.draft) : total}</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">All time</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 border-t-2 border-t-emerald-500">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-3">Active</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{counts?.active ?? '—'}</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Running now</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 border-t-2 border-t-amber-500">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-3">Paused</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{counts?.paused ?? '—'}</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">On hold</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 border-t-2 border-t-blue-500">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-3">Completed</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{counts?.completed ?? '—'}</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Finished</p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
        {STATUS_FILTERS.map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === s ? 'bg-white text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-500 hover:text-gray-700'}`}>
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
                {['Campaign', 'User', 'Status', 'Sent', 'Open Rate', 'Reply Rate', 'Daily Limit', 'Created'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-3.5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-full max-w-[80px]"/></td>
                    ))}
                  </tr>
                ))
              ) : campaigns.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center text-sm text-gray-400 dark:text-gray-500">No campaigns found.</td></tr>
              ) : (
                campaigns.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white max-w-[200px] truncate">{c.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-500">{c.user_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 capitalize ${STATUS_COLORS[c.status] ?? STATUS_COLORS.draft}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{c.sent.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{c.open_rate}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{c.reply_rate}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-500">{c.daily_limit}/day</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-500">{new Date(c.created_at).toLocaleDateString()}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <span className="text-xs text-gray-400 dark:text-gray-500">Page {page} of {pages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-800 disabled:opacity-40 transition-colors">Previous</button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-800 disabled:opacity-40 transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

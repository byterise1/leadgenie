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

const STATUS_FILTERS = ['', 'active', 'paused', 'completed', 'draft'];
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  paused: 'bg-amber-50 text-amber-700',
  completed: 'bg-blue-50 text-blue-700',
  draft: 'bg-gray-100 text-gray-500',
};

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

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
          <h1 className="text-xl font-bold text-gray-900">All Campaigns</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total.toLocaleString()} total across all users</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Campaign', 'User', 'Status', 'Sent', 'Open Rate', 'Reply Rate', 'Daily Limit', 'Created'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-3.5 bg-gray-100 rounded animate-pulse w-full max-w-[80px]"/></td>
                    ))}
                  </tr>
                ))
              ) : campaigns.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center text-sm text-gray-400">No campaigns found.</td></tr>
              ) : (
                campaigns.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900 max-w-[200px] truncate">{c.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500">{c.user_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 capitalize ${STATUS_COLORS[c.status] ?? STATUS_COLORS.draft}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-gray-700">{c.sent.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-gray-700">{c.open_rate}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-gray-700">{c.reply_rate}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500">{c.daily_limit}/day</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500">{new Date(c.created_at).toLocaleDateString()}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">Page {page} of {pages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">Previous</button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

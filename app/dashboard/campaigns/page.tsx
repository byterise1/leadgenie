'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import ConfirmModal from '@/components/ConfirmModal';
import { Skeleton } from '@/components/Skeleton';

const tabs = ['All', 'Active', 'Paused', 'Completed', 'Draft'];

type Campaign = {
  id: string;
  name: string;
  status: string;
  list_id?: string | null;
  list_name?: string | null;
  total_sent: number;
  total_opened: number;
  total_replied: number;
  total_clicked: number;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  paused: 'bg-amber-50 text-amber-700 border-amber-100',
  completed: 'bg-blue-50 text-blue-700 border-blue-100',
  draft: 'bg-gray-100 text-gray-500 border-gray-200',
};

const CACHE_KEY = 'lg_campaigns_list';

export default function CampaignsPage() {
  const [tab, setTab] = useState('All');
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    try { const c = sessionStorage.getItem(CACHE_KEY); return c ? JSON.parse(c) : []; } catch { return []; }
  });
  const [loading, setLoading] = useState(() => {
    try { return !sessionStorage.getItem(CACHE_KEY); } catch { return true; }
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    const fetchCampaigns = () =>
      fetch('/api/campaigns').then(r => r.json()).then(data => {
        if (Array.isArray(data)) {
          setCampaigns(data);
          try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
        }
      }).finally(() => setLoading(false));
    fetchCampaigns();
    const id = setInterval(fetchCampaigns, 10000);
    return () => clearInterval(id);
  }, []);

  const filtered = tab === 'All' ? campaigns : campaigns.filter(c => c.status === tab.toLowerCase());

  const toggleStatus = async (e: React.MouseEvent, c: Campaign) => {
    e.preventDefault();
    const next = c.status === 'active' ? 'paused' : c.status === 'paused' ? 'active' : c.status;
    if (next === c.status) return;
    const res = await fetch(`/api/campaigns/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, status: next } : x));
  };

  const deleteCampaign = (e: React.MouseEvent, c: Campaign) => {
    e.preventDefault();
    setConfirmModal({
      title: 'Delete campaign?',
      message: `"${c.name}" and all its data will be permanently removed. This cannot be undone.`,
      onConfirm: async () => {
        setConfirmModal(null);
        setDeletingId(c.id);
        const res = await fetch(`/api/campaigns/${c.id}`, { method: 'DELETE' });
        if (res.ok) setCampaigns(prev => prev.filter(x => x.id !== c.id));
        setDeletingId(null);
      },
    });
  };

  return (
    <main className="flex-1 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage all your cold email campaigns.</p>
        </div>
        <Link href="/dashboard/campaigns/new"
          className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-blue-700 transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          New Campaign
        </Link>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Campaign Name', 'Lead List', 'Status', 'Sent', 'Open Rate', 'Click Rate', 'Reply Rate', 'Created', ''].map(col => (
                  <th key={col} className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-5 py-4"><Skeleton className={`h-3.5 ${j === 0 ? 'w-32' : j === 1 ? 'w-14 rounded-full' : 'w-10'}`} /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
                        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                      </div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">No campaigns yet</p>
                      <p className="text-xs text-gray-400 mb-5">Launch your first campaign to start booking meetings.</p>
                      <Link href="/dashboard/campaigns/new" className="text-xs font-bold bg-blue-600 text-white rounded-xl px-5 py-2.5 hover:bg-blue-700 transition-colors">
                        Create Campaign →
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(c => {
                const openRate = c.total_sent > 0 ? ((c.total_opened / c.total_sent) * 100).toFixed(1) + '%' : '—';
                const clickRate = c.total_sent > 0 ? (((c.total_clicked || 0) / c.total_sent) * 100).toFixed(1) + '%' : '—';
                const replyRate = c.total_sent > 0 ? ((c.total_replied / c.total_sent) * 100).toFixed(1) + '%' : '—';
                return (
                  <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors group">
                    <td className="px-5 py-4">
                      <Link href={`/dashboard/campaigns/${c.id}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      {c.list_name ? (
                        <Link href="/dashboard/leads" onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1 hover:bg-blue-100 transition-colors max-w-[160px]">
                          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
                          <span className="truncate">{c.list_name}</span>
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No list</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] font-bold rounded-full px-2.5 py-1 border capitalize ${STATUS_COLORS[c.status] || STATUS_COLORS.draft}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700 font-medium">{c.total_sent ?? 0}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-900">{openRate}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-900">{clickRate}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-900">{replyRate}</td>
                    <td className="px-5 py-4 text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/dashboard/campaigns/${c.id}`}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors border border-gray-200">
                          View
                        </Link>
                        {(c.status === 'active' || c.status === 'paused') && (
                          <button onClick={e => toggleStatus(e, c)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border ${c.status === 'active' ? 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'}`}>
                            {c.status === 'active' ? 'Pause' : 'Resume'}
                          </button>
                        )}
                        <button onClick={e => deleteCampaign(e, c)} disabled={deletingId === c.id}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </main>
  );
}

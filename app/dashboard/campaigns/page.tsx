'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
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
  total_clicked?: number;
  created_at: string;
};

const LEFT_BAR: Record<string, string> = {
  active: 'bg-emerald-500',
  paused: 'bg-amber-400',
  completed: 'bg-blue-400',
  draft: 'bg-gray-200',
};

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  paused: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  draft: 'bg-gray-100 text-gray-500 border-gray-200',
};

const CACHE_KEY = 'lg_campaigns_list';

function StatusDot({ status }: { status: string }) {
  if (status === 'active') return (
    <span className="relative flex w-2.5 h-2.5 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-emerald-500" />
    </span>
  );
  if (status === 'paused') return <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shrink-0" />;
  if (status === 'completed') return <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block shrink-0" />;
  return <span className="w-2.5 h-2.5 rounded-full border-2 border-gray-300 inline-block shrink-0" />;
}

export default function CampaignsPage() {
  const [tab, setTab] = useState('All');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { const c = sessionStorage.getItem(CACHE_KEY); if (c) { setCampaigns(JSON.parse(c)); setLoading(false); } } catch {}
    const fetchCampaigns = () =>
      fetch('/api/campaigns').then(r => r.json()).then(data => {
        if (Array.isArray(data)) {
          setCampaigns(data);
          try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
        }
      }).finally(() => setLoading(false));
    fetchCampaigns();
    const id = setInterval(fetchCampaigns, 30000);
    return () => clearInterval(id);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!openMenuId) return;
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [openMenuId]);

  const filtered = tab === 'All' ? campaigns : campaigns.filter(c => c.status === tab.toLowerCase());

  const startCampaign = async (e: React.MouseEvent, c: Campaign) => {
    e.preventDefault();
    e.stopPropagation();
    setStartingId(c.id);
    const res = await fetch(`/api/campaigns/${c.id}/start`, { method: 'POST' });
    const d = await res.json().catch(() => ({}));
    if (res.ok && d.status === 'active') {
      setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, status: 'active', total_sent: 0 } : x));
    } else {
      alert(d.error || 'Start failed — check accounts and leads then try again.');
    }
    setStartingId(null);
  };

  const resumeCampaign = async (e: React.MouseEvent, c: Campaign) => {
    e.preventDefault();
    e.stopPropagation();
    setStartingId(c.id);
    const res = await fetch(`/api/campaigns/${c.id}/start`, { method: 'POST' });
    const d = await res.json().catch(() => ({}));
    if (res.ok && d.status === 'active') {
      setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, status: 'active' } : x));
    } else {
      alert(d.error || 'Resume failed');
    }
    setStartingId(null);
  };

  const pauseCampaign = (e: React.MouseEvent, c: Campaign) => {
    e.preventDefault();
    e.stopPropagation();
    setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, status: 'paused' } : x));
    fetch(`/api/campaigns/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paused' }),
    }).catch(() => setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, status: 'active' } : x)));
  };

  const moveToDraft = (c: Campaign) => {
    setOpenMenuId(null);
    const prev = c.status;
    setCampaigns(cs => cs.map(x => x.id === c.id ? { ...x, status: 'draft' } : x));
    fetch(`/api/campaigns/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'draft' }),
    }).catch(() => setCampaigns(cs => cs.map(x => x.id === c.id ? { ...x, status: prev } : x)));
  };

  const deleteCampaign = (c: Campaign) => {
    setOpenMenuId(null);
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
      {/* Header */}
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

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Campaign cards */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 flex items-center overflow-hidden">
              <div className="w-1.5 self-stretch bg-gray-100" />
              <div className="flex-1 flex items-center gap-4 px-4 py-4">
                <Skeleton className="w-2.5 h-2.5 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-44 mb-2" />
                  <Skeleton className="h-3 w-20 rounded-full" />
                </div>
              </div>
              <div className="hidden lg:flex items-center gap-10 px-6">
                {[0,1,2].map(j => (
                  <div key={j} className="text-center">
                    <Skeleton className="h-2.5 w-8 mb-1.5 mx-auto" />
                    <Skeleton className="h-4 w-10 mx-auto" />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 px-4">
                <Skeleton className="h-8 w-14 rounded-lg" />
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center">
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
          </div>
        ) : filtered.map(c => {
          const openRate = c.total_sent > 0 ? ((c.total_opened / c.total_sent) * 100).toFixed(1) + '%' : '—';
          const replyRate = c.total_sent > 0 ? ((c.total_replied / c.total_sent) * 100).toFixed(1) + '%' : '—';
          const isDraft = c.status === 'draft';

          return (
            <div key={c.id}
              className={`bg-white rounded-2xl border flex items-center overflow-visible transition-all
                ${isDraft ? 'border-gray-100' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'}`}>

              {/* Coloured status bar on left edge */}
              <div className={`w-1.5 self-stretch shrink-0 rounded-l-2xl ${LEFT_BAR[c.status] ?? 'bg-gray-200'}`} />

              {/* Campaign name + status badge */}
              <div className="flex items-center gap-3 flex-1 min-w-0 px-4 py-3.5">
                <StatusDot status={c.status} />
                <div className="min-w-0">
                  <Link href={`/dashboard/campaigns/${c.id}`}
                    className={`text-sm font-bold hover:text-blue-600 transition-colors truncate block leading-snug
                      ${isDraft ? 'text-gray-500' : 'text-gray-900'}`}>
                    {c.name}
                  </Link>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 capitalize leading-none ${STATUS_BADGE[c.status] ?? STATUS_BADGE.draft}`}>
                      {isDraft ? 'Not started' : c.status}
                    </span>
                    {c.list_name && (
                      <span className="text-[11px] text-gray-400 truncate">· {c.list_name}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats — hidden on small screens */}
              <div className="hidden lg:flex items-center gap-10 px-6 shrink-0">
                <div className="text-center min-w-[40px]">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Sent</p>
                  <p className={`text-sm font-bold ${isDraft ? 'text-gray-300' : 'text-gray-900'}`}>{c.total_sent ?? 0}</p>
                </div>
                <div className="text-center min-w-[40px]">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Opens</p>
                  <p className={`text-sm font-bold ${openRate !== '—' ? 'text-gray-900' : 'text-gray-300'}`}>{openRate}</p>
                </div>
                <div className="text-center min-w-[40px]">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Replies</p>
                  <p className={`text-sm font-bold ${replyRate !== '—' ? 'text-emerald-600' : 'text-gray-300'}`}>{replyRate}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 px-4 shrink-0">
                {/* Always-visible: View */}
                <Link href={`/dashboard/campaigns/${c.id}`}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors whitespace-nowrap">
                  View
                </Link>

                {/* Start (draft only) */}
                {c.status === 'draft' && (
                  <button onClick={e => startCampaign(e, c)} disabled={startingId === c.id}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 transition-colors whitespace-nowrap">
                    {startingId === c.id
                      ? <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      : <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    }
                    Start
                  </button>
                )}

                {/* Pause (active only) */}
                {c.status === 'active' && (
                  <button onClick={e => pauseCampaign(e, c)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 transition-colors whitespace-nowrap">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    Pause
                  </button>
                )}

                {/* Resume (paused only) */}
                {c.status === 'paused' && (
                  <button onClick={e => resumeCampaign(e, c)} disabled={startingId === c.id}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 transition-colors whitespace-nowrap">
                    {startingId === c.id
                      ? <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      : <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    }
                    Resume
                  </button>
                )}

                {/* 3-dot dropdown */}
                <div ref={openMenuId === c.id ? menuRef : null} className="relative">
                  <button
                    onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === c.id ? null : c.id); }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                    </svg>
                  </button>

                  {openMenuId === c.id && (
                    <div className="absolute right-0 top-9 z-50 bg-white border border-gray-100 rounded-xl shadow-xl min-w-[168px] py-1">
                      <Link
                        href={`/dashboard/campaigns/${c.id}`}
                        onClick={() => setOpenMenuId(null)}
                        className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        Edit Campaign
                      </Link>

                      {c.status !== 'draft' && (
                        <button
                          onClick={() => moveToDraft(c)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                          Move to Draft
                        </button>
                      )}

                      <div className="h-px bg-gray-100 mx-2 my-1" />

                      <button
                        onClick={() => deleteCampaign(c)}
                        disabled={deletingId === c.id}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        {deletingId === c.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
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

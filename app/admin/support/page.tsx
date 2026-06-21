'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type Ticket = {
  id: string;
  user_id: string;
  user_email: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  priority: string;
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-50 text-orange-700',
  normal: 'bg-blue-50 text-blue-600',
  low: 'bg-gray-100 text-gray-500',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-emerald-50 text-emerald-700',
  in_progress: 'bg-amber-50 text-amber-700',
  closed: 'bg-gray-100 text-gray-500',
};

function relativeDate(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function msgCount(t: Ticket) {
  return 1 + (t.admin_reply ? 1 : 0);
}

export default function AdminSupportPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/support')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setTickets(d); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const unread = tickets.filter(t => !t.admin_reply && t.status !== 'closed').length;
  const openCount = tickets.filter(t => t.status === 'open').length;
  const waitingCount = tickets.filter(t => t.status === 'in_progress').length;
  const resolved30d = tickets.filter(t => {
    if (t.status !== 'closed') return false;
    return (Date.now() - new Date(t.updated_at).getTime()) < 30 * 24 * 60 * 60 * 1000;
  }).length;

  const filtered = tickets.filter(t => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (categoryFilter && t.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.subject.toLowerCase().includes(q) && !t.user_email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <main className="flex-1 p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
        <p className="text-sm text-gray-400 mt-1">Every ticket opened by a user. Reply, assign, close.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-200">Unread</span>
            <svg className="w-4 h-4 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </div>
          <p className="text-4xl font-bold">{unread}</p>
          <p className="text-xs text-indigo-200 mt-1">Need your reply</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Open</span>
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
          </div>
          <p className="text-4xl font-bold text-gray-900">{openCount}</p>
          <p className="text-xs text-gray-400 mt-1">Active threads</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Waiting on User</span>
            <svg className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <p className="text-4xl font-bold text-gray-900">{waitingCount}</p>
          <p className="text-xs text-gray-400 mt-1">They have to reply</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Resolved (30d)</span>
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <p className="text-4xl font-bold text-gray-900">{resolved30d}</p>
          <p className="text-xs text-gray-400 mt-1">Closed out</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subject or user..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
          <option value="">STATUS: All</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="closed">Closed</option>
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
          <option value="">CATEGORY: All</option>
          <option value="billing">Billing</option>
          <option value="technical">Technical</option>
          <option value="general">General</option>
          <option value="account">Account</option>
        </select>
        <span className="ml-auto text-xs text-gray-400 shrink-0">{filtered.length} of {tickets.length}</span>
      </div>

      {/* Ticket list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4">
                <div className="w-8 h-8 bg-gray-100 rounded-full animate-pulse shrink-0"/>
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2"/>
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3"/>
                </div>
                <div className="flex gap-2">
                  <div className="h-5 w-14 bg-gray-100 rounded-full animate-pulse"/>
                  <div className="h-5 w-14 bg-gray-100 rounded-full animate-pulse"/>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-500">No tickets found</p>
            <p className="text-xs text-gray-400 mt-1">All caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(t => (
              <div key={t.id} onClick={() => router.push(`/admin/support/${t.id}`)}
                className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 cursor-pointer transition-colors group">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!t.admin_reply && t.status !== 'closed' ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                  <svg className={`w-4 h-4 ${!t.admin_reply && t.status !== 'closed' ? 'text-indigo-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{t.subject}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-400 truncate max-w-[160px]">{t.user_email}</span>
                    <span className="text-gray-300 text-xs">·</span>
                    <span className="text-xs text-gray-400 capitalize">{t.category}</span>
                    <span className="text-gray-300 text-xs">·</span>
                    <span className="text-xs text-gray-400">{msgCount(t)} message{msgCount(t) !== 1 ? 's' : ''}</span>
                    <span className="text-gray-300 text-xs">·</span>
                    <span className="text-xs text-gray-400">{relativeDate(t.created_at)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 uppercase ${PRIORITY_COLORS[t.priority] ?? PRIORITY_COLORS.normal}`}>
                    {t.priority}
                  </span>
                  <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 capitalize ${STATUS_COLORS[t.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {t.status === 'in_progress' ? 'In Progress' : t.status === 'closed' ? '• Closed' : '• Open'}
                  </span>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

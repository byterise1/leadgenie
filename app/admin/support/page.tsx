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
  admin_seen_at: string | null;
  messages: { role: string; body: string; ts: string }[] | null;
  created_at: string;
  updated_at: string;
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-50 text-orange-700',
  normal: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400',
  low: 'bg-gray-100 dark:bg-gray-800 text-gray-500',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400',
  in_progress: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400',
  closed: 'bg-gray-100 dark:bg-gray-800 text-gray-500',
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

  const isUnread = (t: Ticket) => {
    if (t.status === 'closed') return false;
    if (!t.admin_seen_at) return true;
    if (new Date(t.updated_at) > new Date(t.admin_seen_at)) {
      const msgs = Array.isArray(t.messages) ? t.messages : [];
      return msgs.length > 0 && msgs[msgs.length - 1]?.role === 'user';
    }
    return false;
  };
  const unread = tickets.filter(isUnread).length;
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
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Support Tickets</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Every ticket opened by a user. Reply, assign, close.</p>
      </div>

      {/* Stat cards — same style as admin overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 border-t-2 border-t-blue-500">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-3">Unread</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{unread}</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Awaiting your reply</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 border-t-2 border-t-emerald-500">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-3">Open</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{openCount}</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Active threads</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 border-t-2 border-t-amber-500">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-3">Waiting on User</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{waitingCount}</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">They have to reply</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 border-t-2 border-t-violet-500">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-3">Resolved (30d)</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{resolved30d}</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Closed out</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subject or user..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">STATUS: All</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="closed">Closed</option>
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">CATEGORY: All</option>
          <option value="billing">Billing</option>
          <option value="technical">Technical</option>
          <option value="general">General</option>
          <option value="account">Account</option>
        </select>
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 shrink-0">{filtered.length} of {tickets.length}</span>
      </div>

      {/* Ticket list */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4">
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse shrink-0"/>
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/2"/>
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/3"/>
                </div>
                <div className="flex gap-2">
                  <div className="h-5 w-14 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse"/>
                  <div className="h-5 w-14 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse"/>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-500 dark:text-gray-500">No tickets found</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">All caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {filtered.map(t => (
              <div key={t.id} onClick={() => {
                  setTickets(prev => prev.map(x => x.id === t.id ? { ...x, admin_seen_at: new Date().toISOString() } : x));
                  router.push(`/admin/support/${t.id}`);
                }}
                className={`px-5 py-4 flex items-center gap-4 hover:bg-gray-50 dark:bg-gray-800 cursor-pointer transition-colors group ${isUnread(t) ? 'bg-blue-50/30 dark:bg-blue-950/30' : ''}`}>
                {/* Unread dot + icon */}
                <div className="relative shrink-0">
                  {isUnread(t) && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white z-10"/>
                  )}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isUnread(t) ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <svg className={`w-4 h-4 ${isUnread(t) ? 'text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                    </svg>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${isUnread(t) ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>{t.subject}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[160px]">{t.user_email}</span>
                    <span className="text-gray-200 text-xs">·</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">{t.category}</span>
                    <span className="text-gray-200 text-xs">·</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{msgCount(t)} message{msgCount(t) !== 1 ? 's' : ''}</span>
                    <span className="text-gray-200 text-xs">·</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{relativeDate(t.created_at)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 uppercase ${PRIORITY_COLORS[t.priority] ?? PRIORITY_COLORS.normal}`}>
                    {t.priority}
                  </span>
                  <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 ${STATUS_COLORS[t.status] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                    {t.status === 'in_progress' ? 'In Progress' : t.status === 'closed' ? '• Closed' : '• Open'}
                  </span>
                  <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

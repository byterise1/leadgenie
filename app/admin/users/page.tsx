'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

type User = {
  id: string;
  email: string;
  full_name: string | null;
  plan: string;
  is_admin: boolean;
  credits_used: number;
  credits_total: number;
  campaigns: number;
  accounts: number;
  emails_sent: number;
  bounced: number;
  unsubscribed: number;
  created_at: string;
};

type UserDetail = {
  profile: User & { email: string };
  campaigns: { id: string; name: string; status: string; total_sent: number; created_at: string }[];
  accounts: { id: string; email: string; type: string; status: string; health_score: number; warmup_enabled: boolean }[];
  totalEmails: number;
  totalBounced: number;
  totalUnsubscribed: number;
};

const PLAN_OPTS = ['free', 'starter', 'pro', 'agency'];
const PLAN_CREDITS: Record<string, number> = { free: 100, starter: 1000, pro: 5000, agency: 25000 };
const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-600',
  starter: 'bg-blue-50 text-blue-700',
  pro: 'bg-violet-50 text-violet-700',
  agency: 'bg-amber-50 text-amber-700',
};
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  paused: 'bg-amber-50 text-amber-700',
  completed: 'bg-blue-50 text-blue-700',
  draft: 'bg-gray-100 text-gray-500',
};

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3.5 bg-gray-100 rounded animate-pulse w-full max-w-[80px]"/>
        </td>
      ))}
    </tr>
  );
}

function ConfirmAdminModal({ email, enabling, onConfirm, onClose }: {
  email: string; enabling: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-5">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ${enabling ? 'bg-red-50' : 'bg-amber-50'}`}>
            <svg className={`w-5 h-5 ${enabling ? 'text-red-500' : 'text-amber-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">{enabling ? 'Grant admin access?' : 'Remove admin access?'}</h3>
          <p className="text-sm text-gray-500">
            {enabling
              ? <><span className="font-semibold text-gray-800">{email}</span> will get full access to the admin panel including all user data and settings.</>
              : <><span className="font-semibold text-gray-800">{email}</span> will no longer be able to access the admin panel.</>}
          </p>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
          <button onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors ${enabling ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'}`}>
            {enabling ? 'Yes, grant access' : 'Yes, remove access'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ user, isLastAdmin, onClose, onSave }: {
  user: User;
  isLastAdmin: boolean;
  onClose: () => void;
  onSave: (updates: Partial<User>) => Promise<void>;
}) {
  const [plan, setPlan] = useState(user.plan);
  const [creditsTotal, setCreditsTotal] = useState(user.credits_total);
  const [creditsUsed, setCreditsUsed] = useState(user.credits_used);
  const [isAdmin, setIsAdmin] = useState(user.is_admin);
  const [saving, setSaving] = useState(false);
  const [confirmAdmin, setConfirmAdmin] = useState<boolean | null>(null);

  const handlePlanChange = (p: string) => {
    setPlan(p);
    setCreditsTotal(PLAN_CREDITS[p] ?? 100);
  };

  const save = async () => {
    setSaving(true);
    await onSave({ plan, credits_total: creditsTotal, credits_used: creditsUsed, is_admin: isAdmin });
    setSaving(false);
    onClose();
  };

  return (
    <>
    {confirmAdmin !== null && (
      <ConfirmAdminModal
        email={user.email}
        enabling={confirmAdmin}
        onConfirm={() => { setIsAdmin(confirmAdmin); setConfirmAdmin(null); }}
        onClose={() => setConfirmAdmin(null)}
      />
    )}
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Edit User</h2>
            <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="text-xs font-bold text-gray-700 mb-2 block">Plan</label>
            <div className="grid grid-cols-4 gap-2">
              {PLAN_OPTS.map(p => (
                <button key={p} type="button" onClick={() => handlePlanChange(p)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all capitalize ${
                    plan === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1.5 block">Credits Total</label>
              <input type="number" min={0} value={creditsTotal} onChange={e => setCreditsTotal(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1.5 block">Credits Used</label>
              <input type="number" min={0} value={creditsUsed} onChange={e => setCreditsUsed(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>

          <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${isLastAdmin && isAdmin ? 'border-amber-200 bg-amber-50' : 'border-gray-200'}`}>
            <div>
              <p className="text-sm font-semibold text-gray-900">Admin Access</p>
              {isLastAdmin && isAdmin
                ? <p className="text-xs text-amber-600 mt-0.5 font-medium">Last admin — add another before removing</p>
                : <p className="text-xs text-gray-400 mt-0.5">Grant full admin panel access</p>
              }
            </div>
            <button
              type="button"
              disabled={isLastAdmin && isAdmin}
              onClick={() => setConfirmAdmin(!isAdmin)}
              title={isLastAdmin && isAdmin ? 'Cannot remove the last admin' : undefined}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${
                isLastAdmin && isAdmin ? 'bg-red-300 cursor-not-allowed' : isAdmin ? 'bg-red-500' : 'bg-gray-200'
              }`}>
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${isAdmin ? 'translate-x-4' : 'translate-x-0.5'}`}/>
            </button>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

function DetailDrawer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/users/${userId}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setDetail(d); })
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-base font-bold text-gray-900">User Detail</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse"/>)}
          </div>
        ) : !detail ? (
          <div className="p-6 text-center text-sm text-gray-400">Failed to load user details.</div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Plan', value: detail.profile.plan, cls: 'capitalize' },
                { label: 'Credits', value: `${detail.profile.credits_used}/${detail.profile.credits_total}` },
                { label: 'Emails Sent', value: detail.totalEmails },
                { label: 'Bounced', value: detail.totalBounced, warn: detail.totalBounced > 0 },
                { label: 'Unsubscribed', value: detail.totalUnsubscribed },
                { label: 'Joined', value: new Date(detail.profile.created_at).toLocaleDateString() },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">{s.label}</p>
                  <p className={`text-sm font-bold mt-1 ${s.warn ? 'text-red-600' : 'text-gray-900'} ${s.cls ?? ''}`}>{String(s.value)}</p>
                </div>
              ))}
            </div>

            {/* Email Accounts */}
            {detail.accounts.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Email Accounts ({detail.accounts.length})</h3>
                <div className="space-y-2">
                  {detail.accounts.map(acc => (
                    <div key={acc.id} className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{acc.email}</p>
                        <p className="text-[10px] text-gray-400">{acc.type}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${acc.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {acc.status}
                        </span>
                        <span className="text-[10px] text-gray-400">Score: {acc.health_score}</span>
                        {acc.warmup_enabled && <span className="text-[10px] bg-amber-50 text-amber-700 rounded-full px-2 py-0.5 font-bold">Warming</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Campaigns */}
            {detail.campaigns.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Campaigns ({detail.campaigns.length})</h3>
                <div className="space-y-2">
                  {detail.campaigns.map(c => (
                    <div key={c.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
                      <p className="text-sm font-semibold text-gray-900 truncate flex-1 mr-4">{c.name}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-gray-400">{c.total_sent} sent</span>
                        <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 capitalize ${STATUS_COLORS[c.status] ?? STATUS_COLORS.draft}`}>
                          {c.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type AdminStats = {
  totalUsers: number;
  newUsersWeek: number;
  totalEmailsSent: number;
  activeCampaigns: number;
};

function AdminUsersInner() {
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editUser, setEditUser] = useState<User | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(d => { if (!d.error) setAdminStats(d); })
      .catch(() => {});
  }, []);

  const focusId = searchParams.get('focus');

  const showToast = (msg: string, error = false) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 4000);
  };

  const loadUsers = useCallback(() => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(page), q: search });
    fetch(`/api/admin/users?${q}`)
      .then(r => r.json())
      .then(d => {
        if (!d.error) {
          setUsers(d.users);
          setTotal(d.total);
        }
      })
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { if (focusId) setDetailId(focusId); }, [focusId]);

  const saveUser = async (id: string, updates: Partial<User>) => {
    setSaving(id);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (data.error) {
      showToast(data.error, true);
    } else {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
      showToast('User updated successfully');
    }
    setSaving(null);
  };

  const pages = Math.ceil(total / 20);

  return (
    <main className="flex-1 p-6 space-y-6">
      {toast && (
        <div className={`fixed bottom-6 right-6 text-white text-sm font-semibold rounded-xl px-5 py-3 shadow-xl z-50 flex items-center gap-2 ${toast.error ? 'bg-red-600' : 'bg-gray-900'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${toast.error ? 'bg-red-300' : 'bg-emerald-400'}`}/>
          {toast.msg}
        </div>
      )}

      {editUser && (
        <EditModal
          user={editUser}
          isLastAdmin={editUser.is_admin && users.filter(u => u.is_admin).length <= 1}
          onClose={() => setEditUser(null)}
          onSave={updates => saveUser(editUser.id, updates)}
        />
      )}
      {detailId && <DetailDrawer userId={detailId} onClose={() => setDetailId(null)}/>}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total.toLocaleString()} total accounts</p>
        </div>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input
            type="text"
            placeholder="Search by email or name…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 border-t-2 border-t-blue-500">
          <p className="text-xs font-semibold text-gray-400 mb-3">Total Users</p>
          <p className="text-2xl font-bold text-gray-900">{adminStats ? adminStats.totalUsers.toLocaleString() : total.toLocaleString()}</p>
          <p className="text-[11px] text-gray-400 mt-1">All-time accounts</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 border-t-2 border-t-emerald-500">
          <p className="text-xs font-semibold text-gray-400 mb-3">New This Week</p>
          <p className="text-2xl font-bold text-gray-900">{adminStats?.newUsersWeek ?? '—'}</p>
          <p className="text-[11px] text-gray-400 mt-1">Last 7 days</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 border-t-2 border-t-violet-500">
          <p className="text-xs font-semibold text-gray-400 mb-3">Emails Sent</p>
          <p className="text-2xl font-bold text-gray-900">{adminStats ? adminStats.totalEmailsSent.toLocaleString() : '—'}</p>
          <p className="text-[11px] text-gray-400 mt-1">All time</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 border-t-2 border-t-amber-500">
          <p className="text-xs font-semibold text-gray-400 mb-3">Active Campaigns</p>
          <p className="text-2xl font-bold text-gray-900">{adminStats?.activeCampaigns ?? '—'}</p>
          <p className="text-[11px] text-gray-400 mt-1">Running now</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Plan</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Credits</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Sent</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Bounced</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Unsub</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Campaigns</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Joined</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i}/>)
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-sm text-gray-400">
                    {search ? `No users matching "${search}"` : 'No users found.'}
                  </td>
                </tr>
              ) : (
                users.map(u => {
                  const initials = (u.full_name || u.email || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                  const pct = Math.min(100, Math.round(((u.credits_used ?? 0) / (u.credits_total || 1)) * 100));
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold text-gray-900 truncate max-w-[140px]">{u.full_name || '—'}</p>
                              {u.is_admin && <span className="text-[9px] font-bold bg-red-100 text-red-600 rounded px-1">ADMIN</span>}
                            </div>
                            <p className="text-[11px] text-gray-400 truncate max-w-[160px]">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 capitalize ${PLAN_COLORS[u.plan] ?? PLAN_COLORS.free}`}>
                          {u.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-blue-500'}`}
                              style={{ width: `${pct}%` }}/>
                          </div>
                          <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">
                            {(u.credits_used ?? 0)}/{u.credits_total}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-gray-700">{u.emails_sent}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-semibold ${u.bounced > 0 ? 'text-red-500' : 'text-gray-400'}`}>{u.bounced}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-gray-500">{u.unsubscribed}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-gray-700">{u.campaigns}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-500">{new Date(u.created_at).toLocaleDateString()}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setDetailId(u.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View details">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                          </button>
                          <button onClick={() => setEditUser(u)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Edit user">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">Page {page} of {pages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                Previous
              </button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<main className="flex-1 p-6"><div className="h-8 w-48 bg-gray-100 rounded animate-pulse"/></main>}>
      <AdminUsersInner />
    </Suspense>
  );
}

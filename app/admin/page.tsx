'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Stats = {
  totalUsers: number;
  newUsersWeek: number;
  totalEmailsSent: number;
  emailsSentToday: number;
  activeCampaigns: number;
  totalCampaigns: number;
  warmingAccounts: number;
  totalAccounts: number;
  avgOpenRate: number;
  avgReplyRate: number;
  recentUsers: {
    id: string;
    full_name: string | null;
    plan: string;
    credits_used: number;
    credits_total: number;
    created_at: string;
  }[];
};

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-500',
  starter: 'bg-blue-50 text-blue-700',
  pro: 'bg-violet-50 text-violet-700',
  agency: 'bg-amber-50 text-amber-700',
};

function StatCard({ label, value, sub, color = 'default' }: { label: string; value: string | number; sub?: string; color?: string }) {
  const accent = color === 'blue' ? 'border-t-2 border-t-blue-500' :
    color === 'green' ? 'border-t-2 border-t-emerald-500' :
    color === 'purple' ? 'border-t-2 border-t-violet-500' :
    color === 'amber' ? 'border-t-2 border-t-amber-500' : '';
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 p-5 ${accent}`}>
      <p className="text-xs font-semibold text-gray-400 mb-3">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="h-3 w-24 bg-gray-100 rounded animate-pulse mb-4"/>
      <div className="h-7 w-16 bg-gray-100 rounded animate-pulse"/>
    </div>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(d => { if (!d.error) setStats(d); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="flex-1 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Platform-wide overview and controls.</p>
        </div>
        <Link href="/admin/users" className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-blue-700 transition-colors shadow-sm w-fit">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z"/></svg>
          Manage Users
        </Link>
      </div>

      {/* Primary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i}/>) : <>
          <StatCard label="Total Users" value={stats?.totalUsers ?? 0} sub={`+${stats?.newUsersWeek ?? 0} this week`} color="blue"/>
          <StatCard label="Emails Sent (All Time)" value={(stats?.totalEmailsSent ?? 0).toLocaleString()} sub={`${stats?.emailsSentToday ?? 0} today`} color="green"/>
          <StatCard label="Active Campaigns" value={stats?.activeCampaigns ?? 0} sub={`${stats?.totalCampaigns ?? 0} total`} color="purple"/>
          <StatCard label="Warming Accounts" value={stats?.warmingAccounts ?? 0} sub={`${stats?.totalAccounts ?? 0} total`} color="amber"/>
          <StatCard label="Avg Open Rate" value={`${stats?.avgOpenRate ?? 0}%`} sub="Platform-wide"/>
          <StatCard label="Avg Reply Rate" value={`${stats?.avgReplyRate ?? 0}%`} sub="Platform-wide"/>
          <StatCard label="Email Accounts" value={stats?.totalAccounts ?? 0} sub="Connected"/>
          <StatCard label="Campaigns Total" value={stats?.totalCampaigns ?? 0} sub="All statuses"/>
        </>}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent users */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Recent Signups</h2>
            <Link href="/admin/users" className="text-xs font-semibold text-blue-600 hover:text-blue-700">View all →</Link>
          </div>
          {loading ? (
            <div className="divide-y divide-gray-50">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-6 py-3 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse shrink-0"/>
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 bg-gray-100 rounded animate-pulse"/>
                    <div className="h-2.5 w-20 bg-gray-100 rounded animate-pulse"/>
                  </div>
                </div>
              ))}
            </div>
          ) : !stats?.recentUsers?.length ? (
            <div className="px-6 py-12 text-center text-sm text-gray-400">No users yet.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {stats.recentUsers.map(u => {
                const initials = (u.full_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                const pct = Math.min(100, Math.round(((u.credits_used ?? 0) / (u.credits_total || 1)) * 100));
                return (
                  <Link key={u.id} href={`/admin/users?focus=${u.id}`}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                        {u.full_name || 'Unknown'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="w-20 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }}/>
                        </div>
                        <span className="text-[10px] text-gray-400">{u.credits_used}/{u.credits_total} credits</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 capitalize ${PLAN_COLORS[u.plan] ?? PLAN_COLORS.free}`}>
                        {u.plan}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(u.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Platform health */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-sm font-bold text-gray-900 mb-5">Platform Health</h2>
            <div className="space-y-4">
              {[
                { label: 'Open Rate', value: stats?.avgOpenRate ?? 0, good: 25, ok: 10 },
                { label: 'Reply Rate', value: stats?.avgReplyRate ?? 0, good: 5, ok: 2 },
              ].map(m => {
                const color = m.value >= m.good ? 'bg-emerald-500' : m.value >= m.ok ? 'bg-amber-400' : 'bg-red-400';
                const label = m.value >= m.good ? 'Good' : m.value >= m.ok ? 'OK' : 'Low';
                const lc = m.value >= m.good ? 'text-emerald-600' : m.value >= m.ok ? 'text-amber-600' : 'text-red-500';
                return (
                  <div key={m.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-gray-700">{m.label}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold ${lc}`}>{label}</span>
                        <span className="text-sm font-bold text-gray-900">{m.value}%</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, m.value * 2)}%` }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'View Users', href: '/admin/users', icon: '👥', color: 'bg-blue-50 hover:bg-blue-100' },
                { label: 'All Campaigns', href: '/admin/campaigns', icon: '📧', color: 'bg-indigo-50 hover:bg-indigo-100' },
              ].map(a => (
                <Link key={a.href} href={a.href}
                  className={`flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl border border-gray-100 transition-colors ${a.color}`}>
                  <span className="text-2xl">{a.icon}</span>
                  <span className="text-xs font-bold text-gray-700">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white">
            <p className="text-xs font-bold text-slate-400 mb-1">System</p>
            <p className="text-sm font-semibold mb-3">Everything operational</p>
            <div className="space-y-2">
              {[
                { label: 'Email Worker', status: 'Running' },
                { label: 'Inbox Sync', status: 'Running' },
                { label: 'Database', status: 'Healthy' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{s.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>
                    <span className="text-xs font-semibold text-emerald-400">{s.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

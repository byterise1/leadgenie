'use client';

import { useEffect, useState } from 'react';

type WarmupAccount = {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  email: string;
  type: string;
  status: string;
  health_score: number;
  warmup_enabled: boolean;
  warmup_day: number;
  warmup_target: number;
  sent_today: number;
};

type Stats = {
  total: number;
  warming: number;
  healthy: number;
  at_risk: number;
};

function ScoreRing({ score }: { score: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const fill = circ * (score / 100);
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="shrink-0">
      <circle cx="26" cy="26" r={r} fill="none" stroke="#f3f4f6" strokeWidth="5"/>
      <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 26 26)"/>
      <text x="26" y="30" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{score}</text>
    </svg>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
      <p className="text-xs font-semibold text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color ?? 'text-gray-900'}`}>{value.toLocaleString()}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminWarmupPage() {
  const [accounts, setAccounts] = useState<WarmupAccount[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, warming: 0, healthy: 0, at_risk: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'warming' | 'healthy' | 'at_risk'>('all');

  useEffect(() => {
    fetch('/api/admin/warmup')
      .then(r => r.json())
      .then(d => {
        if (!d.error) {
          setAccounts(d.accounts);
          setStats(d.stats);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = accounts.filter(a => {
    const matchSearch = !search ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.user_name.toLowerCase().includes(search.toLowerCase()) ||
      a.user_email.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ? true :
      filter === 'warming' ? a.warmup_enabled :
      filter === 'healthy' ? a.health_score >= 80 :
      filter === 'at_risk' ? (a.health_score > 0 && a.health_score < 50) : true;
    return matchSearch && matchFilter;
  });

  return (
    <main className="flex-1 p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Warmup — Platform Overview</h1>
        <p className="text-sm text-gray-400 mt-0.5">All user email accounts and their warmup health across the platform.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Accounts" value={stats.total} sub="across all users"/>
        <StatCard label="Warming Active" value={stats.warming} sub="warmup enabled" color="text-amber-600"/>
        <StatCard label="Healthy (80+)" value={stats.healthy} sub="score ≥ 80" color="text-emerald-600"/>
        <StatCard label="At Risk (<50)" value={stats.at_risk} sub="score < 50" color="text-red-500"/>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search accounts or users…"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
        <div className="flex gap-1">
          {(['all', 'warming', 'healthy', 'at_risk'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${filter === f ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'}`}>
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Account</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Health</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Warmup</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Progress</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Sent Today</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-3.5 bg-gray-100 rounded animate-pulse"/></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-sm text-gray-400">
                    {search ? 'No accounts match your search.' : 'No email accounts found.'}
                  </td>
                </tr>
              ) : (
                filtered.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900 truncate max-w-[180px]">{a.email}</p>
                      <p className="text-[11px] text-gray-400 capitalize">{a.type}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-gray-700 truncate max-w-[140px]">{a.user_name}</p>
                      <p className="text-[10px] text-gray-400 truncate max-w-[140px]">{a.user_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <ScoreRing score={a.health_score}/>
                    </td>
                    <td className="px-4 py-3">
                      {a.warmup_enabled ? (
                        <span className="text-[11px] font-bold bg-amber-50 text-amber-700 rounded-full px-2.5 py-1">Active</span>
                      ) : (
                        <span className="text-[11px] font-bold bg-gray-100 text-gray-500 rounded-full px-2.5 py-1">Off</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (a.warmup_day / (a.warmup_target || 40)) * 100)}%` }}/>
                        </div>
                        <span className="text-[11px] text-gray-500 whitespace-nowrap">Day {a.warmup_day}/{a.warmup_target}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-gray-700">{a.sent_today}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 capitalize ${
                        a.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">{filtered.length} account{filtered.length !== 1 ? 's' : ''} shown</p>
        </div>
      </div>
    </main>
  );
}

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

type PoolAccount = {
  id: string;
  email: string;
  status: string;
  health_score: number;
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

function AddPoolModal({ onClose, onAdd }: { onClose: () => void; onAdd: (acct: PoolAccount) => void }) {
  const [email, setEmail] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [warmupTarget, setWarmupTarget] = useState('40');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    if (!email || !smtpHost || !smtpUser || !smtpPass) { setError('All fields are required.'); return; }
    setSaving(true);
    setError('');
    const res = await fetch('/api/admin/warmup/pool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, smtp_host: smtpHost, smtp_port: Number(smtpPort), smtp_user: smtpUser, smtp_pass: smtpPass, warmup_target: Number(warmupTarget) }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); setSaving(false); return; }
    onAdd(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Add Pool Account</h2>
            <p className="text-xs text-gray-400 mt-0.5">This account will be added to the shared warmup pool.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Email Address</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="pool@yourdomain.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">SMTP Host</label>
              <input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">SMTP Port</label>
              <input value={smtpPort} onChange={e => setSmtpPort(e.target.value)} placeholder="587"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">SMTP Username</label>
              <input value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="user@domain.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">SMTP Password</label>
              <input type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} placeholder="••••••••"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Warmup Target (emails/day)</label>
              <input type="number" value={warmupTarget} onChange={e => setWarmupTarget(e.target.value)} min={5} max={100}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700">Cancel</button>
          <button onClick={handleAdd} disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Adding…' : 'Add to Pool'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminWarmupPage() {
  const [accounts, setAccounts] = useState<WarmupAccount[]>([]);
  const [poolAccounts, setPoolAccounts] = useState<PoolAccount[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, warming: 0, healthy: 0, at_risk: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'warming' | 'healthy' | 'at_risk'>('all');
  const [showAddPool, setShowAddPool] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/warmup').then(r => r.json()),
      fetch('/api/admin/warmup/pool').then(r => r.json()),
    ]).then(([warmup, pool]) => {
      if (!warmup.error) { setAccounts(warmup.accounts); setStats(warmup.stats); }
      if (Array.isArray(pool)) setPoolAccounts(pool);
    }).finally(() => setLoading(false));
  }, []);

  const handleDeletePool = async (id: string) => {
    if (!confirm('Remove this account from the warmup pool?')) return;
    await fetch('/api/admin/warmup/pool', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setPoolAccounts(prev => prev.filter(a => a.id !== id));
    showToast('Pool account removed');
  };

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

  const totalPoolSize = stats.warming + poolAccounts.length;

  return (
    <main className="flex-1 p-6 space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm font-semibold rounded-xl px-5 py-3 shadow-xl z-50 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>
          {toast}
        </div>
      )}
      {showAddPool && <AddPoolModal onClose={() => setShowAddPool(false)} onAdd={a => { setPoolAccounts(prev => [...prev, a]); showToast('Pool account added — warmup will start next cycle'); }}/>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Warmup — Platform Overview</h1>
          <p className="text-sm text-gray-400 mt-0.5">All user email accounts in the shared warmup pool. Emails warm each other automatically every 6 hours.</p>
        </div>
      </div>

      {/* Pool health banner */}
      {!loading && totalPoolSize < 2 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <div>
            <p className="text-sm font-bold text-amber-800">Pool needs at least 2 accounts to start warming</p>
            <p className="text-xs text-amber-600 mt-0.5">Add platform pool accounts below, or ask users to enable warmup on their email accounts.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Accounts', value: stats.total, sub: 'across all users' },
          { label: 'Warming Active', value: stats.warming + poolAccounts.filter(a => a.warmup_day > 0).length, sub: 'in pool', color: 'text-amber-600' },
          { label: 'Healthy (80+)', value: stats.healthy, sub: 'score ≥ 80', color: 'text-emerald-600' },
          { label: 'At Risk (<50)', value: stats.at_risk, sub: 'score < 50', color: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
            <p className="text-xs font-semibold text-gray-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color ?? 'text-gray-900'}`}>{s.value.toLocaleString()}</p>
            {s.sub && <p className="text-[11px] text-gray-400 mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Platform Pool Accounts */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Platform Pool Accounts</h2>
            <p className="text-xs text-gray-400 mt-0.5">Admin-owned SMTP accounts dedicated to the warmup pool. These boost the pool size for all users.</p>
          </div>
          <button onClick={() => setShowAddPool(true)}
            className="flex items-center gap-2 bg-blue-600 text-white text-xs font-bold rounded-xl px-3 py-2 hover:bg-blue-700">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            Add Account
          </button>
        </div>

        {poolAccounts.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <p className="text-sm font-semibold text-gray-500 mb-1">No pool accounts yet</p>
            <p className="text-xs text-gray-400 mb-3">Add SMTP accounts here to seed the warmup pool for all users.</p>
            <button onClick={() => setShowAddPool(true)} className="text-sm font-bold text-blue-600 hover:text-blue-700">+ Add pool account</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-400 uppercase">Email</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-400 uppercase">Health</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-400 uppercase">Progress</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-400 uppercase">Sent Today</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-400 uppercase"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {poolAccounts.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{a.email}</p>
                      <p className="text-[10px] text-amber-600 font-bold">Pool account</p>
                    </td>
                    <td className="px-4 py-3"><ScoreRing score={a.health_score}/></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(100, (a.warmup_day / (a.warmup_target || 40)) * 100)}%` }}/>
                        </div>
                        <span className="text-[11px] text-gray-500 whitespace-nowrap">Day {a.warmup_day}/{a.warmup_target}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="text-sm font-semibold text-gray-700">{a.sent_today}</span></td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDeletePool(a.id)} className="p-1.5 text-gray-300 hover:text-red-400 rounded-lg hover:bg-red-50 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* All Users' Accounts */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-gray-900">User Warmup Accounts</h2>
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
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-3.5 bg-gray-100 rounded animate-pulse"/></td>)}</tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">No accounts found.</td></tr>
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
                      <td className="px-4 py-3"><ScoreRing score={a.health_score}/></td>
                      <td className="px-4 py-3">
                        {a.warmup_enabled
                          ? <span className="text-[11px] font-bold bg-amber-50 text-amber-700 rounded-full px-2.5 py-1">Active</span>
                          : <span className="text-[11px] font-bold bg-gray-100 text-gray-500 rounded-full px-2.5 py-1">Off</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(100, (a.warmup_day / (a.warmup_target || 40)) * 100)}%` }}/>
                          </div>
                          <span className="text-[11px] text-gray-500 whitespace-nowrap">Day {a.warmup_day}/{a.warmup_target}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className="text-sm font-semibold text-gray-700">{a.sent_today}</span></td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 capitalize ${a.status === 'active' || a.status === 'warming' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
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
      </div>
    </main>
  );
}

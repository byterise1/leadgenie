'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

type PoolMode = 'admin_pool' | 'user_to_user' | 'both';

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
  warmup_pool_mode: PoolMode;
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

type AvailableAccount = { id: string; email: string; type: string; status: string; health_score: number };

function AddPoolModal({ onClose, onAdd }: { onClose: () => void; onAdd: (acct: PoolAccount) => void }) {
  const [tab, setTab] = useState<'existing' | 'gmail-oauth' | 'gmail-app' | 'smtp'>('existing');
  const [email, setEmail] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [appPass, setAppPass] = useState('');
  const [warmupTarget, setWarmupTarget] = useState('40');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [available, setAvailable] = useState<AvailableAccount[]>([]);
  const [availLoading, setAvailLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (tab === 'existing') {
      setAvailLoading(true);
      fetch('/api/admin/warmup/pool/available').then(r => r.json()).then(d => {
        setAvailable(Array.isArray(d) ? d : []);
      }).finally(() => setAvailLoading(false));
    }
  }, [tab]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const handlePromoteExisting = async () => {
    if (selectedIds.size === 0) { setError('Select at least one account.'); return; }
    setSaving(true);
    setError('');
    for (const id of selectedIds) {
      const res = await fetch('/api/admin/warmup/pool', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, promote: true }),
      });
      const data = await res.json();
      if (!data.error) onAdd(data);
    }
    setSaving(false);
    onClose();
  };

  const handleAdd = async () => {
    if (tab === 'gmail-oauth') { window.location.href = '/api/admin/warmup/oauth/google'; return; }
    if (tab === 'existing') { handlePromoteExisting(); return; }
    if (!email) { setError('Email address is required.'); return; }
    if (tab === 'gmail-app' && !appPass) { setError('App password is required.'); return; }
    if (tab === 'smtp' && (!smtpHost || !smtpUser || !smtpPass)) { setError('All SMTP fields are required.'); return; }
    setSaving(true);
    setError('');
    const payload = tab === 'gmail-app'
      ? { email, type: 'gmail-app', smtp_host: 'smtp.gmail.com', smtp_port: 587, smtp_user: email, smtp_pass: appPass, warmup_target: Number(warmupTarget) }
      : { email, type: 'smtp', smtp_host: smtpHost, smtp_port: Number(smtpPort), smtp_user: smtpUser, smtp_pass: smtpPass, warmup_target: Number(warmupTarget) };
    const res = await fetch('/api/admin/warmup/pool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
            <p className="text-xs text-gray-400 mt-0.5">Add an account to the shared warmup pool.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

          {/* Tab selector */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Source</label>
            <div className="grid grid-cols-4 gap-1.5">
              {([
                ['existing', 'My Accounts'],
                ['gmail-oauth', 'Gmail OAuth'],
                ['gmail-app', 'App Pass'],
                ['smtp', 'SMTP'],
              ] as const).map(([val, label]) => (
                <button key={val} type="button" onClick={() => { setTab(val); setError(''); }}
                  className={`py-2 rounded-xl text-[11px] font-bold border transition-all ${
                    tab === val ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Existing accounts list */}
          {tab === 'existing' && (
            <div>
              {availLoading ? (
                <p className="text-xs text-gray-400 text-center py-6">Loading accounts…</p>
              ) : available.length === 0 ? (
                <div className="text-center py-6 text-sm text-gray-400">
                  All connected accounts are already in the pool.
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {available.map(a => (
                    <label key={a.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedIds.has(a.id) ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="checkbox" checked={selectedIds.has(a.id)} onChange={() => toggleSelect(a.id)} className="accent-blue-600"/>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{a.email}</p>
                        <p className="text-[10px] text-gray-400 capitalize">{a.type} · {a.status}</p>
                      </div>
                      <span className={`text-xs font-bold ${a.health_score >= 80 ? 'text-emerald-600' : a.health_score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{a.health_score}%</span>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-2">Selected accounts will be marked as warmup pool accounts and start warming immediately.</p>
            </div>
          )}

          {/* Gmail OAuth */}
          {tab === 'gmail-oauth' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-900">Connect Gmail with OAuth</p>
                <p className="text-xs text-gray-400 mt-1">Redirected to Google to authorize — account added to pool automatically.</p>
              </div>
              <button onClick={() => { window.location.href = '/api/admin/warmup/oauth/google'; }}
                className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </button>
            </div>
          )}

          {/* Gmail App Password */}
          {tab === 'gmail-app' && (
            <>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Gmail Address</label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@gmail.com"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">App Password</label>
                <input type="password" value={appPass} onChange={e => setAppPass(e.target.value)} placeholder="xxxx xxxx xxxx xxxx"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                <p className="text-[10px] text-gray-400 mt-1">myaccount.google.com → Security → App Passwords</p>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Warmup Target (emails/day)</label>
                <input type="number" value={warmupTarget} onChange={e => setWarmupTarget(e.target.value)} min={5} max={100}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            </>
          )}

          {/* Custom SMTP */}
          {tab === 'smtp' && (
            <>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Email Address</label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="pool@yourdomain.com"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">SMTP Host</label>
                  <input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.yourdomain.com"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">SMTP Port</label>
                  <input value={smtpPort} onChange={e => setSmtpPort(e.target.value)} placeholder="587"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Username</label>
                  <input value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="user@domain.com"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Password</label>
                  <input type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} placeholder="••••••••"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Warmup Target (emails/day)</label>
                <input type="number" value={warmupTarget} onChange={e => setWarmupTarget(e.target.value)} min={5} max={100}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            </>
          )}
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700">Cancel</button>
          {tab !== 'gmail-oauth' && (
            <button onClick={handleAdd} disabled={saving || (tab === 'existing' && selectedIds.size === 0)}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Adding…' : tab === 'existing' ? `Add ${selectedIds.size > 0 ? selectedIds.size : ''} to Pool` : 'Add to Pool'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onToggle} disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 disabled:opacity-50 ${on ? 'bg-blue-600' : 'bg-gray-200'}`}>
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`}/>
    </button>
  );
}

function AdminWarmupPageInner() {
  const [accounts, setAccounts] = useState<WarmupAccount[]>([]);
  const [poolAccounts, setPoolAccounts] = useState<PoolAccount[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, warming: 0, healthy: 0, at_risk: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'warming' | 'healthy' | 'at_risk'>('all');
  const [showAddPool, setShowAddPool] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [globalPoolMode, setGlobalPoolMode] = useState<PoolMode>('admin_pool');
  const [settingGlobalMode, setSettingGlobalMode] = useState(false);
  const [triggeringWarmup, setTriggeringWarmup] = useState(false);
  const searchParams = useSearchParams();

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  useEffect(() => {
    const connected = searchParams.get('connected');
    const refreshed = searchParams.get('refreshed');
    const error = searchParams.get('error');
    const msg = searchParams.get('msg');

    if (connected === 'gmail') {
      showToast('Gmail account connected and added to warmup pool!');
      // Reload pool accounts to show the new one
      fetch('/api/admin/warmup/pool').then(r => r.json()).then(pool => {
        if (Array.isArray(pool)) setPoolAccounts(pool);
      });
    }
    if (refreshed === 'gmail') {
      showToast('Gmail already in pool — OAuth tokens refreshed!');
      // Re-fetch pool accounts to show the account
      fetch('/api/admin/warmup/pool').then(r => r.json()).then(pool => {
        if (Array.isArray(pool)) setPoolAccounts(pool);
      });
    }
    if (error === 'oauth_failed') setToast('Google OAuth failed — please try again.');
    if (error === 'update_failed') setToast('Failed to refresh Gmail tokens — please try again.');
    if (error === 'insert_failed') {
      setToast(`Failed to add pool account: ${msg ? decodeURIComponent(msg) : 'Please try again.'}`);
    }

    if (connected || refreshed || error) {
      window.history.replaceState({}, '', '/admin/warmup');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/warmup').then(r => r.json()),
      fetch('/api/admin/warmup/pool').then(r => r.json()),
    ]).then(([warmup, pool]) => {
      if (!warmup.error) { setAccounts(warmup.accounts); setStats(warmup.stats); }
      if (Array.isArray(pool)) setPoolAccounts(pool);
    }).finally(() => setLoading(false));
  }, []);

  const toggleWarmup = async (id: string, currentlyEnabled: boolean) => {
    setTogglingId(id);
    const enabled = !currentlyEnabled;
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, warmup_enabled: enabled, status: enabled ? 'warming' : 'active' } : a));
    await fetch('/api/admin/warmup', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, warmup_enabled: enabled }),
    });
    setTogglingId(null);
    showToast(enabled ? 'Warmup enabled' : 'Warmup disabled');
  };

  const setPoolMode = async (id: string, warmup_pool_mode: PoolMode) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, warmup_pool_mode } : a));
    await fetch('/api/admin/warmup', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, warmup_pool_mode }),
    });
    showToast('Pool mode updated');
  };

  const handleDeletePool = async (id: string) => {
    if (!confirm('Remove this account from the warmup pool?')) return;
    await fetch('/api/admin/warmup/pool', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setPoolAccounts(prev => prev.filter(a => a.id !== id));
    showToast('Pool account removed');
  };

  const triggerWarmupNow = async () => {
    setTriggeringWarmup(true);
    const res = await fetch('/api/admin/warmup/trigger', { method: 'POST' });
    const d = await res.json();
    setTriggeringWarmup(false);
    showToast(res.ok ? d.message : (d.error || 'Trigger failed'));
  };

  const setAllPoolMode = async (mode: PoolMode) => {
    setSettingGlobalMode(true);
    setGlobalPoolMode(mode);
    await fetch('/api/admin/warmup', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ set_all_pool_mode: mode }),
    });
    setAccounts(prev => prev.map(a => ({ ...a, warmup_pool_mode: mode })));
    setSettingGlobalMode(false);
    showToast(`Pool mode set to "${mode === 'admin_pool' ? 'Admin Pool Only' : mode === 'both' ? 'Both (Admin + User)' : 'User-to-User'}" for all accounts`);
  };

  const updatePoolTarget = async (id: string, warmup_target: number) => {
    setPoolAccounts(prev => prev.map(a => a.id === id ? { ...a, warmup_target } : a));
    await fetch('/api/admin/warmup/pool', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, warmup_target }),
    });
    showToast('Target updated');
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
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Platform Pool Accounts</h2>
              <p className="text-xs text-gray-400 mt-0.5">Accounts in the shared warmup pool. Users' accounts warm with these.</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={triggerWarmupNow} disabled={triggeringWarmup}
                title="Manually trigger warmup cycle right now instead of waiting 6h"
                className="flex items-center gap-2 bg-emerald-600 text-white text-xs font-bold rounded-xl px-3 py-2 hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                {triggeringWarmup ? (
                  <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                )}
                {triggeringWarmup ? 'Triggering…' : 'Run Now'}
              </button>
              <button onClick={() => setShowAddPool(true)}
                className="flex items-center gap-2 bg-blue-600 text-white text-xs font-bold rounded-xl px-3 py-2 hover:bg-blue-700 shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                Add Account
              </button>
            </div>
          </div>
          {/* Global pool mode control */}
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <span className="text-[11px] font-bold text-gray-400 uppercase shrink-0">Warmup Mode for All Users:</span>
            <div className="flex gap-1">
              {([
                ['admin_pool', 'Admin Pool Only'],
                ['both', 'Admin + User'],
                ['user_to_user', 'User to User'],
              ] as const).map(([val, label]) => (
                <button key={val} type="button" disabled={settingGlobalMode}
                  onClick={() => setAllPoolMode(val)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all disabled:opacity-50 ${
                    globalPoolMode === val ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-gray-400">Applies to all user accounts instantly</span>
          </div>
        </div>

        {poolAccounts.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <p className="text-sm font-semibold text-gray-500 mb-1">No pool accounts yet</p>
            <p className="text-xs text-gray-400 mb-3">Add Gmail or SMTP accounts here to seed the warmup pool for all users.</p>
            <button onClick={() => setShowAddPool(true)} className="text-sm font-bold text-blue-600 hover:text-blue-700">+ Add pool account</button>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-400 uppercase whitespace-nowrap">Email</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-400 uppercase whitespace-nowrap">Health</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-400 uppercase whitespace-nowrap">Progress</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-400 uppercase whitespace-nowrap">Sent Today</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-400 uppercase whitespace-nowrap">Daily Target</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-400 uppercase whitespace-nowrap"></th>
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
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number" min={5} max={150} step={5}
                          value={a.warmup_target || 40}
                          onChange={e => updatePoolTarget(a.id, Number(e.target.value))}
                          className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-xs text-center font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"/>
                        <span className="text-[10px] text-gray-400">/day</span>
                      </div>
                    </td>
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
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Account</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">User</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Health</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Progress</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Today</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Pool Mode</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Warmup</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-3.5 bg-gray-100 rounded animate-pulse"/></td>)}</tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">No accounts found.</td></tr>
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
                        <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 capitalize ${
                          a.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                          a.status === 'warming' ? 'bg-amber-50 text-amber-700' :
                          (a.status === 'error' || a.status === 'login') ? 'bg-red-50 text-red-600' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {a.status === 'login' ? 'Login Error' : a.status}
                        </span>
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
                        <select
                          value={a.warmup_pool_mode || 'admin_pool'}
                          onChange={e => setPoolMode(a.id, e.target.value as PoolMode)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700 font-medium">
                          <option value="admin_pool">Admin Pool</option>
                          <option value="user_to_user">User ↔ User</option>
                          <option value="both">Both</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <Toggle on={a.warmup_enabled} disabled={togglingId === a.id} onToggle={() => toggleWarmup(a.id, a.warmup_enabled)}/>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">{filtered.length} account{filtered.length !== 1 ? 's' : ''} shown</p>
            <p className="text-[10px] text-gray-400">Pool Mode: Admin Pool = warms with platform accounts only · User ↔ User = warms with other users · Both = all accounts</p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AdminWarmupPage() {
  return (
    <Suspense fallback={<main className="flex-1 p-6"><div className="h-8 w-48 bg-gray-100 rounded animate-pulse"/></main>}>
      <AdminWarmupPageInner />
    </Suspense>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { SkeletonRow } from '@/components/Skeleton';

type WarmupAccount = {
  id: string;
  email: string;
  type: string;
  warmup_enabled: boolean;
  warmup_day: number;
  warmup_target: number;
  warmup_emails_sent: number;
  health_score: number;
  sent_today: number;
  status: 'active' | 'warming' | 'error' | 'paused';
};

const tabs = [
  { id: 'accounts', label: 'Accounts' },
  { id: 'settings', label: 'Settings' },
  { id: 'stats', label: 'Stats' },
];

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${on ? 'bg-blue-600' : 'bg-gray-200'}`}>
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`}/>
    </button>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="shrink-0">
      <circle cx="26" cy="26" r={r} fill="none" stroke="#f3f4f6" strokeWidth="5"/>
      <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 26 26)"/>
      <text x="26" y="30" textAnchor="middle" fontSize="11" fontWeight="700" fill="#111">{score}</text>
    </svg>
  );
}

function RampBar({ day, target }: { day: number; target: number }) {
  const pct = Math.min(100, Math.round((Math.min(day, 30) / 30) * 100));
  const todayTarget = day <= 0 ? 2 : Math.max(2, Math.floor(target * (Math.min(day, 30) / 30)));
  return (
    <div className="flex flex-col gap-1 min-w-0 flex-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400">Day {day}</span>
        <span className="text-[10px] font-semibold text-gray-600">{todayTarget}/{target}/day</span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }}/>
      </div>
    </div>
  );
}

export default function WarmupPage() {
  const [tab, setTab] = useState('accounts');
  const [accounts, setAccounts] = useState<WarmupAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetch('/api/warmup')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAccounts(data); })
      .finally(() => setLoading(false));
  }, []);

  const toggleWarmup = async (id: string, currentlyEnabled: boolean) => {
    const enabled = !currentlyEnabled;
    setAccounts(prev => prev.map(a => a.id === id
      ? { ...a, warmup_enabled: enabled, status: enabled ? 'warming' : 'active', warmup_day: enabled ? 0 : a.warmup_day }
      : a
    ));
    setSavingId(id);
    const res = await fetch('/api/warmup', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: id, enabled }),
    });
    const data = await res.json();
    if (!data.error) showToast(enabled ? 'Warmup enabled — ramp starts next cycle' : 'Warmup disabled');
    setSavingId(null);
  };

  const updateTarget = async (id: string, warmup_target: number) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, warmup_target } : a));
    await fetch('/api/warmup', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: id, warmup_target }),
    });
  };

  const warmingAccounts = accounts.filter(a => a.warmup_enabled || a.status === 'warming');
  const avgScore = accounts.length
    ? Math.round(accounts.reduce((s, a) => s + (a.health_score || 0), 0) / accounts.length)
    : 0;
  const totalSentToday = warmingAccounts.reduce((s, a) => s + (a.sent_today || 0), 0);
  const totalWarmupSent = warmingAccounts.reduce((s, a) => s + (a.warmup_emails_sent || 0), 0);

  return (
    <main className="flex-1 p-6 space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm font-semibold rounded-xl px-5 py-3 shadow-xl z-50 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Email Warmup</h1>
          <p className="text-sm text-gray-400 mt-0.5">Automatically build sender reputation to avoid the spam folder.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Accounts warming', value: String(warmingAccounts.length) },
          { label: 'Avg health score', value: accounts.length ? `${avgScore}%` : '—' },
          { label: 'Emails sent today', value: String(totalSentToday) },
          { label: 'Total warmup sent', value: totalWarmupSent.toLocaleString() },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-400 mb-3">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'accounts' && (
        <>
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i}/>)}
            </div>
          ) : accounts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-5">
                <svg className="w-7 h-7 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z"/>
                </svg>
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">No accounts connected</h3>
              <p className="text-sm text-gray-400 mb-6 max-w-sm leading-relaxed">
                Connect an email account first, then enable warmup to automatically build its sender reputation.
              </p>
              <a href="/dashboard/email-accounts"
                className="bg-blue-600 text-white text-sm font-semibold rounded-xl px-6 py-2.5 hover:bg-blue-700 transition-colors">
                Connect email account →
              </a>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 grid grid-cols-[2fr_1fr_auto_2fr_1fr_auto] gap-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <span>Account</span><span>Status</span><span>Score</span><span>Ramp Progress</span><span>Health</span><span>Warmup</span>
              </div>
              {accounts.map(acc => (
                <div key={acc.id} className="px-6 py-4 border-b border-gray-100 last:border-0 grid grid-cols-[2fr_1fr_auto_2fr_1fr_auto] gap-4 items-center">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">{acc.email}</p>
                    <p className="text-[10px] text-gray-400">{acc.type} · {acc.warmup_emails_sent} warmup sent</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      acc.status === 'active' ? 'bg-emerald-400' :
                      acc.status === 'warming' ? 'bg-amber-400 animate-pulse' :
                      (acc.status === 'error' || acc.status === 'login') ? 'bg-red-400' : 'bg-gray-300'
                    }`}/>
                    {(acc.status === 'error' || acc.status === 'login') ? (
                      <span className="text-xs text-red-600 font-semibold flex items-center gap-1.5">
                        Auth Error
                        {acc.type === 'gmail-oauth' && (
                          <a href="/api/email-accounts/oauth/google" className="text-blue-600 hover:underline text-[10px]">Re-connect →</a>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-600 capitalize">{acc.status}</span>
                    )}
                  </div>
                  <ScoreRing score={acc.health_score || 0}/>
                  {acc.warmup_enabled ? (
                    <RampBar day={acc.warmup_day || 0} target={acc.warmup_target || 40}/>
                  ) : (
                    <span className="text-xs text-gray-400">Warmup off</span>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${(acc.health_score || 0) >= 80 ? 'bg-emerald-500' : (acc.health_score || 0) >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                        style={{ width: `${acc.health_score || 0}%` }}/>
                    </div>
                    <span className="text-xs font-semibold text-gray-700">{acc.health_score || 0}%</span>
                  </div>
                  <div className="relative">
                    {savingId === acc.id && (
                      <svg className="animate-spin w-4 h-4 text-blue-500 absolute -left-6 top-0.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                    )}
                    <Toggle
                      on={acc.warmup_enabled || acc.status === 'warming'}
                      onToggle={() => toggleWarmup(acc.id, acc.warmup_enabled || acc.status === 'warming')}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">How warmup works</h3>
            <div className="grid sm:grid-cols-4 gap-4">
              {[
                { step: '1', title: 'Enable warmup', desc: 'Toggle warmup on for any connected account', color: 'blue' },
                { step: '2', title: 'Auto-sends', desc: 'System sends emails between warmed accounts every 6h', color: 'indigo' },
                { step: '3', title: 'Score grows', desc: 'Health score improves over 2–4 weeks', color: 'emerald' },
                { step: '4', title: 'Safe to send', desc: 'Launch campaigns with better inbox placement', color: 'violet' },
              ].map(s => (
                <div key={s.step} className="flex flex-col gap-2">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold text-white shrink-0 ${
                    s.color === 'blue' ? 'bg-blue-600' : s.color === 'indigo' ? 'bg-indigo-600' : s.color === 'emerald' ? 'bg-emerald-600' : 'bg-violet-600'
                  }`}>{s.step}</span>
                  <p className="text-xs font-bold text-gray-900">{s.title}</p>
                  <p className="text-[11px] text-gray-400 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'settings' && (
        <div className="space-y-4 max-w-xl">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            <div>
              <h2 className="text-base font-bold text-gray-900">Per-Account Settings</h2>
              <p className="text-sm text-gray-400 mt-0.5">Set warmup target for each account individually.</p>
            </div>
            {accounts.length === 0 ? (
              <p className="text-sm text-gray-400">No accounts connected yet.</p>
            ) : accounts.map(acc => (
              <div key={acc.id} className="border border-gray-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${acc.warmup_enabled ? 'bg-amber-400' : 'bg-gray-300'}`}/>
                  <p className="text-sm font-semibold text-gray-900 truncate">{acc.email}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-gray-700">Daily email target</label>
                    <span className="text-xs font-bold text-blue-600">{acc.warmup_target || 40} / day</span>
                  </div>
                  <input type="range" min={5} max={100} step={5}
                    value={acc.warmup_target || 40}
                    onChange={e => updateTarget(acc.id, Number(e.target.value))}
                    className="w-full accent-blue-600"/>
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>5 (slow)</span><span>100 (aggressive)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <div>
                <p className="text-sm font-bold text-blue-900 mb-1">Warmup Pool</p>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Warmup emails are sent between all {accounts.filter(a => a.warmup_enabled).length} warmed accounts in your pool.
                  The more accounts you warm, the more realistic the warmup traffic.
                  Warmup runs automatically every 6 hours.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'stats' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-5">Warmup Performance</h3>
            {accounts.filter(a => a.warmup_enabled).length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <p className="text-sm font-semibold text-gray-400">No warmup data yet</p>
                <p className="text-xs text-gray-400 mt-0.5">Enable warmup on an account to see stats here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {accounts.filter(a => a.warmup_enabled).map(acc => {
                  const pct = Math.min(100, Math.round((Math.min(acc.warmup_day || 0, 30) / 30) * 100));
                  return (
                    <div key={acc.id} className="border border-gray-100 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{acc.email}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{acc.warmup_emails_sent} total warmup emails sent</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ScoreRing score={acc.health_score || 0}/>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-gray-700">Warmup progress</span>
                          <span className="text-xs text-gray-500">Day {acc.warmup_day || 0} / 30</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }}/>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {pct >= 100 ? 'Fully warmed — maintaining at target volume' : `${pct}% complete — ramping up to ${acc.warmup_target || 40}/day`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Health Score Guide</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { range: '80–100', label: 'Excellent', color: 'emerald', desc: 'Safe to send campaigns' },
                { range: '50–79', label: 'Moderate', color: 'amber', desc: 'Keep warming, limit sends' },
                { range: '0–49', label: 'Poor', color: 'red', desc: 'Avoid campaigns — risk of spam' },
              ].map(s => (
                <div key={s.range} className={`rounded-xl p-4 border ${
                  s.color === 'emerald' ? 'bg-emerald-50 border-emerald-100' :
                  s.color === 'amber' ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${s.color === 'emerald' ? 'bg-emerald-500' : s.color === 'amber' ? 'bg-amber-500' : 'bg-red-500'}`}/>
                    <span className="text-xs font-bold text-gray-700">{s.range} · {s.label}</span>
                  </div>
                  <p className="text-[11px] text-gray-500">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

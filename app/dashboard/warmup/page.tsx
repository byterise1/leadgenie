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
  status: 'active' | 'warming' | 'error' | 'paused' | 'login' | string;
};

type HistoryRow = {
  email: string;
  date: string;
  day_number: number;
  emails_sent: number;
  health_score: number;
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

const WARMUP_DAILY_TARGETS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40];

function RampBar({ day }: { day: number }) {
  const clampedDay = Math.min(day, 14);
  const pct = Math.min(100, Math.round((clampedDay / 14) * 100));
  const todayTarget = day >= 1 && day <= 14 ? WARMUP_DAILY_TARGETS[day] : day > 14 ? 40 : 2;
  return (
    <div className="flex flex-col gap-1 min-w-0 flex-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400">Day {day} of 14</span>
        <span className="text-[10px] font-semibold text-gray-600">{todayTarget}/day target</span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }}/>
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-emerald-700 bg-emerald-50' : score >= 50 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50';
  return <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${color}`}>{score}</span>;
}

export default function WarmupPage() {
  const [tab, setTab] = useState('accounts');
  const [accounts, setAccounts] = useState<WarmupAccount[]>([]);
  const [history, setHistory] = useState<Record<string, HistoryRow[]>>({});
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetch('/api/warmup')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setAccounts(data);
        else if (data?.error) setApiError(data.error);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== 'stats') return;
    setHistoryLoading(true);
    fetch('/api/warmup/history')
      .then(r => r.json())
      .then(data => { if (!data.error) setHistory(data); })
      .finally(() => setHistoryLoading(false));
  }, [tab]);

  const toggleWarmup = async (id: string, currentlyEnabled: boolean) => {
    const enabled = !currentlyEnabled;
    setAccounts(prev => prev.map(a => a.id !== id ? a : { ...a, warmup_enabled: enabled, status: enabled ? 'warming' : 'active' }));
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

  // Check if an account has prior history from before it was connected to this user
  const hasPriorHistory = (email: string) => {
    const rows = history[email] ?? [];
    return rows.length > 0;
  };

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

      {apiError && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <div>
            <p className="text-sm font-bold text-red-800">Could not load warmup accounts</p>
            <p className="text-xs text-red-600 mt-0.5 font-mono">{apiError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Accounts warming', value: String(warmingAccounts.length) },
          { label: 'Avg health score', value: accounts.length ? `${avgScore}%` : '—' },
          { label: 'Emails sent today', value: String(totalSentToday) },
          { label: 'Total warmup sent', value: totalWarmupSent.toLocaleString() },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 mb-2">{s.label}</p>
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
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[700px] border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <th className="px-6 py-3 text-left">Account</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Score</th>
                      <th className="px-4 py-3 text-left">Ramp Progress</th>
                      <th className="px-4 py-3 text-left">Health</th>
                      <th className="px-4 py-3 text-left">Warmup</th>
                    </tr>
                  </thead>
                  <tbody>
                {accounts.map(acc => {
                  const rows = history[acc.email] ?? [];
                  const totalHistorySent = rows.reduce((s, r) => s + r.emails_sent, 0);
                  const historyDays = rows.length;
                  const showHistoryBadge = historyDays > 0 && (acc.warmup_day ?? 0) === 0;
                  return (
                    <tr key={acc.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">{acc.email}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <p className="text-[10px] text-gray-400">{acc.type} · {acc.warmup_emails_sent} warmup sent</p>
                          {showHistoryBadge && (
                            <span className="text-[10px] font-bold bg-violet-100 text-violet-700 rounded-full px-1.5 py-0.5">
                              {historyDays}d prior history
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
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
                      </td>
                      <td className="px-4 py-4">
                        <ScoreRing score={acc.health_score || 0}/>
                      </td>
                      <td className="px-4 py-4">
                        {acc.warmup_enabled && (acc.warmup_day ?? 0) < 14 ? (
                          <RampBar day={acc.warmup_day || 0}/>
                        ) : acc.warmup_enabled && (acc.warmup_day ?? 0) >= 14 ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-semibold text-emerald-600">Running at 40/day ✓</span>
                            <span className="text-[10px] text-gray-400">14-day ramp complete — maintaining</span>
                          </div>
                        ) : (acc.warmup_day ?? 0) >= 14 ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-semibold text-emerald-600">14-day warmup complete ✓</span>
                            <span className="text-[10px] text-gray-400">Toggle on to continue at 40/day</span>
                          </div>
                        ) : showHistoryBadge ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-semibold text-violet-600">Previously warmed {historyDays} days</span>
                            <span className="text-[10px] text-gray-400">{totalHistorySent} emails sent in prior sessions</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Warmup off</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${(acc.health_score || 0) >= 80 ? 'bg-emerald-500' : (acc.health_score || 0) >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                              style={{ width: `${acc.health_score || 0}%` }}/>
                          </div>
                          <span className="text-xs font-semibold text-gray-700">{acc.health_score || 0}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
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
                      </td>
                    </tr>
                  );
                })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">How warmup works</h3>
            <div className="grid sm:grid-cols-4 gap-4">
              {[
                { step: '1', title: 'Enable warmup', desc: 'Toggle warmup on for any connected account', color: 'blue' },
                { step: '2', title: 'Auto-sends', desc: 'System sends emails between warmed accounts every 6h', color: 'indigo' },
                { step: '3', title: 'Score grows', desc: 'Health score improves +2 pts/day over 14 days', color: 'emerald' },
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
        <div className="space-y-4 max-w-2xl">
          {/* What is daily limit — explainer */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">What is the daily warmup limit?</h3>
                <p className="text-xs text-gray-500 leading-relaxed max-w-lg">
                  This is the <span className="font-semibold text-gray-700">maximum number of warmup emails</span> your inbox will send per day
                  during the ramp period. The system starts low (2/day on Day 1) and gradually increases
                  toward your limit over 14 days. Keeping it between <span className="font-semibold text-gray-700">30–50/day</span> is recommended —
                  high enough to build reputation fast, low enough to look natural to email providers.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { label: 'New domain', range: '10–20/day', color: 'blue' },
                    { label: 'Established domain', range: '30–50/day', color: 'emerald' },
                    { label: 'High volume', range: '60–100/day', color: 'amber' },
                  ].map(r => (
                    <span key={r.label} className={`text-[11px] font-semibold rounded-full px-2.5 py-1 ${
                      r.color === 'blue' ? 'bg-blue-50 text-blue-700' :
                      r.color === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {r.label}: {r.range}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Per-account limit selector */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Daily Warmup Limit</h2>
              <p className="text-xs text-gray-400 mt-0.5">Set the peak number of warmup emails each inbox sends per day after the 14-day ramp.</p>
            </div>
            {accounts.length === 0 ? (
              <div className="px-6 py-8 text-sm text-gray-400 text-center">No accounts connected.</div>
            ) : accounts.map((acc, idx) => {
              const target = acc.warmup_target ?? 40;
              const isRecommended = target >= 30 && target <= 50;
              return (
                <div key={acc.id} className={`px-6 py-4 flex items-center gap-4 ${idx !== accounts.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{acc.email}</p>
                      {!acc.warmup_enabled && (
                        <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 shrink-0">warmup off</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-[11px] text-gray-400">{acc.type} · Day {acc.warmup_day ?? 0} of 14</p>
                      {isRecommended && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">Recommended</span>
                      )}
                    </div>
                  </div>

                  {/* Limit selector — styled buttons for common values */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                      {[20, 30, 40, 50].map(v => (
                        <button key={v} onClick={() => updateTarget(acc.id, v)}
                          className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                            target === v
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-500 hover:bg-gray-50'
                          }`}>
                          {v}
                        </button>
                      ))}
                    </div>
                    <select
                      value={target}
                      onChange={e => updateTarget(acc.id, Number(e.target.value))}
                      className="border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0 min-w-[130px]">
                      {[10, 15, 20, 25, 30, 35, 40, 50, 60, 80, 100].map(v => (
                        <option key={v} value={v}>{v}/day{v === 40 ? ' (default)' : v >= 30 && v <= 50 ? ' ✓' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Warning for high values */}
          {accounts.some(a => (a.warmup_target ?? 40) > 60) && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4">
              <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              <p className="text-xs text-amber-700 leading-relaxed">
                <span className="font-bold">High limit detected.</span> Limits above 60/day can look unnatural to email providers on new or low-history domains. We recommend staying at 30–50/day unless your domain has been active for 6+ months.
              </p>
            </div>
          )}
        </div>
      )}

      {tab === 'stats' && (
        <div className="space-y-4">
          {/* Per-account history */}
          {historyLoading ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i}/>)}
            </div>
          ) : accounts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center text-center">
              <p className="text-sm font-semibold text-gray-400">No accounts connected</p>
              <p className="text-xs text-gray-400 mt-0.5">Connect an account and enable warmup to see history here.</p>
            </div>
          ) : (
            accounts.map(acc => {
              const rows = (history[acc.email] ?? []).slice().sort((a, b) => b.date.localeCompare(a.date));
              const totalSent = rows.reduce((s, r) => s + r.emails_sent, 0);
              const maxDayReached = rows.length > 0 ? Math.max(...rows.map(r => r.day_number)) : acc.warmup_day || 0;
              const latestScore = rows[0]?.health_score ?? acc.health_score ?? 0;
              const isExpanded = expandedEmail === acc.email;

              return (
                <div key={acc.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Account summary header */}
                  <button
                    onClick={() => setExpandedEmail(isExpanded ? null : acc.email)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50/60 transition-colors text-left">
                    <div className="flex items-center gap-4">
                      <ScoreRing score={latestScore}/>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{acc.email}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[11px] text-gray-400">Day {maxDayReached} reached</span>
                          <span className="text-[11px] text-gray-400">·</span>
                          <span className="text-[11px] text-gray-400">{totalSent.toLocaleString()} total warmup emails</span>
                          <span className="text-[11px] text-gray-400">·</span>
                          <span className="text-[11px] text-gray-400">{rows.length} days recorded</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {maxDayReached >= 14 && (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5">14-day complete ✓</span>
                      )}
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                      </svg>
                    </div>
                  </button>

                  {/* Daily history table — expanded */}
                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      {rows.length === 0 ? (
                        <div className="px-6 py-8 text-center">
                          <p className="text-sm text-gray-400">No history recorded yet.</p>
                          <p className="text-xs text-gray-400 mt-1">History is saved each time the warmup worker runs (every 6 hours).</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs min-w-[500px]">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="text-left px-6 py-2.5 font-bold text-gray-400 uppercase tracking-wider">Date</th>
                                <th className="text-left px-4 py-2.5 font-bold text-gray-400 uppercase tracking-wider">Day</th>
                                <th className="text-left px-4 py-2.5 font-bold text-gray-400 uppercase tracking-wider">Emails Sent</th>
                                <th className="text-left px-4 py-2.5 font-bold text-gray-400 uppercase tracking-wider">Health Score</th>
                                <th className="text-left px-4 py-2.5 font-bold text-gray-400 uppercase tracking-wider">Progress</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {rows.map(row => {
                                const pct = Math.min(100, Math.round((Math.min(row.day_number, 14) / 14) * 100));
                                return (
                                  <tr key={row.date} className="hover:bg-gray-50/60 transition-colors">
                                    <td className="px-6 py-3 font-medium text-gray-700">{row.date}</td>
                                    <td className="px-4 py-3 text-gray-600">
                                      {row.day_number <= 14 ? `Day ${row.day_number}` : `Day 14+ (${row.day_number})`}
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-gray-900">{row.emails_sent}</td>
                                    <td className="px-4 py-3">
                                      <ScoreBadge score={row.health_score}/>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }}/>
                                        </div>
                                        <span className="text-gray-400">{pct}%</span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Health score guide */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
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

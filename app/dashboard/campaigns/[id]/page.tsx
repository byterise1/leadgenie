'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Campaign = {
  id: string;
  name: string;
  status: string;
  created_at: string;
  goal?: string;
  daily_limit?: number;
  from_hour?: number;
  to_hour?: number;
  active_days?: string[];
  timezone?: string;
  start_date?: string | null;
  from_name?: string;
  min_delay_secs?: number;
  max_delay_secs?: number;
  followup_priority_mode?: 'auto' | 'manual';
  followup_weight_pct?: number | null;
  total_sent: number;
  total_opened: number;
  total_replied: number;
  total_clicked: number;
  email_steps: { id: string; subject: string; body?: string; delay_days?: number; delay?: number; step_number?: number; include_unsub?: boolean }[];
  campaign_accounts: { account: { id: string; email: string; type: string } }[];
};

type LeadRow = {
  id: string;
  status: string;
  current_step: number;
  last_sent_at: string | null;
  lead: { id: string; email: string; first_name?: string; last_name?: string; company?: string } | null;
  opened_at?: string | null;
  clicked_at?: string | null;
  replied_at?: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  active:    'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900',
  paused:    'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900',
  completed: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900',
  draft:     'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700',
};

const LEAD_STATUS_BADGE: Record<string, string> = {
  replied:   'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400',
  opened:    'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400',
  sent:      'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
  bounced:   'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400',
  opted_out: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400',
};

function pct(n: number, total: number) {
  if (!total) return '0%';
  return `${Math.round((n / total) * 100)}%`;
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(d: string | null) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    + ' · '
    + dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [error, setError] = useState('');
  const [toggling, setToggling] = useState(false);
  const [tab, setTab] = useState<'overview' | 'leads'>('overview');

  const refresh = useCallback(() => {
    fetch(`/api/campaigns/${id}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setCampaign(d); })
      .catch(() => setError('Failed to load campaign'))
      .finally(() => setLoading(false));
    fetch(`/api/campaigns/${id}/leads`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setLeads(d); })
      .catch(() => {})
      .finally(() => setLeadsLoading(false));
  }, [id]);

  // Stats/lead progress keep changing while a campaign is running (sends, opens,
  // replies) — poll so this page stays live instead of needing a manual reload,
  // same pattern already used on the email accounts page.
  useEffect(() => {
    refresh();
    const pollId = setInterval(refresh, 10000);
    return () => clearInterval(pollId);
  }, [refresh]);

  async function toggleStatus() {
    if (!campaign || toggling) return;
    const next = campaign.status === 'active' ? 'paused' : 'active';
    setToggling(true);
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      const d = await res.json();
      if (!d.error) setCampaign(prev => prev ? { ...prev, status: next } : prev);
    } finally { setToggling(false); }
  }

  const [savingPriority, setSavingPriority] = useState(false);
  async function updatePriority(patch: { followup_priority_mode?: 'auto' | 'manual'; followup_weight_pct?: number }) {
    if (!campaign) return;
    setCampaign(prev => prev ? { ...prev, ...patch } : prev);
    setSavingPriority(true);
    try {
      await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    } finally { setSavingPriority(false); }
  }

  // ── Step editing (only ever allowed on a paused/draft campaign — see
  // requireEditableCampaign in the API routes, which enforces this too) ──
  const [stepBusy, setStepBusy] = useState(false);
  const [stepError, setStepError] = useState('');
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ subject: '', body: '', delay_days: 1 });
  const [addingStep, setAddingStep] = useState(false);
  const [newStepForm, setNewStepForm] = useState({ subject: '', body: '', delay_days: 1 });

  function startEditStep(step: { id: string; subject: string; body?: string; delay_days?: number; delay?: number }) {
    setStepError('');
    setEditingStepId(step.id);
    setEditForm({ subject: step.subject || '', body: step.body || '', delay_days: step.delay_days ?? step.delay ?? 1 });
  }

  async function saveEditStep(stepId: string) {
    setStepBusy(true); setStepError('');
    try {
      const res = await fetch(`/api/campaigns/${id}/steps/${stepId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const d = await res.json();
      if (d.error) { setStepError(d.error); return; }
      setEditingStepId(null);
      refresh();
    } finally { setStepBusy(false); }
  }

  async function deleteStep(stepId: string) {
    if (!confirm('Remove this step? Any lead currently on it will move to whatever comes next in the sequence.')) return;
    setStepBusy(true); setStepError('');
    try {
      const res = await fetch(`/api/campaigns/${id}/steps/${stepId}`, { method: 'DELETE' });
      const d = await res.json();
      if (d.error) { setStepError(d.error); return; }
      refresh();
    } finally { setStepBusy(false); }
  }

  async function moveStep(stepId: string, newPosition: number) {
    setStepBusy(true); setStepError('');
    try {
      const res = await fetch(`/api/campaigns/${id}/steps/${stepId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPosition }),
      });
      const d = await res.json();
      if (d.error) { setStepError(d.error); return; }
      refresh();
    } finally { setStepBusy(false); }
  }

  async function addStep() {
    if (!newStepForm.subject.trim() || !newStepForm.body.trim()) { setStepError('Subject and body are required'); return; }
    setStepBusy(true); setStepError('');
    try {
      const res = await fetch(`/api/campaigns/${id}/steps`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStepForm),
      });
      const d = await res.json();
      if (d.error) { setStepError(d.error); return; }
      setAddingStep(false);
      setNewStepForm({ subject: '', body: '', delay_days: 1 });
      refresh();
    } finally { setStepBusy(false); }
  }

  if (loading) {
    return (
      <main className="flex-1 p-6 space-y-6">
        <div className="h-7 w-48 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse"/>)}
        </div>
      </main>
    );
  }

  if (error || !campaign) {
    return (
      <main className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">{error || 'Campaign not found'}</p>
          <Link href="/dashboard/campaigns" className="text-sm font-bold text-blue-600 hover:underline">← Back to Campaigns</Link>
        </div>
      </main>
    );
  }

  const sent    = campaign.total_sent    ?? 0;
  const opened  = campaign.total_opened  ?? 0;
  const replied = campaign.total_replied ?? 0;
  const clicked = campaign.total_clicked ?? 0;

  const statCards = [
    { label: 'Sent',       value: String(sent),         sub: 'total emails',       color: 'text-gray-900 dark:text-white'  },
    { label: 'Opens',      value: pct(opened, sent),    sub: `${opened} unique`,   color: 'text-blue-600 dark:text-blue-400'  },
    { label: 'Replies',    value: pct(replied, sent),   sub: `${replied} replies`, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Clicks',     value: pct(clicked, sent),   sub: `${clicked} clicks`,  color: 'text-violet-600 dark:text-violet-400' },
  ];

  const isActive = campaign.status === 'active';
  const canToggle = campaign.status === 'active' || campaign.status === 'paused';
  const canEditSteps = campaign.status === 'paused' || campaign.status === 'draft';
  const sortedSteps = [...(campaign.email_steps ?? [])].sort((a, b) => (a.step_number ?? 0) - (b.step_number ?? 0));

  return (
    <main className="flex-1 p-6 space-y-6 min-w-0">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/campaigns" className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 font-medium">
              ← Campaigns
            </Link>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{campaign.name}</h1>
            <span className={`text-[10px] font-bold rounded-full px-2.5 py-1 border capitalize ${STATUS_BADGE[campaign.status] ?? STATUS_BADGE.draft}`}>
              {campaign.status}
            </span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Created {formatDate(campaign.created_at)}
            {campaign.goal && <> · {campaign.goal}</>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canToggle && (
            <button onClick={toggleStatus} disabled={toggling}
              className={`text-sm font-bold px-4 py-2 rounded-xl transition-colors ${
                isActive
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/60'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/60'
              }`}>
              {toggling ? '...' : isActive ? 'Pause' : 'Resume'}
            </button>
          )}
          <a href={`/api/campaigns/${id}/export`} download
            className="text-sm font-bold px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            Export CSV
          </a>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1.5">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
        {(['overview', 'leads'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg capitalize transition-colors ${
              tab === t
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Email Steps */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Email Sequence</h2>
              {canEditSteps ? (
                <button onClick={() => { setAddingStep(v => !v); setStepError(''); }}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900 hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors">
                  {addingStep ? 'Cancel' : '+ Add Step'}
                </button>
              ) : (
                <span className="text-[11px] text-gray-400 dark:text-gray-500">Pause to edit steps</span>
              )}
            </div>

            {stepError && (
              <div className="px-6 py-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-b border-red-100 dark:border-red-900">{stepError}</div>
            )}

            {sortedSteps.length === 0 ? (
              <div className="py-10 text-center text-gray-400 dark:text-gray-500 text-sm">No email steps configured.</div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {sortedSteps.map((step, i) => (
                  <div key={step.id} className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {step.subject || '(no subject)'}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {i === 0 ? 'Sent immediately' : (() => { const d = step.delay_days ?? step.delay ?? 1; return `+${d} day${d !== 1 ? 's' : ''} after previous`; })()}
                        </p>
                      </div>
                      {canEditSteps && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button disabled={stepBusy || i === 0} onClick={() => moveStep(step.id, i - 1)}
                            className="w-7 h-7 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent text-xs font-bold">↑</button>
                          <button disabled={stepBusy || i === sortedSteps.length - 1} onClick={() => moveStep(step.id, i + 1)}
                            className="w-7 h-7 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent text-xs font-bold">↓</button>
                          <button disabled={stepBusy} onClick={() => startEditStep(step)}
                            className="text-xs font-bold px-2.5 py-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">Edit</button>
                          <button disabled={stepBusy} onClick={() => deleteStep(step.id)}
                            className="text-xs font-bold px-2.5 py-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">Remove</button>
                        </div>
                      )}
                    </div>

                    {editingStepId === step.id && (
                      <div className="mt-3 ml-11 space-y-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                        <input value={editForm.subject} onChange={e => setEditForm(f => ({ ...f, subject: e.target.value }))}
                          placeholder="Subject" className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" />
                        <textarea value={editForm.body} onChange={e => setEditForm(f => ({ ...f, body: e.target.value }))}
                          placeholder="Body" rows={4} className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" />
                        {i > 0 && (
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            Wait
                            <input type="number" min={1} value={editForm.delay_days}
                              onChange={e => setEditForm(f => ({ ...f, delay_days: Number(e.target.value) || 1 }))}
                              className="w-16 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" />
                            day(s) after the previous step
                          </div>
                        )}
                        <div className="flex gap-2 pt-1">
                          <button disabled={stepBusy} onClick={() => saveEditStep(step.id)}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Save</button>
                          <button disabled={stepBusy} onClick={() => setEditingStepId(null)}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {addingStep && (
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 space-y-2 bg-gray-50 dark:bg-gray-800/50">
                <input value={newStepForm.subject} onChange={e => setNewStepForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Subject" className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" />
                <textarea value={newStepForm.body} onChange={e => setNewStepForm(f => ({ ...f, body: e.target.value }))}
                  placeholder="Body" rows={4} className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" />
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  Wait
                  <input type="number" min={1} value={newStepForm.delay_days}
                    onChange={e => setNewStepForm(f => ({ ...f, delay_days: Number(e.target.value) || 1 }))}
                    className="w-16 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" />
                  day(s) after the previous step (ignored if this becomes the first step)
                </div>
                <button disabled={stepBusy} onClick={addStep}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Add Step</button>
              </div>
            )}
          </div>

          {/* Right column: Sending Accounts + Schedule */}
          <div className="space-y-6">
            {/* Sending Accounts */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">Sending Accounts</h2>
              </div>
              {(campaign.campaign_accounts ?? []).length === 0 ? (
                <div className="py-8 text-center text-gray-400 dark:text-gray-500 text-sm">No accounts linked.</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(campaign.campaign_accounts ?? []).map(ca => (
                    <div key={ca.account.id} className="flex items-center gap-3 px-6 py-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold shrink-0">
                        {ca.account.email[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ca.account.email}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{ca.account.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Follow-up Priority */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">Follow-up Priority</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Who gets today's sending capacity first when both are waiting: leads due for a follow-up, or brand new leads.</p>
              </div>
              <div className="px-6 py-4 space-y-3">
                <div className="flex gap-2">
                  {(['auto', 'manual'] as const).map(mode => (
                    <button key={mode} onClick={() => updatePriority(mode === 'auto' ? { followup_priority_mode: 'auto' } : { followup_priority_mode: 'manual', followup_weight_pct: campaign.followup_weight_pct ?? 90 })}
                      className={`flex-1 text-xs font-bold rounded-xl px-3 py-2 border transition-colors ${
                        (campaign.followup_priority_mode ?? 'auto') === mode
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}>
                      {mode === 'auto' ? 'Auto (recommended)' : 'Manual'}
                    </button>
                  ))}
                </div>
                {(campaign.followup_priority_mode ?? 'auto') === 'auto' ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                    The system adjusts this automatically — follow-ups get more of today's capacity when the backlog is heavy, and new leads get more when it's light. New leads are never fully blocked.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Follow-ups get</span>
                      <span className="font-bold text-gray-900 dark:text-white">{campaign.followup_weight_pct ?? 90}%</span>
                      <span className="text-gray-500 dark:text-gray-400">of capacity</span>
                    </div>
                    <input
                      type="range" min={0} max={100} step={5}
                      value={campaign.followup_weight_pct ?? 90}
                      onChange={e => updatePriority({ followup_priority_mode: 'manual', followup_weight_pct: Number(e.target.value) })}
                      className="w-full accent-blue-600"
                    />
                    {(campaign.followup_weight_pct ?? 90) >= 95 && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed">
                        At this level, new leads only get sent once every due follow-up is handled — they can wait days on a busy campaign.
                      </p>
                    )}
                  </div>
                )}
                {savingPriority && <p className="text-[10px] text-gray-400 dark:text-gray-500">Saving…</p>}
              </div>
            </div>

            {/* Schedule & Limits */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">Schedule & Limits</h2>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {[
                  {
                    label: 'Daily limit',
                    value: `${campaign.daily_limit ?? 50} emails/day`,
                  },
                  {
                    label: 'Send window',
                    value: campaign.from_hour != null && campaign.to_hour != null
                      ? `${String(campaign.from_hour).padStart(2,'0')}:00 – ${String(campaign.to_hour).padStart(2,'0')}:00`
                      : 'Any time',
                  },
                  {
                    label: 'Timezone',
                    value: campaign.timezone || 'UTC',
                  },
                  {
                    label: 'Active days',
                    value: (() => {
                      const days = campaign.active_days;
                      if (!days || !days.length) return 'Mon – Fri';
                      const names = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
                      // boolean[] format: [true,true,...] stored by worker
                      if (typeof days[0] === 'boolean') {
                        return (days as unknown as boolean[]).map((on, i) => on ? names[i] : null).filter(Boolean).join(', ') || 'Mon – Fri';
                      }
                      // string[] format: ['Monday','Tuesday',...]
                      return (days as string[]).map(d => String(d).slice(0, 3)).join(', ');
                    })(),
                  },
                  {
                    label: 'Start date',
                    value: campaign.start_date ? formatDate(campaign.start_date) : 'Immediately',
                  },
                  {
                    label: 'Delay between emails',
                    value: campaign.min_delay_secs != null && campaign.max_delay_secs != null
                      ? `${Math.round(campaign.min_delay_secs / 60)}–${Math.round(campaign.max_delay_secs / 60)} min`
                      : '—',
                  },
                  {
                    label: 'Leads total',
                    value: `${leads.length} leads${sent > 0 ? ` · ${sent} sent` : ''}`,
                  },
                  ...(campaign.daily_limit && leads.length > 0 ? [{
                    label: 'Est. completion',
                    value: (() => {
                      const steps = campaign.email_steps ?? [];
                      const totalSteps = steps.length;
                      const dailyLimit = campaign.daily_limit ?? 50;
                      // Total emails still to send across all leads × remaining steps
                      const totalEmailsLeft = leads.reduce((acc, l) => {
                        const done = l.current_step ?? 0;
                        return acc + Math.max(0, totalSteps - done);
                      }, 0);
                      if (totalEmailsLeft === 0) return 'Complete';
                      // Processing days = how many days at daily_limit to send all remaining emails
                      const processingDays = Math.ceil(totalEmailsLeft / dailyLimit);
                      // Step delay days = mandatory waits between steps (sum delay_days for steps 1+)
                      const stepDelayDays = steps.slice(1).reduce((acc, s) => acc + (s.delay_days ?? s.delay ?? 1), 0);
                      const totalDays = processingDays + stepDelayDays;
                      const end = new Date();
                      end.setDate(end.getDate() + totalDays);
                      return `~${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} (${totalDays}d)`;
                    })(),
                  }] : []),
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between px-6 py-3">
                    <span className="text-xs text-gray-400 dark:text-gray-500">{row.label}</span>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 text-right max-w-[60%]">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'leads' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Leads <span className="text-gray-400 dark:text-gray-500 font-normal">({leads.length})</span></h2>
          </div>
          {leadsLoading ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-40"/>
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-24 ml-auto"/>
                </div>
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="py-14 text-center text-gray-400 dark:text-gray-500 text-sm">No leads found for this campaign.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Lead</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Progress</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Opened</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Clicked</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Replied</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Last Sent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {leads.map(l => {
                    const totalSteps = (campaign.email_steps ?? []).length;
                    const stepsSent = l.current_step ?? 0;
                    const stepsLeft = Math.max(0, totalSteps - stepsSent);
                    return (
                    <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="px-6 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {l.lead?.first_name || l.lead?.last_name
                            ? `${l.lead.first_name || ''} ${l.lead.last_name || ''}`.trim()
                            : l.lead?.email || '—'}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{l.lead?.email}</p>
                      </td>
                      <td className="px-4 py-3 min-w-[140px]">
                        {l.status === 'pending' ? (
                          <span className="text-xs text-gray-400 dark:text-gray-500">Not started</span>
                        ) : l.status === 'completed' ? (
                          <div className="flex items-center gap-1.5">
                            <div className="flex gap-0.5">
                              {Array.from({ length: totalSteps }).map((_, i) => (
                                <div key={i} className="w-4 h-1.5 rounded-full bg-emerald-400 dark:bg-emerald-500"/>
                              ))}
                            </div>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">{totalSteps}/{totalSteps} done</span>
                          </div>
                        ) : l.status === 'replied' || l.status === 'bounced' || l.status === 'unsubscribed' ? (
                          // Sequence stopped early on purpose (reply/bounce/unsubscribe) — show
                          // how many actually went out, not a fake "all done". A lead who
                          // replied after 1 of 2 emails should never look identical to one who
                          // received the full sequence.
                          <div className="flex items-center gap-1.5">
                            <div className="flex gap-0.5">
                              {Array.from({ length: totalSteps }).map((_, i) => (
                                <div key={i} className={`w-4 h-1.5 rounded-full ${i < stepsSent ? 'bg-blue-500 dark:bg-blue-400' : 'bg-gray-200 dark:bg-gray-700'}`}/>
                              ))}
                            </div>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold whitespace-nowrap">
                              {stepsSent}/{totalSteps} sent · stopped ({l.status})
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <div className="flex gap-0.5">
                              {Array.from({ length: totalSteps }).map((_, i) => (
                                <div key={i} className={`w-4 h-1.5 rounded-full ${i < stepsSent ? 'bg-blue-500 dark:bg-blue-400' : 'bg-gray-200 dark:bg-gray-700'}`}/>
                              ))}
                            </div>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold whitespace-nowrap">
                              {stepsSent}/{totalSteps} · {stepsLeft} left
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {l.opened_at
                          ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg></span>
                          : <span className="text-gray-300 dark:text-gray-600 text-sm">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {l.clicked_at
                          ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg></span>
                          : <span className="text-gray-300 dark:text-gray-600 text-sm">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {l.replied_at
                          ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg></span>
                          : <span className="text-gray-300 dark:text-gray-600 text-sm">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${LEAD_STATUS_BADGE[l.status] ?? LEAD_STATUS_BADGE.sent}`}>
                          {l.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{formatDateTime(l.last_sent_at)}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { detectProvider, campaignDailyCap } from '@/lib/warmup-health';

type Campaign = {
  id: string;
  name: string;
  status: string;
  created_at: string;
  goal?: string;
  daily_limit?: number;
  daily_limit_mode?: 'auto' | 'manual';
  sent_today?: number;
  step_delay_unit_ms?: number;
  is_test_campaign?: boolean;
  from_hour?: string | number;
  to_hour?: string | number;
  active_days?: boolean[] | string[];
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
  campaign_accounts: { account: {
    id: string; email: string; type: string; status?: string;
    health_score?: number; warmup_day?: number; warmup_enabled?: boolean;
    warmup_paused?: boolean; smtp_host?: string | null; daily_limit?: number;
  } }[];
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

  const [resumeOptionsOpen, setResumeOptionsOpen] = useState(false);
  const [spreadDaysInput, setSpreadDaysInput] = useState('3');

  // Pause goes through the plain PATCH (no backlog concerns). Resume goes
  // through POST /start — same route the campaigns-list page's Resume button
  // already uses correctly — since only /start backfills next_send_at for
  // leads that fell out of schedule while paused. A bare status PATCH used to
  // skip that backfill entirely, leaving resumed leads stuck.
  async function toggleStatus(resumeMode: 'auto' | 'fast' | 'spread' = 'auto', spreadDays?: number) {
    if (!campaign || toggling) return;
    setResumeOptionsOpen(false);
    setToggling(true);
    try {
      if (campaign.status === 'active') {
        const res = await fetch(`/api/campaigns/${id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'paused' }),
        });
        const d = await res.json();
        if (!d.error) setCampaign(prev => prev ? { ...prev, status: 'paused' } : prev);
      } else {
        const res = await fetch(`/api/campaigns/${id}/start`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumeMode, spreadDays }),
        });
        const d = await res.json();
        if (!d.error) { setCampaign(prev => prev ? { ...prev, status: 'active' } : prev); refresh(); }
      }
    } finally { setToggling(false); }
  }

  const isTestModeCampaign = campaign?.is_test_campaign === true;
  const [advancingDay, setAdvancingDay] = useState(false);
  const [advanceMsg, setAdvanceMsg] = useState('');
  async function advanceDay() {
    if (!campaign || advancingDay) return;
    setAdvancingDay(true); setAdvanceMsg('');
    try {
      const res = await fetch(`/api/campaigns/${id}/advance-day`, { method: 'POST' });
      const d = await res.json();
      setAdvanceMsg(d.error || d.message || '');
      if (!d.error) refresh();
    } finally { setAdvancingDay(false); }
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
  // stepBusyAction tracks WHICH action is in flight (not just whether one is)
  // so the specific button clicked can show "Saving…"/"Removing…" instead of
  // just going disabled with no feedback — on a campaign with many leads the
  // resync this triggers can take a few seconds, and a silently-disabled
  // button with no label reads as the page having hung.
  const [stepBusyAction, setStepBusyAction] = useState<null | 'save' | 'delete' | 'add' | { move: string }>(null);
  const stepBusy = stepBusyAction !== null;
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
    setStepBusyAction('save'); setStepError('');
    try {
      const res = await fetch(`/api/campaigns/${id}/steps/${stepId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const d = await res.json();
      if (d.error) { setStepError(d.error); return; }
      setEditingStepId(null);
      refresh();
    } finally { setStepBusyAction(null); }
  }

  async function deleteStep(stepId: string) {
    if (!confirm('Remove this step? Any lead currently on it will move to whatever comes next in the sequence.')) return;
    setStepBusyAction('delete'); setStepError('');
    try {
      const res = await fetch(`/api/campaigns/${id}/steps/${stepId}`, { method: 'DELETE' });
      const d = await res.json();
      if (d.error) { setStepError(d.error); return; }
      refresh();
    } finally { setStepBusyAction(null); }
  }

  async function moveStep(stepId: string, newPosition: number) {
    setStepBusyAction({ move: stepId }); setStepError('');
    try {
      const res = await fetch(`/api/campaigns/${id}/steps/${stepId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPosition }),
      });
      const d = await res.json();
      if (d.error) { setStepError(d.error); return; }
      refresh();
    } finally { setStepBusyAction(null); }
  }

  async function addStep() {
    if (!newStepForm.subject.trim() || !newStepForm.body.trim()) { setStepError('Subject and body are required'); return; }
    setStepBusyAction('add'); setStepError('');
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
    } finally { setStepBusyAction(null); }
  }

  // ── Drag-and-drop reordering — reuses the same moveStep() the ↑/↓
  // buttons called, just triggered by a drag gesture instead of a click.
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function onStepDrop(targetIndex: number, orderedSteps: { id: string }[]) {
    if (dragIndex !== null && dragIndex !== targetIndex) {
      moveStep(orderedSteps[dragIndex].id, targetIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }

  // ── Schedule & Limits editing ──
  function normalizeTime(v: string | number | null | undefined, fallback: string): string {
    if (v == null) return fallback;
    const s = String(v);
    const m = s.match(/^(\d{1,2}):(\d{2})/);
    if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
    const n = Number(s);
    if (!Number.isNaN(n)) return `${String(n).padStart(2, '0')}:00`;
    return fallback;
  }
  function normalizeActiveDays(days: Campaign['active_days']): boolean[] {
    if (!days || !days.length) return [true, true, true, true, true, false, false];
    if (typeof days[0] === 'boolean') return days as boolean[];
    const names = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const set = new Set((days as string[]).map(d => String(d).slice(0, 3)));
    return names.map(n => set.has(n));
  }

  const [editingSchedule, setEditingSchedule] = useState(false);
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleForm, setScheduleForm] = useState({
    daily_limit: 50, daily_limit_mode: 'auto' as 'auto' | 'manual',
    from_hour: '08:00', to_hour: '18:00', timezone: 'UTC',
    active_days: [true, true, true, true, true, false, false] as boolean[],
    start_date: '', min_delay_mins: 2, max_delay_mins: 6,
  });

  // Live sum of connected accounts' warmup-aware per-account caps — same
  // formula the scheduler itself enforces, so this always matches reality
  // instead of a stored number that can drift as accounts/health change.
  const mailboxCapacityToday = (campaign?.campaign_accounts ?? [])
    .map(ca => ca.account).filter(Boolean)
    .filter(a => !a.warmup_paused && (a.health_score ?? 50) >= 35 && a.status !== 'error')
    .reduce((sum, a) => sum + campaignDailyCap({
      provider: detectProvider(a as any), warmupDay: a.warmup_day ?? 0,
      health: a.health_score ?? 50, warmupComplete: !a.warmup_enabled,
    }), 0);

  function startEditSchedule() {
    if (!campaign) return;
    setScheduleError('');
    setScheduleForm({
      daily_limit: campaign.daily_limit ?? 50,
      daily_limit_mode: campaign.daily_limit_mode === 'manual' ? 'manual' : 'auto',
      from_hour: normalizeTime(campaign.from_hour, '08:00'),
      to_hour: normalizeTime(campaign.to_hour, '18:00'),
      timezone: campaign.timezone || 'UTC',
      active_days: normalizeActiveDays(campaign.active_days),
      start_date: campaign.start_date ? campaign.start_date.slice(0, 10) : '',
      min_delay_mins: campaign.min_delay_secs != null ? Math.round(campaign.min_delay_secs / 60) : 2,
      max_delay_mins: campaign.max_delay_secs != null ? Math.round(campaign.max_delay_secs / 60) : 6,
    });
    setEditingSchedule(true);
  }

  function toggleScheduleDay(i: number) {
    setScheduleForm(f => ({ ...f, active_days: f.active_days.map((v, idx) => idx === i ? !v : v) }));
  }

  async function saveSchedule() {
    if (scheduleForm.from_hour >= scheduleForm.to_hour) {
      setScheduleError('"From" time must be earlier than "To" time'); return;
    }
    if (scheduleForm.min_delay_mins >= scheduleForm.max_delay_mins) {
      setScheduleError('Min delay must be less than max delay'); return;
    }
    setScheduleBusy(true); setScheduleError('');
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          daily_limit: scheduleForm.daily_limit,
          daily_limit_mode: scheduleForm.daily_limit_mode,
          from_hour: scheduleForm.from_hour,
          to_hour: scheduleForm.to_hour,
          timezone: scheduleForm.timezone,
          active_days: scheduleForm.active_days,
          start_date: scheduleForm.start_date || null,
          min_delay_secs: scheduleForm.min_delay_mins * 60,
          max_delay_secs: scheduleForm.max_delay_mins * 60,
        }),
      });
      const d = await res.json();
      if (d.error) { setScheduleError(d.error); return; }
      setEditingSchedule(false);
      refresh();
    } finally { setScheduleBusy(false); }
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
            <div className="relative flex">
              <button onClick={() => toggleStatus()} disabled={toggling}
                className={`text-sm font-bold px-4 py-2 rounded-xl transition-colors ${isActive ? 'rounded-r-none' : campaign.status === 'paused' ? 'rounded-r-none' : ''} ${
                  isActive
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/60'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/60'
                }`}>
                {toggling ? '...' : isActive ? 'Pause' : 'Resume'}
              </button>
              {campaign.status === 'paused' && (
                <>
                  <button onClick={() => setResumeOptionsOpen(v => !v)} disabled={toggling}
                    className="text-sm font-bold px-2 py-2 rounded-xl rounded-l-none border border-l-0 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  {resumeOptionsOpen && (
                    <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-10 p-2 space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-2 pt-1 pb-0.5">Resume options</p>
                      <button onClick={() => toggleStatus('auto')} className="w-full text-left px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-100">Auto (recommended)</p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500">Spread only if the overdue backlog is bigger than a normal day can send</p>
                      </button>
                      <button onClick={() => toggleStatus('fast')} className="w-full text-left px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-100">Fast</p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500">Send the full overdue backlog as soon as capacity allows</p>
                      </button>
                      <div className="px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-100 mb-1">Spread over N days</p>
                        <div className="flex items-center gap-2">
                          <input type="number" min={1} max={14} value={spreadDaysInput}
                            onChange={e => setSpreadDaysInput(e.target.value)}
                            className="w-16 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-500"/>
                          <button onClick={() => toggleStatus('spread', Math.max(1, Math.min(14, parseInt(spreadDaysInput) || 3)))}
                            className="text-xs font-bold text-blue-600 hover:underline">Apply</button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {isTestModeCampaign && isActive && (
            <button onClick={advanceDay} disabled={advancingDay}
              title="Test-only: makes every lead waiting on a follow-up immediately due, so you can click through a multi-day sequence without waiting"
              className="text-sm font-bold px-4 py-2 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-950/60 transition-colors disabled:opacity-50">
              {advancingDay ? 'Advancing…' : '⏩ Skip to next day'}
            </button>
          )}
          <a href={`/api/campaigns/${id}/export`} download
            className="text-sm font-bold px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            Export CSV
          </a>
        </div>
      </div>

      {advanceMsg && (
        <div className="rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900 px-4 py-3 text-xs text-violet-700 dark:text-violet-400 flex items-center justify-between gap-3">
          <span>{advanceMsg}</span>
          <button onClick={() => setAdvanceMsg('')} className="shrink-0 opacity-70 hover:opacity-100 transition-opacity">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      )}

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
                <button disabled={stepBusy} onClick={() => { setAddingStep(v => !v); setStepError(''); }}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900 hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors disabled:opacity-50">
                  {addingStep ? 'Cancel' : '+ Add Step'}
                </button>
              ) : (
                <span className="text-[11px] text-gray-400 dark:text-gray-500">Pause to edit steps</span>
              )}
            </div>

            {stepError && (
              <div className="px-6 py-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-b border-red-100 dark:border-red-900">{stepError}</div>
            )}

            {stepBusy && (
              <div className="px-6 py-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900 flex items-center gap-2">
                <svg className="w-3.5 h-3.5 animate-spin shrink-0" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                {typeof stepBusyAction === 'object' ? 'Reordering steps…' : 'Updating sequence — this can take a few seconds on a campaign with many leads…'}
              </div>
            )}

            {sortedSteps.length === 0 ? (
              <div className="py-10 text-center text-gray-400 dark:text-gray-500 text-sm">No email steps configured.</div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {sortedSteps.map((step, i) => (
                  <div key={step.id}
                    draggable={canEditSteps && !stepBusy}
                    onDragStart={() => setDragIndex(i)}
                    onDragOver={e => { e.preventDefault(); if (dragOverIndex !== i) setDragOverIndex(i); }}
                    onDragLeave={() => setDragOverIndex(prev => (prev === i ? null : prev))}
                    onDrop={e => { e.preventDefault(); onStepDrop(i, sortedSteps); }}
                    onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                    className={`px-6 py-4 transition-colors ${dragIndex === i ? 'opacity-40' : ''} ${dragOverIndex === i && dragIndex !== null && dragIndex !== i ? 'bg-blue-50/70 dark:bg-blue-950/30' : ''}`}>
                    <div className="flex items-center gap-3">
                      {canEditSteps && (
                        <span className="text-gray-300 dark:text-gray-600 cursor-grab active:cursor-grabbing shrink-0 select-none" title="Drag to reorder">
                          <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor"><circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/><circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="2" cy="14" r="1.5"/><circle cx="8" cy="14" r="1.5"/></svg>
                        </span>
                      )}
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
                          <button disabled={stepBusy} onClick={() => startEditStep(step)}
                            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Edit</button>
                          <button disabled={stepBusy} onClick={() => deleteStep(step.id)}
                            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50">
                            {stepBusyAction === 'delete' ? 'Removing…' : 'Remove'}
                          </button>
                        </div>
                      )}
                    </div>

                    {editingStepId === step.id && (
                      <div className="mt-3 ml-11 bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Subject line</label>
                          <input value={editForm.subject} onChange={e => setEditForm(f => ({ ...f, subject: e.target.value }))}
                            className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500 transition" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Email body</label>
                          <textarea value={editForm.body} onChange={e => setEditForm(f => ({ ...f, body: e.target.value }))}
                            rows={5} className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500 transition" />
                        </div>
                        {i > 0 && (
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Wait before sending</label>
                            <div className="flex items-center gap-2">
                              <input type="number" min={1} value={editForm.delay_days}
                                onChange={e => setEditForm(f => ({ ...f, delay_days: Number(e.target.value) || 1 }))}
                                className="w-20 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition" />
                              <span className="text-sm text-gray-500 dark:text-gray-400">day(s) after the previous step</span>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 pt-1">
                          <button disabled={stepBusy} onClick={() => saveEditStep(step.id)}
                            className="text-xs font-bold px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50">
                            {stepBusyAction === 'save' ? 'Saving…' : 'Save changes'}
                          </button>
                          <button disabled={stepBusy} onClick={() => setEditingStepId(null)}
                            className="text-xs font-bold px-4 py-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {addingStep && (
              <div className="px-6 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Subject line</label>
                  <input value={newStepForm.subject} onChange={e => setNewStepForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="e.g. Quick question about {{company}}"
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500 transition" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Email body</label>
                  <textarea value={newStepForm.body} onChange={e => setNewStepForm(f => ({ ...f, body: e.target.value }))}
                    rows={5} placeholder="Write the email..."
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500 transition" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Wait before sending</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min={1} value={newStepForm.delay_days}
                      onChange={e => setNewStepForm(f => ({ ...f, delay_days: Number(e.target.value) || 1 }))}
                      className="w-20 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">day(s) after the previous step (ignored if added as the first step)</span>
                  </div>
                </div>
                <button disabled={stepBusy} onClick={addStep}
                  className="text-xs font-bold px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {stepBusyAction === 'add' ? 'Adding…' : 'Add Step'}
                </button>
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
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">Schedule & Limits</h2>
                {!editingSchedule && (
                  <button onClick={startEditSchedule}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900 hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors">
                    Edit
                  </button>
                )}
              </div>

              {editingSchedule ? (
                <div className="p-6 space-y-5">
                  {scheduleError && (
                    <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 rounded-xl px-3.5 py-2.5">{scheduleError}</div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Daily limit</label>
                    <div className="flex gap-2 mb-2">
                      {(['auto', 'manual'] as const).map(mode => (
                        <button key={mode} type="button" onClick={() => {
                          if (mode === 'manual') setScheduleForm(f => ({ ...f, daily_limit: mailboxCapacityToday || f.daily_limit, daily_limit_mode: mode }));
                          else setScheduleForm(f => ({ ...f, daily_limit_mode: mode }));
                        }}
                          className={`flex-1 text-xs font-bold rounded-xl px-3 py-2 border transition-colors ${
                            scheduleForm.daily_limit_mode === mode
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}>
                          {mode === 'auto' ? 'Auto (recommended)' : 'Manual'}
                        </button>
                      ))}
                    </div>
                    {scheduleForm.daily_limit_mode === 'auto' ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400">~<span className="font-bold text-gray-900 dark:text-white">{mailboxCapacityToday}</span>/day — the live sum of connected mailboxes' warmup-aware capacity.</p>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input type="number" min={1} value={scheduleForm.daily_limit}
                          onChange={e => setScheduleForm(f => ({ ...f, daily_limit: Number(e.target.value) || 1 }))}
                          className="w-24 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">emails/day</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Send window</label>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="time" value={scheduleForm.from_hour}
                        onChange={e => setScheduleForm(f => ({ ...f, from_hour: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition" />
                      <input type="time" value={scheduleForm.to_hour}
                        onChange={e => setScheduleForm(f => ({ ...f, to_hour: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Timezone</label>
                    <select value={scheduleForm.timezone} onChange={e => setScheduleForm(f => ({ ...f, timezone: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition">
                      {['UTC', 'US/Eastern (EST)', 'US/Pacific (PST)', 'Europe/London (GMT)', 'Asia/Karachi (PKT)', 'Asia/Dubai (GST)'].map(tz => <option key={tz}>{tz}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Active days</label>
                    <div className="flex gap-1.5">
                      {['Mo','Tu','We','Th','Fr','Sa','Su'].map((d, i) => (
                        <button key={d} type="button" onClick={() => toggleScheduleDay(i)}
                          className={`w-9 h-9 rounded-xl text-xs font-bold transition-colors ${scheduleForm.active_days[i] ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Start date <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input type="date" value={scheduleForm.start_date}
                      onChange={e => setScheduleForm(f => ({ ...f, start_date: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Delay between emails</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">Min (mins)</p>
                        <input type="number" min={1} value={scheduleForm.min_delay_mins}
                          onChange={e => setScheduleForm(f => ({ ...f, min_delay_mins: Number(e.target.value) || 1 }))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition" />
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">Max (mins)</p>
                        <input type="number" min={1} value={scheduleForm.max_delay_mins}
                          onChange={e => setScheduleForm(f => ({ ...f, max_delay_mins: Number(e.target.value) || 1 }))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button disabled={scheduleBusy} onClick={saveSchedule}
                      className="text-xs font-bold px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50">
                      {scheduleBusy ? 'Saving...' : 'Save changes'}
                    </button>
                    <button disabled={scheduleBusy} onClick={() => setEditingSchedule(false)}
                      className="text-xs font-bold px-4 py-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {[
                    {
                      label: 'Daily limit',
                      value: campaign.daily_limit_mode === 'manual'
                        ? `${campaign.daily_limit ?? 50} emails/day (Manual)`
                        : `~${mailboxCapacityToday} emails/day (Auto)`,
                    },
                    {
                      label: 'Send window',
                      value: campaign.from_hour != null && campaign.to_hour != null
                        ? `${normalizeTime(campaign.from_hour, '08:00')} – ${normalizeTime(campaign.to_hour, '18:00')}`
                        : 'Any time',
                    },
                    {
                      label: 'Timezone',
                      value: campaign.timezone || 'UTC',
                    },
                    {
                      label: 'Active days',
                      value: (() => {
                        const names = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
                        const on = normalizeActiveDays(campaign.active_days);
                        return on.map((v, i) => v ? names[i] : null).filter(Boolean).join(', ') || 'None selected';
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
                    ...(leads.length > 0 ? [{
                      label: 'Est. completion',
                      value: (() => {
                        const steps = campaign.email_steps ?? [];
                        const totalSteps = steps.length;
                        const dailyLimit = Math.max(1, campaign.daily_limit_mode === 'manual' ? (campaign.daily_limit ?? 50) : mailboxCapacityToday);
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
                  {(() => {
                    const campaignLimit = campaign.daily_limit_mode === 'manual' ? (campaign.daily_limit ?? 50) : mailboxCapacityToday;
                    const effective = Math.min(mailboxCapacityToday, campaignLimit);
                    const usedPct = effective > 0 ? Math.min(100, Math.round(((campaign.sent_today ?? 0) / effective) * 100)) : 0;
                    return (
                      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/40">
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Capacity today</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">Mailbox Capacity</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{mailboxCapacityToday}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">Campaign Limit</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                              {campaign.daily_limit_mode === 'manual' ? campaignLimit : `Auto (${campaignLimit})`}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">Effective Sending</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{effective}</p>
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">{campaign.sent_today ?? 0} / {effective} sent today ({usedPct}%)</p>
                      </div>
                    );
                  })()}
                </div>
              )}
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

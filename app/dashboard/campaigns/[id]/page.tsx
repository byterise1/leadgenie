'use client';

import Link from 'next/link';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmModal from '@/components/ConfirmModal';
import { Skeleton } from '@/components/Skeleton';

type EmailStep = {
  id: string;
  step_number: number;
  subject: string;
  body: string;
  delay_days: number;
};

type CampaignLead = {
  id: string;
  status: string;
  current_step: number;
  last_sent_at: string | null;
  lead: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    company: string | null;
  };
};

type Campaign = {
  id: string;
  name: string;
  status: string;
  goal: string;
  total_sent: number;
  total_opened: number;
  total_replied: number;
  total_clicked: number;
  daily_limit: number;
  from_hour: string;
  to_hour: string;
  timezone: string;
  min_delay_secs?: number | null;
  max_delay_secs?: number | null;
  active_days?: boolean[];
  list_id: string | null;
  created_at: string;
  email_steps: EmailStep[];
  campaign_accounts: { account: { id: string; email: string; type: string } }[];
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  paused: 'bg-amber-50 text-amber-700 border-amber-100',
  completed: 'bg-blue-50 text-blue-700 border-blue-100',
  draft: 'bg-gray-100 text-gray-500 border-gray-200',
};

const LEAD_STATUS_COLORS: Record<string, string> = {
  pending: 'text-gray-400',
  active: 'text-blue-600 font-semibold',
  completed: 'text-emerald-600 font-semibold',
  replied: 'text-purple-600 font-semibold',
  bounced: 'text-red-500',
  unsubscribed: 'text-amber-600',
};

const DAY_LABELS = ['Mo','Tu','We','Th','Fr','Sa','Su'];

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<CampaignLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editName, setEditName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [msg, setMsg] = useState('');
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // Schedule edit
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [schedForm, setSchedForm] = useState({ from_hour: '08:00', to_hour: '18:00', daily_limit: 50, min_delay_mins: 1, max_delay_mins: 5, active_days: [true,true,true,true,true,false,false] as boolean[], timezone: 'UTC' });
  const [savingSched, setSavingSched] = useState(false);

  // Accounts edit
  const [allAccounts, setAllAccounts] = useState<{ id: string; email: string; type: string }[]>([]);
  const [addingAccount, setAddingAccount] = useState(false);
  const [selectedAddAccount, setSelectedAddAccount] = useState('');

  useEffect(() => {
    const fetchAll = (initial = false) =>
      Promise.all([
        fetch(`/api/campaigns/${id}`).then(r => r.json()),
        fetch(`/api/campaigns/${id}/leads`).then(r => r.json()).catch(() => []),
      ]).then(([c, l]) => {
        if (c && !c.error) {
          setCampaign(c);
          if (initial) setEditName(c.name);
        }
        if (Array.isArray(l)) setLeads(l);
      }).finally(() => { if (initial) setLoading(false); });

    fetchAll(true);
    const pollId = setInterval(() => fetchAll(false), 10000);
    return () => clearInterval(pollId);
  }, [id]);

  // Load all email accounts for the add-account picker
  useEffect(() => {
    fetch('/api/email-accounts').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setAllAccounts(d.filter((a: any) => a.status !== 'error'));
    }).catch(() => {});
  }, []);

  const showMsg = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 4000); };

  const markComplete = () => {
    if (!campaign) return;
    setCampaign(p => p ? { ...p, status: 'completed' } : p);
    showMsg('Campaign completed');
    fetch(`/api/campaigns/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    }).then(r => { if (!r.ok) setCampaign(p => p ? { ...p, status: campaign.status } : p); });
  };

  const [starting, setStarting] = useState(false);

  const [startError, setStartError] = useState('');

  const startCampaign = async () => {
    setStarting(true);
    setStartError('');
    const r = await fetch(`/api/campaigns/${id}/start`, { method: 'POST' });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.status === 'active') {
      setCampaign(p => p ? { ...p, status: 'active', total_sent: 0, total_opened: 0, total_clicked: 0, total_replied: 0 } : p);
      showMsg(`Campaign started! ${d.queued} lead${d.queued !== 1 ? 's' : ''} queued.`);
    } else {
      setStartError(d.error || 'Start failed — check accounts and leads then try again.');
    }
    setStarting(false);
  };

  const toggleStatus = async () => {
    if (!campaign) return;
    if (campaign.status === 'active') {
      setCampaign(p => p ? { ...p, status: 'paused' } : p);
      showMsg('Campaign paused');
      const r = await fetch(`/api/campaigns/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'paused' }) });
      if (!r.ok) { setCampaign(p => p ? { ...p, status: 'active' } : p); showMsg('Pause failed'); }
    } else if (campaign.status === 'paused') {
      showMsg('Resuming…');
      const r = await fetch(`/api/campaigns/${id}/start`, { method: 'POST' });
      if (r.ok) { setCampaign(p => p ? { ...p, status: 'active' } : p); showMsg('Campaign resumed — leads re-queued'); }
      else { const d = await r.json().catch(() => ({})); showMsg(d.error || 'Resume failed'); }
    }
  };

  const saveName = async () => {
    if (!editName.trim() || editName === campaign?.name) { setEditingName(false); return; }
    setSaving(true);
    const res = await fetch(`/api/campaigns/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    });
    if (res.ok) { setCampaign(p => p ? { ...p, name: editName.trim() } : p); showMsg('Name saved'); }
    setSaving(false);
    setEditingName(false);
  };

  const openScheduleEdit = () => {
    if (!campaign) return;
    setSchedForm({
      from_hour: campaign.from_hour || '08:00',
      to_hour: campaign.to_hour || '18:00',
      daily_limit: campaign.daily_limit || 50,
      min_delay_mins: Math.round((campaign.min_delay_secs || 60) / 60),
      max_delay_mins: Math.round((campaign.max_delay_secs || 300) / 60),
      active_days: campaign.active_days || [true,true,true,true,true,false,false],
      timezone: campaign.timezone || 'UTC',
    });
    setEditingSchedule(true);
  };

  const saveSchedule = async () => {
    setSavingSched(true);
    const res = await fetch(`/api/campaigns/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_hour: schedForm.from_hour,
        to_hour: schedForm.to_hour,
        daily_limit: schedForm.daily_limit,
        min_delay_secs: schedForm.min_delay_mins * 60,
        max_delay_secs: schedForm.max_delay_mins * 60,
        active_days: schedForm.active_days,
        timezone: schedForm.timezone,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCampaign(p => p ? { ...p, ...updated } : p);
      showMsg('Schedule saved');
      setEditingSchedule(false);
    } else {
      showMsg('Save failed');
    }
    setSavingSched(false);
  };

  const removeAccount = async (accountId: string) => {
    const res = await fetch(`/api/campaigns/${id}/accounts`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: accountId }),
    });
    if (res.ok) {
      setCampaign(p => p ? { ...p, campaign_accounts: p.campaign_accounts.filter(ca => ca.account.id !== accountId) } : p);
      showMsg('Account removed');
    }
  };

  const addAccount = async () => {
    if (!selectedAddAccount) return;
    const res = await fetch(`/api/campaigns/${id}/accounts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: selectedAddAccount }),
    });
    if (res.ok) {
      const acc = allAccounts.find(a => a.id === selectedAddAccount);
      if (acc) setCampaign(p => p ? { ...p, campaign_accounts: [...p.campaign_accounts, { account: acc }] } : p);
      setSelectedAddAccount('');
      setAddingAccount(false);
      showMsg('Account added');
    }
  };

  const deleteCampaign = () => {
    setConfirmModal({
      title: 'Delete campaign?',
      message: `"${campaign?.name}" and all its data will be permanently removed. This cannot be undone.`,
      onConfirm: async () => {
        setConfirmModal(null);
        setDeleting(true);
        const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
        if (res.ok) router.push('/dashboard/campaigns');
        else { showMsg('Delete failed'); setDeleting(false); }
      },
    });
  };

  if (loading) return (
    <main className="flex-1 p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-6 w-16 rounded-full ml-2" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3"><Skeleton className="h-3 w-20" /><Skeleton className="h-7 w-14" /></div>)}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    </main>
  );

  if (!campaign) return (
    <main className="flex-1 p-6">
      <p className="text-sm text-red-500">Campaign not found.</p>
      <Link href="/dashboard/campaigns" className="text-sm text-blue-600 hover:underline mt-2 inline-block">← Back to campaigns</Link>
    </main>
  );

  const openRate = campaign.total_sent > 0 ? ((campaign.total_opened / campaign.total_sent) * 100).toFixed(1) + '%' : '—';
  const replyRate = campaign.total_sent > 0 ? ((campaign.total_replied / campaign.total_sent) * 100).toFixed(1) + '%' : '—';
  const clickRate = campaign.total_sent > 0 ? (((campaign.total_clicked || 0) / campaign.total_sent) * 100).toFixed(1) + '%' : '—';

  // Completion estimate
  const parseTimeToMins = (s: string) => {
    if (!s) return 0;
    const [h, m] = s.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const schedWindowMins = Math.max(0, parseTimeToMins(campaign.to_hour) - parseTimeToMins(campaign.from_hour));
  const minDelaySecs = campaign.min_delay_secs || 60;
  const maxDelaySecs = campaign.max_delay_secs || 300;
  const avgDelayMins = (minDelaySecs + maxDelaySecs) / 2 / 60;
  const numAccounts = campaign.campaign_accounts.length;
  const emailsPerWindowPerAcc = schedWindowMins > 0 && avgDelayMins > 0 ? Math.max(1, Math.floor(schedWindowMins / avgDelayMins)) : 0;
  const emailsPerDay = Math.min(campaign.daily_limit, emailsPerWindowPerAcc * Math.max(1, numAccounts));
  const daysToComplete = emailsPerDay > 0 && leads.length > 0 ? Math.ceil(leads.length / emailsPerDay) : null;
  const activeDayLabels = ['Mo','Tu','We','Th','Fr','Sa','Su'].filter((_, i) => (campaign.active_days || [true,true,true,true,true,false,false])[i]);

  const TERMINAL_STATUSES = ['completed', 'bounced', 'unsubscribed', 'replied'];
  const isEffectivelyComplete = leads.length > 0 && leads.every(l => TERMINAL_STATUSES.includes(l.status));

  const leadCounts = leads.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <main className="flex-1 p-6 space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard/campaigns" className="text-gray-400 hover:text-gray-700 transition-colors shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          </Link>
          <div className="min-w-0">
            {editingName ? (
              <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setEditingName(false); setEditName(campaign.name); } }}
                onBlur={saveName}
                className="text-xl font-bold text-gray-900 border-b-2 border-blue-500 outline-none bg-transparent w-full"/>
            ) : (
              <button onClick={() => setEditingName(true)} className="flex items-center gap-2 group">
                <h1 className="text-xl font-bold text-gray-900 truncate">{campaign.name}</h1>
                <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-bold rounded-full px-2.5 py-1 border capitalize ${STATUS_COLORS[campaign.status] || STATUS_COLORS.draft}`}>
                {campaign.status}
              </span>
              <span className="text-xs text-gray-400">{campaign.goal}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {campaign.status === 'draft' && (
            <button onClick={startCampaign} disabled={starting}
              className="text-sm font-bold px-4 py-2 rounded-xl border bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100 transition-colors disabled:opacity-50">
              {starting ? 'Starting…' : '▶ Start'}
            </button>
          )}
          {isEffectivelyComplete && campaign.status !== 'completed' ? (
            <button onClick={markComplete}
              className="text-sm font-bold px-4 py-2 rounded-xl border bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 transition-colors">
              Mark Complete
            </button>
          ) : (campaign.status === 'active' || campaign.status === 'paused') && (
            <button onClick={toggleStatus}
              className={`text-sm font-bold px-4 py-2 rounded-xl border transition-colors ${campaign.status === 'active' ? 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'}`}>
              {campaign.status === 'active' ? 'Pause' : 'Resume'}
            </button>
          )}
          <button onClick={deleteCampaign} disabled={deleting}
            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl border border-red-100 text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>

      {startError && (
        <div className="rounded-xl px-4 py-3 text-sm font-medium bg-red-50 text-red-700 border border-red-100 flex items-start justify-between gap-3">
          <span>⚠ {startError}</span>
          <button onClick={() => setStartError('')} className="text-red-400 hover:text-red-600 shrink-0 text-lg leading-none">×</button>
        </div>
      )}
      {msg && (
        <div className={`rounded-xl px-4 py-2.5 text-sm font-medium ${msg.includes('fail') || msg.includes('error') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
          {msg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: 'Emails Sent', value: String(campaign.total_sent) },
          { label: 'Open Rate', value: openRate },
          { label: 'Click Rate', value: clickRate },
          { label: 'Reply Rate', value: replyRate },
          { label: 'Leads', value: String(leads.length) },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-400 mb-2">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Lead status pills */}
      {leads.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(leadCounts).map(([status, count]) => (
            <span key={status} className={`text-xs font-bold rounded-full px-3 py-1 border capitalize ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
              {count} {status}
            </span>
          ))}
        </div>
      )}

      {/* Configuration */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Schedule card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Schedule</p>
            {!editingSchedule && (
              <button onClick={openScheduleEdit} className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                Edit
              </button>
            )}
          </div>

          {editingSchedule ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Start time</label>
                  <input type="time" value={schedForm.from_hour} onChange={e => setSchedForm(f => ({ ...f, from_hour: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">End time</label>
                  <input type="time" value={schedForm.to_hour} onChange={e => setSchedForm(f => ({ ...f, to_hour: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"/>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Timezone</label>
                <select value={schedForm.timezone} onChange={e => setSchedForm(f => ({ ...f, timezone: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white">
                  {['UTC','US/Eastern (EST)','US/Pacific (PST)','Europe/London (GMT)','Asia/Karachi (PKT)','Asia/Dubai (GST)'].map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Daily sending limit</label>
                <input type="number" min={1} max={500} value={schedForm.daily_limit} onChange={e => setSchedForm(f => ({ ...f, daily_limit: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Min delay (min)</label>
                  <input type="number" min={1} value={schedForm.min_delay_mins} onChange={e => setSchedForm(f => ({ ...f, min_delay_mins: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Max delay (min)</label>
                  <input type="number" min={1} value={schedForm.max_delay_mins} onChange={e => setSchedForm(f => ({ ...f, max_delay_mins: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"/>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block">Active days</label>
                <div className="flex gap-1.5">
                  {DAY_LABELS.map((d, i) => (
                    <button key={d} onClick={() => setSchedForm(f => { const days = [...f.active_days]; days[i] = !days[i]; return { ...f, active_days: days }; })}
                      className={`flex-1 h-9 rounded-xl text-xs font-bold border transition-all ${schedForm.active_days[i] ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={saveSchedule} disabled={savingSched}
                  className="flex-1 bg-blue-600 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {savingSched ? 'Saving…' : 'Save changes'}
                </button>
                <button onClick={() => setEditingSchedule(false)}
                  className="px-4 border border-gray-200 text-gray-500 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Window', value: `${campaign.from_hour} – ${campaign.to_hour}` },
                  { label: 'Timezone', value: campaign.timezone },
                  { label: 'Daily limit', value: `${campaign.daily_limit} emails/day` },
                  { label: 'Delay', value: `${Math.round(minDelaySecs/60)}–${Math.round(maxDelaySecs/60)} min (random)` },
                  { label: 'Active days', value: activeDayLabels.length > 0 ? activeDayLabels.join(', ') : '—' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between">
                    <span className="text-gray-400">{r.label}</span>
                    <span className="font-semibold text-gray-800">{r.value}</span>
                  </div>
                ))}
              </div>
              {emailsPerDay > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
                  <div className="bg-blue-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Per Day</p>
                    <p className="text-sm font-bold text-gray-900">~{emailsPerDay}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Completes In</p>
                    <p className="text-sm font-bold text-gray-900">
                      {daysToComplete === null ? '—' : `~${daysToComplete}d`}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sending Accounts card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sending Accounts</p>
            <button onClick={() => { setAddingAccount(v => !v); setSelectedAddAccount(''); }}
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
              Add account
            </button>
          </div>

          {campaign.campaign_accounts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No accounts linked</p>
          ) : (
            <div className="space-y-1.5">
              {campaign.campaign_accounts.map(ca => (
                <div key={ca.account.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shrink-0">
                    <span className="text-[10px] text-white font-bold">{ca.account.email[0].toUpperCase()}</span>
                  </div>
                  <span className="text-sm text-gray-700 truncate flex-1">{ca.account.email}</span>
                  <button onClick={() => removeAccount(ca.account.id)}
                    className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {addingAccount && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Select account to add</label>
              <div className="flex gap-2">
                <select value={selectedAddAccount} onChange={e => setSelectedAddAccount(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-800 focus:outline-none focus:border-blue-400 bg-white">
                  <option value="">Choose account…</option>
                  {allAccounts
                    .filter(a => !campaign.campaign_accounts.some(ca => ca.account.id === a.id))
                    .map(a => <option key={a.id} value={a.id}>{a.email}</option>)}
                </select>
                <button onClick={addAccount} disabled={!selectedAddAccount}
                  className="bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40">
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Email sequence */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-bold text-gray-900">Email Sequence ({campaign.email_steps.length} step{campaign.email_steps.length !== 1 ? 's' : ''})</p>
        </div>
        <div className="divide-y divide-gray-100">
          {[...campaign.email_steps].sort((a, b) => a.step_number - b.step_number).map((step, i) => (
            <div key={step.id} className="px-5 py-4">
              <div className="flex items-center gap-3 mb-1">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <p className="text-sm font-semibold text-gray-900 truncate">{step.subject || '(no subject)'}</p>
                {i > 0 && step.delay_days > 0 && (
                  <span className="text-[10px] text-gray-400 shrink-0">+{step.delay_days} min</span>
                )}
              </div>
              <p className="text-xs text-gray-400 pl-9 line-clamp-2">{step.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Leads table */}
      {leads.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-900">Leads ({leads.length})</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Lead', 'Email', 'Company', 'Step', 'Status', 'Last Sent'].map(col => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map(cl => (
                  <tr key={cl.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {[cl.lead?.first_name, cl.lead?.last_name].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{cl.lead?.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{cl.lead?.company || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {cl.current_step === 0
                        ? '–'
                        : cl.current_step >= campaign.email_steps.length
                        ? <span className="text-emerald-600 font-semibold text-xs">Done</span>
                        : `${cl.current_step} / ${campaign.email_steps.length}`}
                    </td>
                    <td className="px-4 py-3 text-xs capitalize font-medium ${LEAD_STATUS_COLORS[cl.status] || 'text-gray-400'}">
                      <span className={LEAD_STATUS_COLORS[cl.status] || 'text-gray-400'}>{cl.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {cl.last_sent_at ? new Date(cl.last_sent_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </main>
  );
}

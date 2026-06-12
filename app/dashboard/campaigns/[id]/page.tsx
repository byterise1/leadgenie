'use client';

import Link from 'next/link';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmModal from '@/components/ConfirmModal';

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
  daily_limit: number;
  from_hour: string;
  to_hour: string;
  timezone: string;
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

  const showMsg = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 4000); };

  const toggleStatus = async () => {
    if (!campaign) return;
    const next = campaign.status === 'active' ? 'paused' : campaign.status === 'paused' ? 'active' : null;
    if (!next) return;
    const res = await fetch(`/api/campaigns/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) { setCampaign(p => p ? { ...p, status: next } : p); showMsg(`Campaign ${next}`); }
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
    <main className="flex-1 p-6 flex items-center justify-center">
      <p className="text-sm text-gray-400">Loading…</p>
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
          {(campaign.status === 'active' || campaign.status === 'paused') && (
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

      {msg && (
        <div className={`rounded-xl px-4 py-2.5 text-sm font-medium ${msg.includes('fail') || msg.includes('error') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
          {msg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Emails Sent', value: String(campaign.total_sent) },
          { label: 'Open Rate', value: openRate },
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
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Schedule</p>
          <div className="space-y-2 text-sm">
            {[
              { label: 'Window', value: `${campaign.from_hour} – ${campaign.to_hour}` },
              { label: 'Timezone', value: campaign.timezone },
              { label: 'Daily limit', value: `${campaign.daily_limit} emails/day` },
            ].map(r => (
              <div key={r.label} className="flex justify-between">
                <span className="text-gray-400">{r.label}</span>
                <span className="font-semibold text-gray-800">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Sending Accounts</p>
          {campaign.campaign_accounts.length === 0 ? (
            <p className="text-sm text-gray-400">No accounts linked</p>
          ) : (
            <div className="space-y-2">
              {campaign.campaign_accounts.map(ca => (
                <div key={ca.account.id} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shrink-0">
                    <span className="text-[9px] text-white font-bold">{ca.account.email[0].toUpperCase()}</span>
                  </div>
                  <span className="text-sm text-gray-700 truncate">{ca.account.email}</span>
                </div>
              ))}
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
                  <span className="text-[10px] text-gray-400 shrink-0">+{step.delay_days}d delay</span>
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
                    <td className="px-4 py-3 text-sm text-gray-500">{cl.current_step + 1}</td>
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

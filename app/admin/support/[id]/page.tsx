'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Ticket = {
  id: string;
  user_email: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  priority: string;
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-emerald-50 text-emerald-700',
  in_progress: 'bg-amber-50 text-amber-700',
  closed: 'bg-gray-100 text-gray-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-50 text-orange-700',
  normal: 'bg-blue-50 text-blue-700',
  low: 'bg-gray-100 text-gray-500',
};

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/support/${id}`)
      .then(r => r.json())
      .then(d => {
        if (!d.error) {
          setTicket(d);
          setStatus(d.status);
          setPriority(d.priority);
          setReply(d.admin_reply ?? '');
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const save = async (overrideStatus?: string) => {
    setSaving(true);
    setError('');
    const res = await fetch('/api/admin/support', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        status: overrideStatus ?? status,
        priority,
        admin_reply: reply || null,
      }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); setSaving(false); return; }
    setTicket(data);
    setStatus(data.status);
    setPriority(data.priority);
    setReply(data.admin_reply ?? '');
    setSaving(false);
  };

  const initials = (email: string) => email.charAt(0).toUpperCase();
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (loading) {
    return (
      <main className="flex-1 p-6">
        <div className="h-4 w-32 bg-gray-100 rounded animate-pulse mb-6"/>
        <div className="h-7 w-64 bg-gray-100 rounded animate-pulse mb-4"/>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-4 bg-gray-100 rounded animate-pulse"/>)}
        </div>
      </main>
    );
  }

  if (!ticket) {
    return (
      <main className="flex-1 p-6">
        <button onClick={() => router.push('/admin/support')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          Back
        </button>
        <p className="text-sm text-gray-400">Ticket not found.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6 max-w-3xl">
      {/* Breadcrumb */}
      <button onClick={() => router.push('/admin/support')}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-5">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
        </svg>
        Support tickets
      </button>

      {/* Title + Reopen */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <h1 className="text-xl font-bold text-gray-900">{ticket.subject}</h1>
        {ticket.status === 'closed' && (
          <button onClick={() => save('open')} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Reopen
          </button>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 flex-wrap mb-6 text-xs">
        <span className={`font-bold rounded-full px-2.5 py-1 ${STATUS_COLORS[ticket.status] ?? 'bg-gray-100 text-gray-500'}`}>
          {ticket.status === 'closed' ? '• Closed' : ticket.status === 'in_progress' ? '• In Progress' : '• Open'}
        </span>
        <span className={`font-bold rounded-full px-2.5 py-1 uppercase ${PRIORITY_COLORS[ticket.priority] ?? PRIORITY_COLORS.normal}`}>
          {ticket.priority}
        </span>
        <span className="text-gray-500">From <span className="font-semibold text-gray-700">{ticket.user_email}</span></span>
        <span className="text-gray-300">·</span>
        <span className="text-gray-500 capitalize">{ticket.category}</span>
        <span className="text-gray-300">·</span>
        <span className="text-gray-500">Opened {fmtDate(ticket.created_at)}</span>
      </div>

      {/* Conversation */}
      <div className="space-y-5 mb-6">
        {/* User message */}
        <div className="flex gap-3 items-start">
          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-sm font-bold text-gray-600">
            {initials(ticket.user_email)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-semibold text-gray-700">{ticket.user_email}</span>
              <span className="text-xs text-gray-400">{fmtDate(ticket.created_at)}</span>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.message}</p>
            </div>
          </div>
        </div>

        {/* Admin reply bubble */}
        {ticket.admin_reply && (
          <div className="flex gap-3 items-start flex-row-reverse">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-sm font-bold text-blue-600">
              A
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5 justify-end">
                <span className="text-xs text-gray-400">{fmtDate(ticket.updated_at)}</span>
                <span className="text-sm font-semibold text-gray-700">Admin · LeadGenie</span>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl rounded-tr-none px-4 py-3">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.admin_reply}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Closed notice */}
      {ticket.status === 'closed' ? (
        <div className="text-center py-5 border-t border-gray-100 text-sm text-gray-400">
          This ticket is closed. Click{' '}
          <button onClick={() => save('open')} className="text-blue-600 font-semibold hover:text-blue-700">
            Reopen
          </button>{' '}
          if it needs more attention.
        </div>
      ) : (
        /* Reply box */
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block">
              {ticket.admin_reply ? 'Edit Reply' : 'Reply'}
            </label>
            <textarea value={reply} onChange={e => setReply(e.target.value)} rows={4}
              placeholder="Type your reply to the user…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex justify-end">
            <button onClick={() => save()} disabled={saving}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Save Reply'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

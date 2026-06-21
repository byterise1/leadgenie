'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type Ticket = {
  id: string;
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

function relativeDate(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function SupportPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/support/tickets')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setTickets(d); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!subject.trim() || !message.trim()) { setSubmitErr('Subject and message are required.'); return; }
    setSubmitting(true);
    setSubmitErr('');
    const res = await fetch('/api/support/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: subject.trim(), message: message.trim(), category }),
    });
    const data = await res.json();
    if (data.error) { setSubmitErr(data.error); setSubmitting(false); return; }
    setSubject(''); setMessage(''); setCategory('general');
    setShowNew(false);
    load();
    setSubmitting(false);
  };

  const hasNewReply = (t: Ticket) => t.admin_reply !== null && t.status !== 'closed';

  return (
    <main className="flex-1 p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Support</h1>
          <p className="text-sm text-gray-400 mt-0.5">Open a ticket and we&apos;ll get back to you.</p>
        </div>
        <button onClick={() => setShowNew(prev => !prev)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
          New Ticket
        </button>
      </div>

      {/* New ticket form */}
      {showNew && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-900">Open a New Ticket</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block">Subject</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief summary of your issue"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="general">General</option>
                <option value="billing">Billing</option>
                <option value="technical">Technical</option>
                <option value="account">Account</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block">Message</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4}
                placeholder="Describe your issue in detail…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
          {submitErr && <p className="text-xs text-red-500">{submitErr}</p>}
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowNew(false)} className="px-5 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors">
              Cancel
            </button>
            <button onClick={submit} disabled={submitting}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {submitting ? 'Submitting…' : 'Submit Ticket'}
            </button>
          </div>
        </div>
      )}

      {/* Ticket list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-2/3"/>
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3"/>
                </div>
                <div className="h-5 w-14 bg-gray-100 rounded-full animate-pulse"/>
              </div>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-500">No tickets yet</p>
            <p className="text-xs text-gray-400 mt-1">Open your first ticket above — we usually respond within 24 hours.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {tickets.map(t => (
              <div key={t.id} onClick={() => router.push(`/dashboard/support/${t.id}`)}
                className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 cursor-pointer transition-colors group">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${hasNewReply(t) ? 'bg-blue-500' : 'bg-gray-200'}`}/>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm truncate ${hasNewReply(t) ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                      {t.subject}
                    </p>
                    {hasNewReply(t) && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 rounded-full px-2 py-0.5 shrink-0">Reply</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-gray-400 capitalize">{t.category}</span>
                    <span className="text-gray-200 text-xs">·</span>
                    <span className="text-xs text-gray-400">{relativeDate(t.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 ${STATUS_COLORS[t.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {t.status === 'in_progress' ? 'In Progress' : t.status === 'closed' ? 'Closed' : 'Open'}
                  </span>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

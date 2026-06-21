'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Ticket = {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  admin_reply: string | null;
  user_seen_at: string | null;
  created_at: string;
};

export default function SupportWidget() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'list' | 'new' | 'success'>('list');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);

  const [category, setCategory] = useState('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const panelRef = useRef<HTMLDivElement>(null);

  const repliedCount = tickets.filter(t => t.admin_reply !== null && !t.user_seen_at && t.status !== 'closed').length;

  const loadTickets = () => {
    setLoading(true);
    fetch('/api/support/tickets')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setTickets(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) loadTickets();
  }, [open]);

  // When user opens ticket via full page (bell click), instantly clear widget badge
  useEffect(() => {
    const onSeen = () => setTickets(prev => prev.map(t => ({ ...t, user_seen_at: t.user_seen_at ?? new Date().toISOString() })));
    window.addEventListener('leadgenie:support-seen', onSeen);
    return () => window.removeEventListener('leadgenie:support-seen', onSeen);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        const btn = document.getElementById('support-widget-btn');
        if (btn && btn.contains(e.target as Node)) return;
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const uploadFiles = async (fileList: File[]): Promise<{ name: string; url: string }[]> => {
    const results: { name: string; url: string }[] = [];
    for (const file of fileList) {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/support/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) results.push({ name: data.name, url: data.url });
    }
    return results;
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      const attachments = files.length ? await uploadFiles(files) : [];

      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message, category, attachments }),
      });
      const data = await res.json();
      if (!data.error) {
        setView('success');
        setTickets(prev => [data, ...prev]);
        setSubject('');
        setMessage('');
        setCategory('general');
        setFiles([]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const goToTicket = (t: Ticket) => {
    setOpen(false);
    router.push(`/dashboard/support/${t.id}`);
  };

  const hasNewReply = (t: Ticket) => t.admin_reply !== null && !t.user_seen_at && t.status !== 'closed';

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3">
      {open && (
        <div
          ref={panelRef}
          className="w-[360px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col"
          style={{ height: '520px' }}
        >
          {/* Header */}
          <div className="bg-blue-600 px-5 py-4 text-white shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">Support</p>
                <p className="text-xs text-blue-200 mt-0.5">We typically reply within 24 hours</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-blue-500 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {view === 'list' && (
              <div className="h-full flex flex-col">
                <div className="px-4 py-3 border-b border-gray-100 shrink-0 flex gap-2">
                  <button
                    onClick={() => setView('new')}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-semibold rounded-xl py-2 hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                    </svg>
                    New Ticket
                  </button>
                  <button
                    onClick={() => { setOpen(false); router.push('/dashboard/support'); }}
                    className="px-3 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    View All
                  </button>
                </div>

                {loading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/>
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-gray-700">No tickets yet</p>
                    <p className="text-xs text-gray-400 mt-1">We typically reply within 24 hours.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {tickets.map(t => (
                      <button key={t.id} onClick={() => goToTicket(t)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${hasNewReply(t) ? 'bg-blue-50/50' : ''}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            {hasNewReply(t) && (
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"/>
                            )}
                            <p className={`text-sm truncate flex-1 ${hasNewReply(t) ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                              {t.subject}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {t.admin_reply && (
                              <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${
                                hasNewReply(t) ? 'bg-blue-100 text-blue-700' : 'bg-emerald-50 text-emerald-600'
                              }`}>
                                {hasNewReply(t) ? 'New Reply' : 'Replied'}
                              </span>
                            )}
                            <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 capitalize ${
                              t.status === 'open' ? 'bg-gray-100 text-gray-500' :
                              t.status === 'in_progress' ? 'bg-amber-50 text-amber-600' :
                              'bg-gray-100 text-gray-400'
                            }`}>
                              {t.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-400 capitalize">{t.category}</span>
                          <span className="text-[10px] text-gray-300">·</span>
                          <span className="text-[10px] text-gray-400">{new Date(t.created_at).toLocaleDateString()}</span>
                          {t.admin_reply && !hasNewReply(t) && (
                            <span className="text-[10px] text-gray-400 ml-auto">Tap to view reply →</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {view === 'new' && (
              <div className="p-4 space-y-4">
                <button onClick={() => setView('list')} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                  </svg>
                  Back
                </button>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block">Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="billing">Billing</option>
                    <option value="technical">Technical Issue</option>
                    <option value="general">General Question</option>
                    <option value="account">Account</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block">Subject</label>
                  <input value={subject} onChange={e => setSubject(e.target.value)}
                    placeholder="Describe your issue briefly"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block">Message</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)}
                    rows={4} placeholder="Tell us more about the issue…"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>

                {/* File attachment */}
                <div>
                  <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt,.csv"
                    className="hidden" onChange={e => setFiles(Array.from(e.target.files ?? []))}/>
                  <button onClick={() => fileRef.current?.click()} type="button"
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 hover:text-gray-600 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                    </svg>
                    {files.length ? `${files.length} file${files.length > 1 ? 's' : ''} selected` : 'Attach files (optional)'}
                  </button>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting || !subject.trim() || !message.trim()}
                  className="w-full py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Submitting…' : 'Submit Ticket'}
                </button>
              </div>
            )}

            {view === 'success' && (
              <div className="h-full flex flex-col items-center justify-center px-6 text-center">
                <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <p className="text-base font-bold text-gray-900 mb-1">Ticket submitted!</p>
                <p className="text-sm text-gray-400 mb-6">We&apos;ll reply within 24 hours. You&apos;ll get a notification.</p>
                <button
                  onClick={() => { setView('list'); }}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                >
                  View My Tickets
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        id="support-widget-btn"
        onClick={() => { setOpen(v => !v); if (!open) setView('list'); }}
        className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 relative"
        title="Support"
      >
        {open ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/>
          </svg>
        )}
        {!open && repliedCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
            {repliedCount > 9 ? '9+' : repliedCount}
          </span>
        )}
      </button>
    </div>
  );
}

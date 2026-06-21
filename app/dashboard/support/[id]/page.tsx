'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Message = { role: 'user' | 'admin'; body: string; ts: string };

type Ticket = {
  id: string;
  user_email: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  priority: string;
  admin_reply: string | null;
  user_seen_at: string | null;
  messages: Message[] | null;
  attachments: { name: string; url: string }[] | null;
  created_at: string;
  updated_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-emerald-50 text-emerald-700',
  in_progress: 'bg-amber-50 text-amber-700',
  closed: 'bg-gray-100 text-gray-500',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function UserTicketPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [followUp, setFollowUp] = useState('');
  const [sending, setSending] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/support/tickets/${id}`)
      .then(r => r.json())
      .then(async d => {
        if (!d.error) {
          setTicket(d);
          // Mark as seen if admin replied and not yet seen
          if (d.admin_reply && !d.user_seen_at) {
            await fetch(`/api/support/tickets/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mark_seen: true }),
            });
            window.dispatchEvent(new Event('leadgenie:support-seen'));
          }
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const buildThread = (): { role: 'user' | 'admin'; body: string; ts: string }[] => {
    if (!ticket) return [];
    const msgs: { role: 'user' | 'admin'; body: string; ts: string }[] = [];
    msgs.push({ role: 'user', body: ticket.message, ts: ticket.created_at });
    const extras = Array.isArray(ticket.messages) ? ticket.messages : [];
    for (const m of extras) {
      if (m.role === 'user' && m.body === ticket.message) continue;
      msgs.push(m);
    }
    if (extras.length === 0 && ticket.admin_reply) {
      msgs.push({ role: 'admin', body: ticket.admin_reply, ts: ticket.updated_at });
    }
    return msgs;
  };

  const uploadFiles = async (): Promise<{ name: string; url: string }[]> => {
    if (!files.length) return [];
    const uploaded: { name: string; url: string }[] = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/support/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) uploaded.push({ name: data.name, url: data.url });
    }
    return uploaded;
  };

  const sendFollowUp = async () => {
    if (!followUp.trim() && !files.length) return;
    setSending(true);
    if (files.length) setUploading(true);
    let attachmentUrls: { name: string; url: string }[] = [];
    if (files.length) {
      attachmentUrls = await uploadFiles();
      setUploading(false);
    }
    const body: Record<string, unknown> = {};
    if (followUp.trim()) body.follow_up = followUp.trim();
    if (attachmentUrls.length) body.attachments = attachmentUrls;

    const res = await fetch(`/api/support/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.error) {
      setTicket(data);
      setFollowUp('');
      setFiles([]);
    }
    setSending(false);
  };

  if (loading) {
    return (
      <main className="flex-1 p-6 max-w-3xl">
        <div className="h-4 w-24 bg-gray-100 rounded animate-pulse mb-6"/>
        <div className="h-7 w-64 bg-gray-100 rounded animate-pulse mb-4"/>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-4 bg-gray-100 rounded animate-pulse"/>)}
        </div>
      </main>
    );
  }

  if (!ticket) {
    return (
      <main className="flex-1 p-6 max-w-3xl">
        <button onClick={() => router.push('/dashboard/support')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          Back
        </button>
        <p className="text-sm text-gray-400">Ticket not found.</p>
      </main>
    );
  }

  const initials = ticket.user_email.charAt(0).toUpperCase();
  const thread = buildThread();

  return (
    <main className="flex-1 p-6 max-w-3xl space-y-6">
      <button onClick={() => router.push('/dashboard/support')}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
        </svg>
        Support tickets
      </button>

      <div>
        <h1 className="text-xl font-bold text-gray-900">{ticket.subject}</h1>
        <div className="flex items-center gap-2 flex-wrap mt-2 text-xs">
          <span className={`font-bold rounded-full px-2.5 py-1 ${STATUS_COLORS[ticket.status] ?? 'bg-gray-100 text-gray-500'}`}>
            {ticket.status === 'in_progress' ? '• In Progress' : ticket.status === 'closed' ? '• Closed' : '• Open'}
          </span>
          <span className="text-gray-400 capitalize">{ticket.category}</span>
          <span className="text-gray-200">·</span>
          <span className="text-gray-400">Opened {fmtDate(ticket.created_at)}</span>
        </div>
      </div>

      {/* Conversation thread */}
      <div className="space-y-4">
        {thread.map((msg, i) => (
          msg.role === 'user' ? (
            <div key={i} className="flex gap-3 items-start">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-sm font-bold text-gray-600">
                {initials}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-semibold text-gray-700">You</span>
                  <span className="text-xs text-gray-400">{fmtDate(msg.ts)}</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                </div>
              </div>
            </div>
          ) : (
            <div key={i} className="flex gap-3 items-start flex-row-reverse">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-sm font-bold text-blue-600">
                LG
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5 justify-end">
                  <span className="text-xs text-gray-400">{fmtDate(msg.ts)}</span>
                  <span className="text-sm font-semibold text-gray-700">LeadGenie Support</span>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-2xl rounded-tr-none px-4 py-3">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                </div>
              </div>
            </div>
          )
        ))}

        {!ticket.admin_reply && (
          <div className="flex items-center gap-3 rounded-2xl bg-gray-50 border border-gray-100 px-5 py-4">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Awaiting response</p>
              <p className="text-xs text-gray-400 mt-0.5">Our team usually replies within 24 hours. You&apos;ll get a notification when we do.</p>
            </div>
          </div>
        )}
      </div>

      {/* Attachments */}
      {ticket.attachments && ticket.attachments.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-xs font-bold text-gray-400 uppercase mb-2">Attachments</p>
          <div className="space-y-1">
            {ticket.attachments.map((a, i) => (
              <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                </svg>
                {a.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Reply / follow-up box */}
      {ticket.status !== 'closed' ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase">
            {ticket.admin_reply ? 'Send Follow-up' : 'Additional Info'}
          </p>
          <textarea value={followUp} onChange={e => setFollowUp(e.target.value)} rows={3}
            placeholder="Type a follow-up message…"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"/>

          <div className="flex items-center justify-between gap-3">
            <div>
              <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt,.csv"
                className="hidden" onChange={e => setFiles(Array.from(e.target.files ?? []))}/>
              <button onClick={() => fileRef.current?.click()} type="button"
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                </svg>
                {files.length ? `${files.length} file${files.length > 1 ? 's' : ''} selected` : 'Attach files'}
              </button>
            </div>
            <button onClick={sendFollowUp} disabled={sending || (!followUp.trim() && !files.length)}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {uploading ? 'Uploading…' : sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">This ticket is closed. Open a new ticket if you need further help.</p>
        </div>
      )}
    </main>
  );
}

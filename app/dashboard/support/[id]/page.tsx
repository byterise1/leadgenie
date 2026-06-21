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

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function UserTicketPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/support/tickets/${id}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setTicket(d); })
      .finally(() => setLoading(false));
  }, [id]);

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

  return (
    <main className="flex-1 p-6 max-w-3xl space-y-6">
      {/* Back */}
      <button onClick={() => router.push('/dashboard/support')}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
        </svg>
        Support tickets
      </button>

      {/* Header */}
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

      {/* Conversation */}
      <div className="space-y-5">
        {/* User's original message */}
        <div className="flex gap-3 items-start">
          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-sm font-bold text-gray-600">
            {initials}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-semibold text-gray-700">You</span>
              <span className="text-xs text-gray-400">{fmtDate(ticket.created_at)}</span>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.message}</p>
            </div>
          </div>
        </div>

        {/* Admin reply */}
        {ticket.admin_reply ? (
          <div className="flex gap-3 items-start flex-row-reverse">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-sm font-bold text-blue-600">
              LG
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5 justify-end">
                <span className="text-xs text-gray-400">{fmtDate(ticket.updated_at)}</span>
                <span className="text-sm font-semibold text-gray-700">LeadGenie Support</span>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl rounded-tr-none px-4 py-3">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.admin_reply}</p>
              </div>
            </div>
          </div>
        ) : (
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

        {/* Closed notice */}
        {ticket.status === 'closed' && (
          <div className="text-center py-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">This ticket has been closed. Open a new ticket if you need further help.</p>
          </div>
        )}
      </div>
    </main>
  );
}

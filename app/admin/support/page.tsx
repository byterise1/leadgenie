'use client';

import { useEffect, useState, useCallback } from 'react';

type Ticket = {
  id: string;
  user_id: string;
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
  open: 'bg-red-50 text-red-600',
  in_progress: 'bg-amber-50 text-amber-700',
  closed: 'bg-emerald-50 text-emerald-700',
};
const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-50 text-orange-700',
  normal: 'bg-blue-50 text-blue-600',
  low: 'bg-gray-100 text-gray-500',
};

function TicketDrawer({ ticket, onClose, onUpdate }: { ticket: Ticket; onClose: () => void; onUpdate: (t: Ticket) => void }) {
  const [reply, setReply] = useState(ticket.admin_reply ?? '');
  const [status, setStatus] = useState(ticket.status);
  const [priority, setPriority] = useState(ticket.priority);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await fetch('/api/admin/support', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ticket.id, status, priority, admin_reply: reply }),
    });
    const data = await res.json();
    if (!data.error) { onUpdate(data); onClose(); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-bold text-gray-900">{ticket.subject}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{ticket.user_email} · {new Date(ticket.created_at).toLocaleDateString()}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-bold text-gray-400 uppercase mb-2">User Message</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.message}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block">Reply to User</label>
            <textarea value={reply} onChange={e => setReply(e.target.value)} rows={5} placeholder="Type your reply here…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700">Cancel</button>
          <button onClick={save} disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors">
            {saving ? 'Saving…' : 'Save & Reply'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Ticket | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const q = statusFilter ? `?status=${statusFilter}` : '';
    fetch(`/api/admin/support${q}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setTickets(d); })
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openCount = tickets.filter(t => t.status === 'open').length;

  return (
    <main className="flex-1 p-6 space-y-6">
      {selected && (
        <TicketDrawer
          ticket={selected}
          onClose={() => setSelected(null)}
          onUpdate={updated => {
            setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
            setSelected(null);
          }}
        />
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Support Tickets</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {openCount > 0 ? <span className="text-red-500 font-semibold">{openCount} open</span> : 'All caught up'}
            {' '}· {tickets.length} total
          </p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {[['', 'All'], ['open', 'Open'], ['in_progress', 'In Progress'], ['closed', 'Closed']].map(([val, label]) => (
            <button key={val} onClick={() => setStatusFilter(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === val ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['User', 'Subject', 'Category', 'Priority', 'Status', 'Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-3.5 bg-gray-100 rounded animate-pulse w-full max-w-[80px]"/></td>
                  ))}</tr>
                ))
              ) : tickets.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center text-sm text-gray-400">No tickets found.</td></tr>
              ) : tickets.map(t => (
                <tr key={t.id} onClick={() => setSelected(t)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-gray-700 max-w-[140px] truncate">{t.user_email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900 max-w-[200px] truncate">{t.subject}</p>
                    {t.admin_reply && <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Replied</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500 capitalize">{t.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 capitalize ${PRIORITY_COLORS[t.priority] ?? PRIORITY_COLORS.normal}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 capitalize ${STATUS_COLORS[t.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-400">{new Date(t.created_at).toLocaleDateString()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

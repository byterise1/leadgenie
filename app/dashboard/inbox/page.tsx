'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Skeleton } from '@/components/Skeleton';

const STATUS_FILTERS = ['All', 'Interested', 'Not Interested', 'Out of Office', 'Do Not Contact'];

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  interested:      { label: 'Interested',      color: 'bg-emerald-500 text-white border-emerald-500',  dot: 'bg-emerald-500' },
  not_interested:  { label: 'Not Interested',  color: 'bg-gray-700 text-white border-gray-700',        dot: 'bg-gray-500' },
  out_of_office:   { label: 'Out of Office',   color: 'bg-amber-500 text-white border-amber-500',      dot: 'bg-amber-400' },
  do_not_contact:  { label: 'Do Not Contact',  color: 'bg-red-500 text-white border-red-500',          dot: 'bg-red-500' },
  replied:         { label: 'Replied',         color: 'bg-blue-500 text-white border-blue-500',        dot: 'bg-blue-500' },
};

type Thread = {
  id: string;
  subject: string;
  last_message: string;
  from_email: string;
  from_name: string;
  status: string;
  read: boolean;
  received_at: string;
  campaign_id?: string | null;
  lead?: { first_name: string | null; last_name: string | null; email: string; company: string | null };
  campaign?: { id: string; name: string };
  account?: { email: string };
};

type ThreadMessage = {
  type: 'sent' | 'reply';
  step_number: number;
  subject: string;
  body: string;
  sent_at: string;
  opened_at?: string | null;
  is_reply_thread?: boolean;
  account_email?: string;
  from_name?: string;
  from_email?: string;
  ab_variant?: string;
};

function relTime(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function Avatar({ name, isLead }: { name: string; isLead: boolean }) {
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold ${isLead ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
      {initials}
    </div>
  );
}

export default function InboxPage() {
  const [statusFilter, setStatusFilter] = useState('All');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [search, setSearch] = useState('');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [selected, setSelected] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState('');
  const threadEndRef = useRef<HTMLDivElement>(null);

  const fetchThreads = useCallback((showLoader = false) => {
    if (showLoader) setLoading(true);
    fetch('/api/inbox')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setThreads(data); })
      .finally(() => { if (showLoader) setLoading(false); });
  }, []);

  const syncInbox = useCallback(async (silent = false) => {
    setSyncing(true);
    if (!silent) setSyncMsg('');
    try {
      const res = await fetch('/api/inbox/sync', { method: 'POST' });
      const data = await res.json();
      if (!silent) {
        setSyncMsg(data.synced > 0 ? `${data.synced} new repl${data.synced === 1 ? 'y' : 'ies'}` : 'Up to date');
        setTimeout(() => setSyncMsg(''), 4000);
      }
      if (data.synced > 0) fetchThreads();
    } catch {
      if (!silent) { setSyncMsg('Sync failed'); setTimeout(() => setSyncMsg(''), 3000); }
    } finally {
      setSyncing(false);
    }
  }, [fetchThreads]);

  useEffect(() => {
    fetchThreads(true);
    syncInbox(true);
    const pollInbox = setInterval(() => fetchThreads(), 15000);
    const pollSync = setInterval(() => syncInbox(true), 60000);
    return () => { clearInterval(pollInbox); clearInterval(pollSync); };
  }, [fetchThreads, syncInbox]);

  // All unique campaigns for the filter dropdown
  const campaigns = Array.from(
    new Map(threads.filter(t => t.campaign).map(t => [t.campaign!.id, t.campaign!])).values()
  );

  // Client-side filter
  const filtered = threads.filter(t => {
    if (statusFilter !== 'All') {
      const statusMap: Record<string, string> = {
        'Interested': 'interested', 'Not Interested': 'not_interested',
        'Out of Office': 'out_of_office', 'Do Not Contact': 'do_not_contact',
      };
      if (t.status !== statusMap[statusFilter]) return false;
    }
    if (campaignFilter && t.campaign?.id !== campaignFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = [t.lead?.first_name, t.lead?.last_name].filter(Boolean).join(' ').toLowerCase();
      const email = (t.lead?.email || t.from_email || '').toLowerCase();
      const company = (t.lead?.company || '').toLowerCase();
      const subject = t.subject.toLowerCase();
      if (!name.includes(q) && !email.includes(q) && !company.includes(q) && !subject.includes(q)) return false;
    }
    return true;
  });

  const unread = threads.filter(t => !t.read).length;

  const selectThread = async (thread: Thread) => {
    setSelected(thread);
    setMessages([]);
    setExpandedSteps(new Set());
    setReplyBody('');
    setSendMsg('');
    setMessagesLoading(true);

    fetch(`/api/inbox/${thread.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.messages) {
          setMessages(data.messages);
          const defaultExpanded = new Set<number>();
          data.messages.forEach((m: ThreadMessage, i: number) => {
            if (m.type === 'reply' || i === data.messages.length - 1) defaultExpanded.add(i);
          });
          setExpandedSteps(defaultExpanded);
          setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      })
      .finally(() => setMessagesLoading(false));

    if (!thread.read) {
      setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, read: true } : t));
      window.dispatchEvent(new CustomEvent('leadgenie:thread-read'));
      fetch('/api/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: thread.id, read: true }),
      });
    }
  };

  const updateStatus = (id: string, status: string) => {
    setThreads(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    setSelected(prev => prev?.id === id ? { ...prev, status } : prev);
    fetch('/api/inbox', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
  };

  const sendReply = async () => {
    if (!selected || !replyBody.trim()) return;
    setSending(true);
    setSendMsg('');
    try {
      const res = await fetch('/api/inbox/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: selected.id, body: replyBody.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendMsg('Reply sent!');
        setReplyBody('');
        setThreads(prev => prev.map(t => t.id === selected.id ? { ...t, status: 'replied' } : t));
        setSelected(prev => prev ? { ...prev, status: 'replied' } : prev);
        setTimeout(() => setSendMsg(''), 4000);
      } else {
        setSendMsg(data.error || 'Send failed');
      }
    } catch {
      setSendMsg('Send failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
      {/* LEFT PANEL */}
      <div className="w-80 shrink-0 border-r border-gray-100 flex flex-col bg-white">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold text-gray-900">Unibox</h1>
            <div className="flex items-center gap-2">
              {syncMsg && <span className="text-[10px] text-emerald-600 font-semibold">{syncMsg}</span>}
              <button onClick={() => syncInbox(false)} disabled={syncing}
                className="flex items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-blue-600 disabled:opacity-40 transition-colors">
                <svg className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                {syncing ? 'Syncing…' : 'Sync'}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span><span className="font-bold text-gray-700">{threads.length}</span> total</span>
            <span className="w-px h-3 bg-gray-200"/>
            <span><span className="font-bold text-gray-700">{unread}</span> unread</span>
            <span className="w-px h-3 bg-gray-200"/>
            <span><span className="font-bold text-gray-700">{filtered.length}</span> shown</span>
          </div>
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, subject…"
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 transition"/>
          </div>
          {/* Filters row */}
          <div className="flex gap-2">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
              {STATUS_FILTERS.map(f => <option key={f}>{f}</option>)}
            </select>
            <select value={campaignFilter} onChange={e => setCampaignFilter(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
              <option value="">All Campaigns</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-4 py-3.5 border-b border-gray-50 space-y-2">
                <div className="flex justify-between"><Skeleton className="h-3.5 w-28"/><Skeleton className="h-2.5 w-8"/></div>
                <Skeleton className="h-2.5 w-full"/>
                <Skeleton className="h-2.5 w-2/3"/>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center h-full">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z"/>
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-600 mb-1">{threads.length > 0 ? 'No matches' : 'No replies yet'}</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                {threads.length > 0 ? 'Try adjusting your search or filters.' : 'Campaign replies will appear here automatically.'}
              </p>
            </div>
          ) : filtered.map(thread => {
            const displayName = thread.lead
              ? ([thread.lead.first_name, thread.lead.last_name].filter(Boolean).join(' ') || thread.lead.email)
              : (thread.from_name || thread.from_email || '—');
            const statusDot = STATUS_META[thread.status]?.dot;
            return (
              <button key={thread.id} onClick={() => selectThread(thread)}
                className={`w-full text-left px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors ${selected?.id === thread.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}>
                <div className="flex items-start justify-between gap-2 mb-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {!thread.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"/>}
                    <p className={`text-sm truncate ${!thread.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {displayName}
                    </p>
                  </div>
                  <p className="text-[10px] text-gray-400 shrink-0">{relTime(thread.received_at)}</p>
                </div>
                <p className="text-xs text-gray-600 truncate">{thread.subject}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {thread.campaign && (
                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 rounded px-1.5 py-0.5 truncate max-w-[130px]">
                      {thread.campaign.name}
                    </span>
                  )}
                  {thread.lead?.company && (
                    <span className="text-[10px] text-gray-400 truncate max-w-[100px]">{thread.lead.company}</span>
                  )}
                  {statusDot && (
                    <span className={`w-1.5 h-1.5 rounded-full ${statusDot} ml-auto shrink-0`}/>
                  )}
                </div>
                {thread.last_message && (
                  <p className="text-[10px] text-gray-400 truncate mt-0.5">{thread.last_message}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANEL */}
      {selected ? (
        <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
          {/* Thread header */}
          <div className="px-6 py-4 border-b border-gray-100 bg-white shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-gray-900 truncate">{selected.subject}</h2>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                  <span className="text-xs text-gray-500">
                    {[selected.lead?.first_name, selected.lead?.last_name].filter(Boolean).join(' ') || selected.from_name || selected.from_email}
                    {selected.lead?.email && ` <${selected.lead.email}>`}
                    {selected.lead?.company ? ` · ${selected.lead.company}` : ''}
                  </span>
                  {selected.account?.email && (
                    <span className="text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">via {selected.account.email}</span>
                  )}
                  {selected.campaign && (
                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">
                      {selected.campaign.name}
                    </span>
                  )}
                </div>
              </div>
              {/* Status buttons */}
              <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                {[
                  { key: 'interested',     label: '✓ Interested' },
                  { key: 'not_interested', label: '✕ Not Interested' },
                  { key: 'out_of_office',  label: 'Out of Office' },
                  { key: 'do_not_contact', label: '🚫 DNC' },
                ].map(s => {
                  const active = selected.status === s.key;
                  const meta = STATUS_META[s.key];
                  return (
                    <button key={s.key} onClick={() => updateStatus(selected.id, active ? 'new' : s.key)}
                      className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${active ? meta.color : 'border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700'}`}>
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Messages — scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-2.5">
            {messagesLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
                    <Skeleton className="h-3 w-32"/><Skeleton className="h-2.5 w-full"/><Skeleton className="h-2.5 w-3/4"/>
                  </div>
                ))}
              </div>
            ) : messages.map((msg, i) => {
              const isExpanded = expandedSteps.has(i);
              const isReplyMsg = msg.type === 'reply';
              const senderName = isReplyMsg
                ? (msg.from_name || msg.from_email || selected.from_email || 'Lead')
                : (msg.from_name ? `${msg.from_name} <${msg.account_email}>` : msg.account_email || 'You');

              return (
                <div key={i} className={`rounded-xl border transition-all ${isReplyMsg ? 'bg-white border-blue-100 shadow-sm' : 'bg-white border-gray-100'}`}>
                  <button type="button" onClick={() => setExpandedSteps(prev => {
                    const next = new Set(prev);
                    if (next.has(i)) next.delete(i); else next.add(i);
                    return next;
                  })} className="w-full flex items-center justify-between px-4 py-3 text-left">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={senderName} isLead={isReplyMsg}/>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-gray-900 truncate max-w-[160px]">{senderName}</span>
                          {isReplyMsg && <span className="shrink-0 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">Reply</span>}
                          {msg.type === 'sent' && msg.step_number === 0 && <span className="shrink-0 text-[10px] text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5">Email 1</span>}
                          {msg.type === 'sent' && msg.step_number > 0 && (
                            <span className="shrink-0 text-[10px] text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5">
                              {msg.is_reply_thread ? '↩ Follow-up' : `Email ${msg.step_number + 1}`}
                            </span>
                          )}
                          {msg.ab_variant && msg.ab_variant !== 'A' && (
                            <span className="shrink-0 text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-100 rounded-full px-2 py-0.5">
                              Variant {msg.ab_variant}
                            </span>
                          )}
                        </div>
                        {!isExpanded && (
                          <p className="text-[11px] text-gray-400 truncate max-w-xs mt-0.5">
                            {msg.subject || msg.body.slice(0, 80)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {msg.type === 'sent' && msg.opened_at && (
                        <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 rounded px-1.5 py-0.5">Opened</span>
                      )}
                      <span className="text-[10px] text-gray-400">
                        {new Date(msg.sent_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                      </svg>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-50">
                      {msg.subject && !msg.is_reply_thread && (
                        <div className="pt-3 pb-2">
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Subject</span>
                          <p className="text-xs font-semibold text-gray-800 mt-0.5">{msg.subject}</p>
                        </div>
                      )}
                      <div className={msg.subject && !msg.is_reply_thread ? '' : 'pt-3'}>
                        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{msg.body || '(No content)'}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={threadEndRef}/>
          </div>

          {/* Reply composer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-white shrink-0">
            <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
                </svg>
                <span className="text-[11px] text-gray-500 truncate">
                  Reply to <span className="font-semibold text-gray-700">{selected.from_name || selected.from_email || selected.lead?.email}</span>
                  {selected.account?.email && <> from <span className="font-semibold text-gray-700">{selected.account.email}</span></>}
                </span>
              </div>
              <textarea
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply(); }}
                placeholder="Write your reply…"
                rows={4}
                className="w-full px-4 py-3 text-sm text-gray-800 resize-none outline-none bg-white placeholder-gray-400"
              />
              <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[10px] text-gray-400">Ctrl+Enter to send</span>
                <div className="flex items-center gap-3">
                  {sendMsg && (
                    <span className={`text-[11px] font-semibold ${sendMsg === 'Reply sent!' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {sendMsg}
                    </span>
                  )}
                  <button onClick={sendReply} disabled={sending || !replyBody.trim()}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">
                    {sending ? (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                      </svg>
                    )}
                    {sending ? 'Sending…' : 'Send Reply'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 flex items-center justify-center mb-4 shadow-sm">
            <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-700 mb-1">Select a conversation</p>
          <p className="text-xs text-gray-400 max-w-xs leading-relaxed">Replies from all your campaigns appear here in one unified view.</p>
        </div>
      )}
    </main>
  );
}

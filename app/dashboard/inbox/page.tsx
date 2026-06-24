'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Skeleton } from '@/components/Skeleton';

const filters = ['All', 'Interested', 'Not Interested', 'Out of Office', 'Do Not Contact'];

type Thread = {
  id: string;
  subject: string;
  last_message: string;
  from_email: string;
  from_name: string;
  status: string;
  read: boolean;
  received_at: string;
  lead?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    company: string | null;
  };
  campaign?: {
    id: string;
    name: string;
  };
  account?: {
    email: string;
  };
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
};

export default function InboxPage() {
  const [filter, setFilter] = useState('All');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [selected, setSelected] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const threadEndRef = useRef<HTMLDivElement>(null);

  const fetchThreads = useCallback((showLoader = false) => {
    if (showLoader) setLoading(true);
    fetch(`/api/inbox?status=${encodeURIComponent(filter)}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setThreads(data); })
      .finally(() => { if (showLoader) setLoading(false); });
  }, [filter]);

  const syncInbox = useCallback(async (silent = false) => {
    setSyncing(true);
    if (!silent) setSyncMsg('');
    try {
      const res = await fetch('/api/inbox/sync', { method: 'POST' });
      const data = await res.json();
      if (!silent) {
        setSyncMsg(data.synced > 0 ? `${data.synced} new repl${data.synced === 1 ? 'y' : 'ies'} found` : 'Up to date');
        setTimeout(() => setSyncMsg(''), 4000);
      }
      if (data.synced > 0) fetchThreads();
    } catch {
      if (!silent) { setSyncMsg('Sync failed'); setTimeout(() => setSyncMsg(''), 3000); }
    } finally {
      setSyncing(false);
    }
  }, [fetchThreads]);

  // Auto-sync on mount, then poll every 60s
  useEffect(() => {
    fetchThreads(true);
    syncInbox(true);
    const pollInbox = setInterval(() => fetchThreads(), 10000);
    const pollSync = setInterval(() => syncInbox(true), 60000);
    return () => { clearInterval(pollInbox); clearInterval(pollSync); };
  }, [fetchThreads, syncInbox]);

  const selectThread = async (thread: Thread) => {
    setSelected(thread);
    setMessages([]);
    setExpandedSteps(new Set());
    setMessagesLoading(true);

    // Load full conversation thread
    fetch(`/api/inbox/${thread.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.messages) {
          setMessages(data.messages);
          // Auto-expand reply and last sent step
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
      await fetch('/api/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: thread.id, read: true }),
      });
    }
  };

  const updateStatus = (id: string, status: string) => {
    // Optimistic — update UI instantly, sync in background
    setThreads(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    setSelected(prev => prev?.id === id ? { ...prev, status } : prev);
    fetch('/api/inbox', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    }).catch(() => {
      // Rollback on failure
      setThreads(prev => prev.map(t => t.id === id ? { ...t, status: t.status } : t));
    });
  };

  const unread = threads.filter(t => !t.read).length;

  return (
    <main className="flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
      <div className="w-80 shrink-0 border-r border-gray-100 flex flex-col bg-white">
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base font-bold text-gray-900">Unibox</h1>
            <div className="flex items-center gap-2">
              {syncMsg && <span className="text-[10px] text-emerald-600 font-semibold">{syncMsg}</span>}
              <button
                onClick={() => syncInbox(false)}
                disabled={syncing}
                title="Sync Gmail replies"
                className="flex items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-blue-600 transition-colors disabled:opacity-40"
              >
                <svg className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                {syncing ? 'Syncing…' : 'Sync'}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
            <span><span className="font-bold text-gray-700">{threads.length}</span> received</span>
            <span className="w-px h-3 bg-gray-200"/>
            <span><span className="font-bold text-gray-700">{unread}</span> unread</span>
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input placeholder="Search inbox..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
          </div>
        </div>

        <div className="px-4 py-2.5 border-b border-gray-100">
          <div className="relative">
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="w-full appearance-none border border-gray-200 rounded-xl bg-white px-3 py-2 pr-8 text-xs font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer transition">
              {filters.map(f => <option key={f}>{f}</option>)}
            </select>
            <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
            </svg>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-0">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="px-4 py-3.5 border-b border-gray-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-2.5 w-10" />
                  </div>
                  <Skeleton className="h-2.5 w-full" />
                  <Skeleton className="h-2.5 w-3/4" />
                </div>
              ))}
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center flex-1 h-full">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z"/></svg>
              </div>
              <p className="text-sm font-semibold text-gray-600 mb-1">No replies yet</p>
              <p className="text-xs text-gray-400 leading-relaxed">Replies from your campaigns will appear here automatically.</p>
              <button
                onClick={() => syncInbox(false)}
                disabled={syncing}
                className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-40"
              >
                {syncing ? 'Syncing…' : 'Sync now'}
              </button>
            </div>
          ) : threads.map(thread => (
            <button key={thread.id} onClick={() => selectThread(thread)}
              className={`w-full text-left px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 transition-colors ${selected?.id === thread.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className={`text-sm truncate ${!thread.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                  {thread.lead
                    ? [thread.lead.first_name, thread.lead.last_name].filter(Boolean).join(' ') || thread.lead.email
                    : thread.from_name || thread.from_email || '—'}
                </p>
                <p className="text-[10px] text-gray-400 shrink-0">{new Date(thread.received_at).toLocaleDateString()}</p>
              </div>
              <p className="text-xs text-gray-600 truncate">{thread.subject}</p>
              {thread.campaign && (
                <span className="inline-block text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 mt-1 truncate max-w-full">
                  {thread.campaign.name}
                </span>
              )}
              {thread.last_message && <p className="text-[10px] text-gray-400 truncate mt-0.5">{thread.last_message}</p>}
              {!thread.read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"/>}
            </button>
          ))}
        </div>
      </div>

      {selected ? (
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {/* Thread header */}
          <div className="px-6 py-4 border-b border-gray-100 shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-gray-900 truncate">{selected.subject}</h2>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                  <span className="text-xs text-gray-400">
                    {[selected.lead?.first_name, selected.lead?.last_name].filter(Boolean).join(' ') || selected.from_name || selected.from_email}
                    {selected.lead?.company ? ` · ${selected.lead.company}` : ''}
                  </span>
                  {selected.account?.email && (
                    <span className="text-[10px] text-gray-400">via {selected.account.email}</span>
                  )}
                  {selected.campaign && (
                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">
                      {selected.campaign.name}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                {[
                  { key: 'interested', label: '✓ Interested', active: 'bg-emerald-500 text-white border-emerald-500', inactive: 'border-gray-200 text-gray-500 hover:border-emerald-400 hover:text-emerald-600' },
                  { key: 'not_interested', label: 'Not Interested', active: 'bg-gray-700 text-white border-gray-700', inactive: 'border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700' },
                  { key: 'out_of_office', label: 'Out of Office', active: 'bg-amber-500 text-white border-amber-500', inactive: 'border-gray-200 text-gray-500 hover:border-amber-400 hover:text-amber-600' },
                  { key: 'do_not_contact', label: '🚫 DNC', active: 'bg-red-500 text-white border-red-500', inactive: 'border-gray-200 text-gray-500 hover:border-red-400 hover:text-red-600' },
                ].map(s => (
                  <button key={s.key} onClick={() => updateStatus(selected.id, s.key)}
                    className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${selected.status === s.key ? s.active : s.inactive}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Thread messages — scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3 bg-gray-50">
            {messagesLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-2.5 w-full" />
                    <Skeleton className="h-2.5 w-3/4" />
                  </div>
                ))}
              </div>
            ) : messages.map((msg, i) => {
              const isExpanded = expandedSteps.has(i);
              const isReplyMsg = msg.type === 'reply';

              return (
                <div key={i} className={`rounded-xl border transition-all ${
                  isReplyMsg
                    ? 'bg-white border-blue-100 shadow-sm'
                    : 'bg-white border-gray-100'
                }`}>
                  {/* Message header — always visible, click to expand/collapse */}
                  <button
                    type="button"
                    onClick={() => setExpandedSteps(prev => {
                      const next = new Set(prev);
                      if (next.has(i)) next.delete(i); else next.add(i);
                      return next;
                    })}
                    className="w-full flex items-center justify-between px-4 py-3 text-left">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Avatar */}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold ${
                        isReplyMsg ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {isReplyMsg
                          ? (selected.from_name || selected.from_email || '?')[0].toUpperCase()
                          : (msg.account_email || msg.from_name || 'Y')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-900 truncate">
                            {isReplyMsg
                              ? (msg.from_name || msg.from_email || selected.from_email || 'Lead')
                              : (msg.from_name ? `${msg.from_name} <${msg.account_email}>` : msg.account_email || 'You')}
                          </span>
                          {isReplyMsg && (
                            <span className="shrink-0 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">Reply</span>
                          )}
                          {msg.type === 'sent' && msg.step_number === 0 && (
                            <span className="shrink-0 text-[10px] font-semibold text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5">Email 1</span>
                          )}
                          {msg.type === 'sent' && msg.step_number > 0 && (
                            <span className="shrink-0 text-[10px] font-semibold text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5">
                              {msg.is_reply_thread ? '↩ Follow-up' : `Email ${msg.step_number + 1}`}
                            </span>
                          )}
                        </div>
                        {!isExpanded && (
                          <p className="text-[11px] text-gray-400 truncate max-w-xs">
                            {msg.subject || msg.body.slice(0, 80)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {msg.type === 'sent' && msg.opened_at && (
                        <span className="text-[10px] text-emerald-600 font-semibold">Opened</span>
                      )}
                      <span className="text-[10px] text-gray-400">
                        {new Date(msg.sent_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                      </svg>
                    </div>
                  </button>

                  {/* Expanded body */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-50">
                      {msg.subject && !msg.is_reply_thread && (
                        <div className="pt-3 pb-2">
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Subject</span>
                          <p className="text-xs font-semibold text-gray-800 mt-0.5">{msg.subject}</p>
                        </div>
                      )}
                      <div className={msg.subject && !msg.is_reply_thread ? '' : 'pt-3'}>
                        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                          {msg.body || '(No content)'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={threadEndRef} />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 flex items-center justify-center mb-4 shadow-sm">
            <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z"/></svg>
          </div>
          <p className="text-sm font-semibold text-gray-700 mb-1">Select a conversation</p>
          <p className="text-xs text-gray-400 max-w-xs leading-relaxed">Choose a reply from the left panel to read it here.</p>
        </div>
      )}
    </main>
  );
}

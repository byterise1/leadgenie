'use client';

import { useState, useEffect } from 'react';

const filters = ['All', 'Interested', 'Not Interested', 'Out of Office', 'Do Not Contact'];

type Thread = {
  id: string;
  subject: string;
  snippet: string;
  status: string;
  read: boolean;
  received_at: string;
  lead?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    company: string | null;
  };
};

export default function InboxPage() {
  const [filter, setFilter] = useState('All');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Thread | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/inbox?status=${encodeURIComponent(filter)}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setThreads(data); })
      .finally(() => setLoading(false));
  }, [filter]);

  const selectThread = async (thread: Thread) => {
    setSelected(thread);
    if (!thread.read) {
      await fetch('/api/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: thread.id, read: true }),
      });
      setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, read: true } : t));
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/inbox', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    setThreads(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    setSelected(prev => prev?.id === id ? { ...prev, status } : prev);
  };

  const unread = threads.filter(t => !t.read).length;

  return (
    <main className="flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Left panel */}
      <div className="w-80 shrink-0 border-r border-gray-100 flex flex-col bg-white">
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base font-bold text-gray-900">Unibox</h1>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span><span className="font-bold text-gray-700">{threads.length}</span> received</span>
              <span className="w-px h-3 bg-gray-200"/>
              <span><span className="font-bold text-gray-700">{unread}</span> unread</span>
            </div>
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
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">Loading…</div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center flex-1 h-full">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z"/></svg>
              </div>
              <p className="text-sm font-semibold text-gray-600 mb-1">No replies yet</p>
              <p className="text-xs text-gray-400 leading-relaxed">Replies from your campaigns will appear here.</p>
            </div>
          ) : threads.map(thread => (
            <button key={thread.id} onClick={() => selectThread(thread)}
              className={`w-full text-left px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 transition-colors ${selected?.id === thread.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className={`text-sm truncate ${!thread.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                  {thread.lead
                    ? [thread.lead.first_name, thread.lead.last_name].filter(Boolean).join(' ') || thread.lead.email
                    : '—'}
                </p>
                <p className="text-[10px] text-gray-400 shrink-0">{new Date(thread.received_at).toLocaleDateString()}</p>
              </div>
              <p className="text-xs text-gray-600 truncate">{thread.subject}</p>
              {thread.snippet && <p className="text-[10px] text-gray-400 truncate mt-0.5">{thread.snippet}</p>}
              {!thread.read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"/>}
            </button>
          ))}
        </div>
      </div>

      {/* Right panel */}
      {selected ? (
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">{selected.subject}</h2>
            <p className="text-xs text-gray-400 mt-1">
              From: {selected.lead?.email}
              {selected.lead?.company ? ` · ${selected.lead.company}` : ''}
              {' · '}{new Date(selected.received_at).toLocaleString()}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {selected.snippet || 'No message content.'}
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Mark as</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'interested', label: 'Interested' },
                { key: 'not_interested', label: 'Not Interested' },
                { key: 'out_of_office', label: 'Out of Office' },
                { key: 'do_not_contact', label: 'Do Not Contact' },
              ].map(s => (
                <button key={s.key} onClick={() => updateStatus(selected.id, s.key)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${selected.status === s.key ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 flex items-center justify-center mb-4 shadow-sm">
            <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z"/></svg>
          </div>
          <p className="text-sm font-semibold text-gray-700 mb-1">Select a conversation</p>
          <p className="text-xs text-gray-400 max-w-xs leading-relaxed">Choose a reply from the left panel to read and respond to it here.</p>
        </div>
      )}
    </main>
  );
}

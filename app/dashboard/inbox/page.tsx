'use client';

import { useState } from 'react';

const filters = ['All', 'Interested', 'Not Interested', 'Out of Office', 'Do Not Contact'];

export default function InboxPage() {
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <main className="flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Left panel */}
      <div className="w-80 shrink-0 border-r border-gray-100 flex flex-col bg-white">
        <div className="px-4 py-4 border-b border-gray-100">
          <h1 className="text-base font-bold text-gray-900 mb-3">Unibox</h1>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input placeholder="Search inbox..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 py-2 border-b border-gray-100 flex gap-1.5 overflow-x-auto">
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {f}
            </button>
          ))}
        </div>

        {/* Empty state */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z"/></svg>
          </div>
          <p className="text-sm font-semibold text-gray-600 mb-1">No replies yet</p>
          <p className="text-xs text-gray-400 leading-relaxed">Replies from your campaigns will appear here.</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 flex items-center justify-center mb-4 shadow-sm">
          <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z"/></svg>
        </div>
        <p className="text-sm font-semibold text-gray-700 mb-1">Select a conversation</p>
        <p className="text-xs text-gray-400 max-w-xs leading-relaxed">Choose a reply from the left panel to read and respond to it here.</p>
      </div>
    </main>
  );
}

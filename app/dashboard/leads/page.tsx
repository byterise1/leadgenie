'use client';

import { useState } from 'react';

const tabs = ['All Leads', 'Contacted', 'Replied', 'Unsubscribed'];

export default function LeadsPage() {
  const [tab, setTab] = useState('All Leads');

  return (
    <main className="flex-1 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage your prospect list.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            Import CSV
          </button>
          <button className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-blue-700 transition-colors shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            Add Lead
          </button>
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input placeholder="Search leads..." className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
        </div>
        <select className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 text-gray-600">
          <option>All Campaigns</option>
        </select>
        <select className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 text-gray-600">
          <option>All Status</option>
          <option>Not Contacted</option>
          <option>Contacted</option>
          <option>Replied</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="w-10 px-5 py-3"><input type="checkbox" className="rounded border-gray-300"/></th>
                {['Name', 'Email', 'Company', 'Title', 'Status', 'Campaign', 'Added'].map(col => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={8} className="px-5 py-20 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
                      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                    </div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">No leads yet</p>
                    <p className="text-xs text-gray-400 mb-5">Import a CSV file or add leads manually to get started.</p>
                    <button className="text-xs font-bold bg-blue-600 text-white rounded-xl px-5 py-2.5 hover:bg-blue-700 transition-colors">
                      Import CSV →
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

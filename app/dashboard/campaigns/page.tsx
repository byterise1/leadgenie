'use client';

import Link from 'next/link';
import { useState } from 'react';

const tabs = ['All', 'Active', 'Paused', 'Completed', 'Draft'];

export default function CampaignsPage() {
  const [tab, setTab] = useState('All');

  return (
    <main className="flex-1 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage all your cold email campaigns.</p>
        </div>
        <Link href="/dashboard/campaigns/new"
          className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-blue-700 transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          New Campaign
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Empty state */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Campaign Name', 'Status', 'Contacts', 'Sent', 'Opened', 'Replied', 'Reply Rate', 'Created'].map(col => (
                  <th key={col} className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={8} className="px-5 py-20 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
                      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    </div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">No campaigns yet</p>
                    <p className="text-xs text-gray-400 mb-5">Launch your first campaign to start booking meetings.</p>
                    <Link href="/dashboard/campaigns/new"
                      className="text-xs font-bold bg-blue-600 text-white rounded-xl px-5 py-2.5 hover:bg-blue-700 transition-colors">
                      Create Campaign →
                    </Link>
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

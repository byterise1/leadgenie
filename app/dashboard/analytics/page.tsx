'use client';

import { useState } from 'react';

const ranges = ['7 days', '30 days', '90 days', 'All time'];

const bars = [40, 65, 30, 80, 55, 90, 45, 70, 35, 85, 60, 75, 50, 95];

export default function AnalyticsPage() {
  const [range, setRange] = useState('30 days');

  return (
    <main className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track your campaign performance over time.</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {ranges.map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${range === r ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Emails Sent', value: '0', change: '—', up: true, color: 'blue' },
          { label: 'Open Rate', value: '—', change: '—', up: true, color: 'indigo' },
          { label: 'Reply Rate', value: '—', change: '—', up: true, color: 'emerald' },
          { label: 'Meetings Booked', value: '0', change: '—', up: true, color: 'violet' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-400 mb-3">{k.label}</p>
            <p className="text-2xl font-bold text-gray-900 mb-1">{k.value}</p>
            <p className="text-xs text-gray-400">No data yet</p>
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-gray-900">Open Rate Over Time</h3>
            <span className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-100">No data</span>
          </div>
          {/* Placeholder chart */}
          <div className="h-40 flex items-end gap-1.5">
            {bars.map((h, i) => (
              <div key={i} className="flex-1 rounded-t-md bg-blue-100" style={{ height: `${h * 0.4}%`, opacity: 0.4 }} />
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
              <span key={d} className="text-[10px] text-gray-300 font-medium">{d}</span>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-gray-900">Reply Rate Over Time</h3>
            <span className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-100">No data</span>
          </div>
          <div className="h-40 flex items-end gap-1.5">
            {bars.map((h, i) => (
              <div key={i} className="flex-1 rounded-t-md bg-emerald-100" style={{ height: `${h * 0.3}%`, opacity: 0.4 }} />
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
              <span key={d} className="text-[10px] text-gray-300 font-medium">{d}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Campaign table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Campaign Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Campaign', 'Sent', 'Opened', 'Open Rate', 'Replied', 'Reply Rate', 'Bounced'].map(col => (
                  <th key={col} className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={7} className="px-5 py-14 text-center text-sm text-gray-400">
                  No campaign data yet. Launch a campaign to see analytics.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

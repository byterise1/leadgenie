'use client';

import { useState } from 'react';
import Link from 'next/link';

const stats = [
  { label: 'Active Campaigns', value: '12', change: '+3 this week', up: true },
  { label: 'Emails Sent', value: '48,290', change: '+12% vs last month', up: true },
  { label: 'Reply Rate', value: '18.4%', change: '+2.1% vs last month', up: true },
  { label: 'Leads Found', value: '3,812', change: '+820 this week', up: true },
];

const campaigns = [
  { name: 'SaaS Founders Outreach', status: 'Active', sent: 2840, replies: 312, rate: '11.0%' },
  { name: 'E-commerce Decision Makers', status: 'Active', sent: 5120, replies: 987, rate: '19.3%' },
  { name: 'Agency Owners Q2', status: 'Paused', sent: 1200, replies: 143, rate: '11.9%' },
  { name: 'B2B Tech CTOs', status: 'Active', sent: 3400, replies: 680, rate: '20.0%' },
  { name: 'Legal Firms Cold Outreach', status: 'Active', sent: 890, replies: 134, rate: '15.1%' },
];

const navItems = [
  { icon: '📊', label: 'Dashboard', active: true },
  { icon: '📧', label: 'Campaigns', active: false },
  { icon: '👥', label: 'Leads', active: false },
  { icon: '🤖', label: 'AI Agents', active: false, badge: 'NEW' },
  { icon: '📥', label: 'Inbox', active: false },
  { icon: '⚙️', label: 'Automations', active: false, badge: 'NEW' },
  { icon: '📈', label: 'Analytics', active: false },
];

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col z-40 transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="px-5 py-4 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-gray-900">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold">
              ⚡
            </span>
            LeadGenie
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                item.active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="text-[10px] font-semibold bg-blue-100 text-blue-600 rounded-full px-1.5 py-0.5">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
              JS
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">John Smith</p>
              <p className="text-xs text-gray-400 truncate">Growth Plan</p>
            </div>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </div>
          <Link
            href="/"
            className="mt-2 flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 md:ml-64 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden h-9 w-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Dashboard</h1>
              <p className="text-xs text-gray-400">Welcome back, John</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="h-9 w-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors relative">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-blue-500 rounded-full border border-white" />
            </button>
            <button className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-blue-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Campaign
            </button>
          </div>
        </header>

        <main className="p-6 space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
                <p className="text-xs font-medium text-gray-500 mb-3">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mb-1.5">{stat.value}</p>
                <p className="text-xs font-medium text-green-600 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  {stat.change}
                </p>
              </div>
            ))}
          </div>

          {/* Campaign table + sidebar */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Table */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Recent Campaigns</h2>
                <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  View all →
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Campaign', 'Status', 'Sent', 'Reply Rate'].map((col) => (
                        <th
                          key={col}
                          className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {campaigns.map((c) => (
                      <tr key={c.name} className="hover:bg-gray-50 transition-colors cursor-pointer">
                        <td className="px-6 py-3.5 text-sm font-medium text-gray-900 max-w-[180px] truncate">
                          {c.name}
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                              c.status === 'Active'
                                ? 'bg-green-50 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                c.status === 'Active' ? 'bg-green-500' : 'bg-gray-400'
                              }`}
                            />
                            {c.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-sm text-gray-500">{c.sent.toLocaleString()}</td>
                        <td className="px-6 py-3.5 text-sm font-semibold text-blue-600">{c.rate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick actions */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-5 text-white">
                <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-3">AI Co-pilot</p>
                <p className="text-sm font-semibold mb-1">Start a new search</p>
                <p className="text-xs text-blue-200 mb-4">Find your next 1,000 leads using AI</p>
                <button className="w-full bg-white text-blue-700 text-sm font-semibold rounded-xl py-2.5 hover:bg-blue-50 transition-colors">
                  Find Leads →
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</p>
                <div className="space-y-2">
                  {[
                    { icon: '📧', label: 'New Campaign' },
                    { icon: '🤖', label: 'Create AI Agent' },
                    { icon: '📥', label: 'Check Inbox' },
                    { icon: '📊', label: 'View Reports' },
                  ].map((action) => (
                    <button
                      key={action.label}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors text-left"
                    >
                      <span>{action.icon}</span>
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

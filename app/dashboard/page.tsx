'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

const stats = [
  { label: 'Active Campaigns', value: '0', change: 'No campaigns yet', up: false },
  { label: 'Emails Sent', value: '0', change: 'Start your first campaign', up: false },
  { label: 'Reply Rate', value: '—', change: 'No data yet', up: false },
  { label: 'Leads Found', value: '0', change: 'Import or find leads', up: false },
];

const navItems = [
  { icon: '📊', label: 'Dashboard', href: '/dashboard', active: true },
  { icon: '📧', label: 'Campaigns', href: '/dashboard/campaigns', active: false },
  { icon: '👥', label: 'Leads', href: '/dashboard/leads', active: false },
  { icon: '📥', label: 'Inbox', href: '/dashboard/inbox', active: false },
  { icon: '📈', label: 'Analytics', href: '/dashboard/analytics', active: false },
  { icon: '⚙️', label: 'Email Accounts', href: '/dashboard/email-accounts', active: false },
  { icon: '🔧', label: 'Settings', href: '/dashboard/settings', active: false },
];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login');
      else setUser(data.user);
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = getInitials(displayName);
  const plan = 'Free Plan';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col z-40 transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="px-5 py-4 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-gray-900">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold">⚡</span>
            LeadGenie
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                item.active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
              <p className="text-xs text-gray-400 truncate">{plan}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="mt-2 w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 md:ml-64 min-w-0">
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
              <p className="text-xs text-gray-400">Welcome back, {displayName.split(' ')[0]}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/campaigns/new"
              className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Campaign
            </Link>
          </div>
        </header>

        <main className="p-6 space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
                <p className="text-xs font-medium text-gray-500 mb-3">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mb-1.5">{stat.value}</p>
                <p className="text-xs font-medium text-gray-400">{stat.change}</p>
              </div>
            ))}
          </div>

          {/* Empty state + quick actions */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Recent Campaigns</h2>
              </div>
              <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1">No campaigns yet</p>
                <p className="text-xs text-gray-400 mb-5">Create your first cold email campaign to start getting replies.</p>
                <Link
                  href="/dashboard/campaigns/new"
                  className="bg-blue-600 text-white text-xs font-semibold rounded-xl px-5 py-2.5 hover:bg-blue-700 transition-colors"
                >
                  Create Campaign →
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-5 text-white">
                <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-3">Get Started</p>
                <p className="text-sm font-semibold mb-1">Create your first campaign</p>
                <p className="text-xs text-blue-200 mb-4">Set up a 3-step email sequence in under 5 minutes</p>
                <Link
                  href="/dashboard/campaigns/new"
                  className="block w-full bg-white text-blue-700 text-sm font-semibold rounded-xl py-2.5 text-center hover:bg-blue-50 transition-colors"
                >
                  Start Now →
                </Link>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</p>
                <div className="space-y-1">
                  {[
                    { icon: '📧', label: 'New Campaign', href: '/dashboard/campaigns/new' },
                    { icon: '👥', label: 'Import Leads', href: '/dashboard/leads' },
                    { icon: '📥', label: 'Check Inbox', href: '/dashboard/inbox' },
                    { icon: '⚙️', label: 'Add Email Account', href: '/dashboard/email-accounts' },
                  ].map((action) => (
                    <Link
                      key={action.label}
                      href={action.href}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                    >
                      <span>{action.icon}</span>
                      {action.label}
                    </Link>
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

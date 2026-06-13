'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { NavigationProgress } from '@/components/NavigationProgress';
import { Logo } from '@/components/Logo';

type Notification = {
  id: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  link?: string;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [credits, setCredits] = useState(100);
  const [usedCredits, setUsedCredits] = useState(0);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCredits = () => {
      fetch('/api/billing/usage')
        .then(r => r.json())
        .then(data => {
          if (!data.error) {
            setCredits(data.credits_total ?? 100);
            setUsedCredits(data.credits_used ?? 0);
          }
        })
        .catch(() => {});
    };
    fetchCredits();
    const id = setInterval(fetchCredits, 30000);
    return () => clearInterval(id);
  }, []);

  const fetchNotifications = () => {
    fetch('/api/notifications?unread=1')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setNotifications(d); })
      .catch(() => {});
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Background inbox sync — runs every 2 minutes from any dashboard page
  useEffect(() => {
    const sync = () => fetch('/api/inbox/sync', { method: 'POST' }).catch(() => {});
    sync();
    const id = setInterval(sync, 120000);
    return () => clearInterval(id);
  }, []);

  // Auto-logout after 2 hours of inactivity
  const INACTIVITY_MS = 2 * 60 * 60 * 1000;
  const ACTIVITY_KEY = 'lg_last_activity';
  const updateActivity = useCallback(() => {
    localStorage.setItem(ACTIVITY_KEY, Date.now().toString());
  }, []);
  useEffect(() => {
    updateActivity();
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;
    events.forEach(e => window.addEventListener(e, updateActivity, { passive: true }));
    const check = setInterval(async () => {
      const last = Number(localStorage.getItem(ACTIVITY_KEY) || Date.now());
      if (Date.now() - last > INACTIVITY_MS) {
        const supabase = createClient();
        await supabase.auth.signOut();
        window.location.href = '/login?reason=idle';
      }
    }, 60000);
    return () => {
      events.forEach(e => window.removeEventListener(e, updateActivity));
      clearInterval(check);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateActivity]);

  const markAllRead = () => {
    fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).then(() => setNotifications([])).catch(() => {});
  };

  const dismissOne = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    }).catch(() => {});
  };

  const handleNotifClick = (n: Notification) => {
    dismissOne(n.id);
    setNotifOpen(false);
    if (n.link) router.push(n.link);
  };

  const openNotifications = () => {
    setNotifOpen(v => !v);
    // Do NOT auto-mark-read on open — user must click or dismiss
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <NavigationProgress />
      <DashboardSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 md:ml-[220px] min-w-0 flex flex-col">
        <header className="h-14 bg-white border-b border-gray-100 flex items-center px-4 gap-3 shrink-0 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <span className="md:hidden"><Logo size={32} textSize="text-[15px]" /></span>

          <div className="flex-1"/>

          <div className="flex items-center gap-2.5 border border-gray-200 rounded-xl px-3 py-1.5 bg-white">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="currentColor">
              <path d="M7 15.5c0 .049.006.096.007.145a7.3 7.3 0 1 1 8.638-8.638c-.049 0-.096-.007-.145-.007a8.557 8.557 0 0 0-.877.045 6.296 6.296 0 1 0-7.578 7.578A8.557 8.557 0 0 0 7 15.5zm.983-11.27l-.119-.992A5.3 5.3 0 0 0 3.2 8.558c.002.153.01.303.024.45l.995-.093a4.508 4.508 0 0 1-.019-.367A4.3 4.3 0 0 1 7.983 4.23zM22.8 15.5a7.3 7.3 0 1 1-7.3-7.3 7.308 7.308 0 0 1 7.3 7.3zm-1 0a6.3 6.3 0 1 0-6.3 6.3 6.307 6.307 0 0 0 6.3-6.3zm-10.58.415a4.508 4.508 0 0 1-.02-.367 4.3 4.3 0 0 1 3.783-4.318l-.119-.992a5.3 5.3 0 0 0-4.664 5.32c.002.153.01.303.024.45zm8.028-4.163l-.707.707a4.3 4.3 0 1 1-6.082 6.082l-.707.707a5.3 5.3 0 0 0 7.496-7.496z"/>
            </svg>
            <span className="text-xs font-bold text-gray-900">{credits - usedCredits}<span className="font-normal text-gray-400">/{credits}</span></span>
            <div className="w-px h-3.5 bg-gray-200"/>
            <Link href="/dashboard/billing" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors whitespace-nowrap">
              Upgrade
            </Link>
          </div>

          {/* Notification bell */}
          <div ref={notifRef} className="relative">
            <button onClick={openNotifications}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors relative"
              title="Notifications">
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
              {notifications.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">
                    Notifications {notifications.length > 0 && <span className="text-blue-600">({notifications.length})</span>}
                  </span>
                  <div className="flex items-center gap-2">
                    {notifications.length > 0 && (
                      <button onClick={markAllRead}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                        Mark all read
                      </button>
                    )}
                    <button onClick={() => setNotifOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors ml-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>

                {notifications.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                    </div>
                    <p className="text-sm font-semibold text-gray-500">All caught up</p>
                    <p className="text-xs text-gray-400 mt-0.5">No new notifications</p>
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                    {notifications.map(n => {
                      const dot = n.type === 'warning' ? 'bg-amber-400' : n.type === 'error' ? 'bg-red-500' : 'bg-blue-500';
                      return (
                        <div key={n.id}
                          className={`group flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${n.link ? 'cursor-pointer' : ''}`}
                          onClick={() => handleNotifClick(n)}>
                          <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${dot}`}/>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-800 leading-relaxed">{n.message}</p>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {new Date(n.created_at).toLocaleString()}
                            </p>
                            {n.link && (
                              <p className="text-[10px] text-blue-500 font-semibold mt-0.5">
                                {n.link.includes('inbox') ? 'View in Inbox →' : n.link.includes('leads') ? 'View Leads →' : n.link.includes('analytics') ? 'View Analytics →' : 'View →'}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); dismissOne(n.id); }}
                            className="opacity-0 group-hover:opacity-100 shrink-0 text-gray-300 hover:text-gray-600 transition-all mt-0.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <Link href="/dashboard/help" className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" title="Help">
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </Link>
        </header>

        {children}
      </div>
    </div>
  );
}

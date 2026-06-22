'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Logo } from '@/components/Logo';

const navSections = [
  {
    label: 'Overview',
    items: [
      {
        label: 'Dashboard', href: '/admin',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
      },
    ],
  },
  {
    label: 'Management',
    items: [
      {
        label: 'Users', href: '/admin/users',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
      },
      {
        label: 'Campaigns', href: '/admin/campaigns',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
      },
      {
        label: 'Warmup', href: '/admin/warmup',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"/><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"/></svg>,
      },
    ],
  },
  {
    label: 'Content',
    items: [
      {
        label: 'Templates', href: '/admin/templates',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
      },
      {
        label: 'Pricing Plans', href: '/admin/pricing',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
      },
    ],
  },
  {
    label: 'Finance & Support',
    items: [
      {
        label: 'Billing', href: '/admin/billing',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/></svg>,
      },
      {
        label: 'Support', href: '/admin/support',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/></svg>,
      },
    ],
  },
];

type Notif = { id: string; message: string; type: string; read: boolean; link: string; created_at?: string };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [supportBadge, setSupportBadge] = useState(0);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [showBell, setShowBell] = useState(false);

  useEffect(() => {
    const fetchUnread = () => {
      if (pathname.startsWith('/admin/support')) { setSupportBadge(0); return; }
      fetch('/api/admin/support?count=1')
        .then(r => r.json())
        .then(d => { if (typeof d.unread === 'number') setSupportBadge(d.unread); })
        .catch(() => {});
    };
    fetchUnread();
    const id = setInterval(fetchUnread, 30000);
    return () => clearInterval(id);
  }, [pathname]);

  const fetchNotifs = () => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setNotifs(d.filter((n: Notif) => !n.read)); })
      .catch(() => {});
  };

  // Refetch whenever admin navigates to a new page
  useEffect(() => { fetchNotifs(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchNotifs();
    const id = setInterval(fetchNotifs, 5000);

    // Realtime: instant push when a new notification is inserted for this admin user
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      if (!uid) return;
      channel = supabase
        .channel(`admin-notif-${uid}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` },
          () => fetchNotifs()
        )
        .subscribe();
    });

    return () => {
      clearInterval(id);
      if (channel) supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissNotif = async (n: Notif) => {
    setNotifs(prev => prev.filter(x => x.id !== n.id));
    setShowBell(false);
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [n.id] }),
    });
    if (n.link) window.location.href = n.link;
  };

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setSidebarOpen(false)}/>}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-[220px] bg-white border-r border-gray-100 flex flex-col z-40 transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="px-5 h-14 flex items-center border-b border-gray-100 shrink-0 gap-3">
          <Logo size={28} textSize="text-[14px]" />
          <span className="text-[10px] font-bold bg-red-500 text-white rounded px-1.5 py-0.5 leading-tight">ADMIN</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {navSections.map(section => (
            <div key={section.label}>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1.5">{section.label}</p>
              {section.items.map(item => (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}>
                  <span className={isActive(item.href) ? 'text-blue-600' : 'text-gray-400'}>{item.icon}</span>
                  {item.label}
                  {item.href === '/admin/support' && supportBadge > 0 && (
                    <span className="ml-auto min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                      {supportBadge > 9 ? '9+' : supportBadge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-gray-100 shrink-0 space-y-1">
          <Link href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            Back to Dashboard
          </Link>
          <button onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 md:ml-[220px] min-w-0 flex flex-col">
        <header className="h-14 bg-white border-b border-gray-100 flex items-center px-4 gap-3 shrink-0 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"/>
            <span className="text-sm font-bold text-gray-900">Admin Panel</span>
          </div>
          <div className="flex-1"/>

          {/* Notification bell */}
          <div className="relative">
            <button onClick={() => setShowBell(v => !v)}
              className="relative p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
              {notifs.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {notifs.length > 9 ? '9+' : notifs.length}
                </span>
              )}
            </button>

            {showBell && (
              <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-900">Notifications</p>
                  {notifs.length > 0 && (
                    <button onClick={async () => {
                      setNotifs([]);
                      setShowBell(false);
                      await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
                    }} className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                      Mark all read
                    </button>
                  )}
                </div>
                {notifs.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">No new notifications</div>
                ) : (
                  <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                    {notifs.map(n => {
                      const isSupport = n.link?.includes('/support');
                      const isCampaign = n.link?.includes('/campaigns');
                      const category = isSupport ? 'Support' : isCampaign ? 'Campaign' : 'Notice';
                      const categoryColor = isSupport ? 'bg-blue-100 text-blue-700' : isCampaign ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500';
                      const dot = isSupport ? 'bg-blue-500' : isCampaign ? 'bg-emerald-500' : 'bg-gray-400';
                      return (
                        <button key={n.id} onClick={() => dismissNotif(n)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start gap-2.5">
                            <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${dot}`}/>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${categoryColor}`}>{category}</span>
                                {n.created_at && (
                                  <span className="text-[10px] text-gray-400">{new Date(n.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                )}
                              </div>
                              <p className="text-xs font-semibold text-gray-800 leading-snug">{n.message}</p>
                              {n.link && (
                                <p className="text-[10px] text-blue-500 font-semibold mt-1">
                                  {isSupport ? 'Open ticket →' : isCampaign ? 'View campaign →' : 'View →'}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <Link href="/dashboard" className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
            User view
          </Link>
        </header>

        {children}
      </div>
    </div>
  );
}

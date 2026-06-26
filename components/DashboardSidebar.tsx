'use client';

import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

const navItems = [
  {
    label: 'Overview', href: '/dashboard',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  },
  {
    label: 'Campaigns', href: '/dashboard/campaigns',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
  },
  {
    label: 'Templates', href: '/dashboard/templates',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
  },
  {
    label: 'Leads', href: '/dashboard/leads',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  },
  {
    label: 'Unibox', href: '/dashboard/inbox',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z"/></svg>,
  },
  {
    label: 'Email Accounts', href: '/dashboard/email-accounts',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"/></svg>,
  },
  {
    label: 'Warmup', href: '/dashboard/warmup',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z"/></svg>,
  },
  {
    label: 'Analytics', href: '/dashboard/analytics',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>,
  },
  {
    label: 'Billing', href: '/dashboard/billing',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/></svg>,
  },
  {
    label: 'Support', href: '/dashboard/support',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  },
  {
    label: 'Settings', href: '/dashboard/settings',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  },
  {
    label: 'Help', href: '/dashboard/help',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"/></svg>,
  },
];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function DashboardSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [supportBadge, setSupportBadge] = useState(0);
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [creditsTotal, setCreditsTotal] = useState(100);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    fetch('/api/profile').then(r => r.json()).then(d => {
      if (d?.avatar_url) setAvatarUrl(d.avatar_url);
      if (d?.full_name) setUser(u => u ? { ...u, user_metadata: { ...u.user_metadata, full_name: d.full_name } } : u);
      if (d?.is_admin) setIsAdmin(true);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchUnread = () => {
      fetch('/api/inbox?status=All')
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setUnreadCount(data.filter((t: any) => !t.read).length); })
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    // Instantly decrement badge when inbox marks a thread as read
    const onRead = () => setUnreadCount(c => Math.max(0, c - 1));
    window.addEventListener('LeadsAdd:thread-read', onRead);
    return () => { clearInterval(interval); window.removeEventListener('LeadsAdd:thread-read', onRead); };
  }, []);

  useEffect(() => {
    const fetchSupport = () => {
      if (pathname.startsWith('/dashboard/support')) { setSupportBadge(0); return; }
      fetch('/api/support/tickets')
        .then(r => r.json())
        .then((data: { admin_reply: string | null; status: string; user_seen_at?: string | null }[]) => {
          if (Array.isArray(data)) {
            setSupportBadge(data.filter(t => t.admin_reply !== null && t.status !== 'closed' && !t.user_seen_at).length);
          }
        })
        .catch(() => {});
    };
    fetchSupport();
    const id = setInterval(fetchSupport, 60000);
    const onSeen = () => setSupportBadge(0);
    window.addEventListener('LeadsAdd:support-seen', onSeen);
    return () => { clearInterval(id); window.removeEventListener('LeadsAdd:support-seen', onSeen); };
  }, [pathname]);

  useEffect(() => {
    const fetchCredits = () => {
      fetch('/api/billing/usage')
        .then(r => r.json())
        .then(d => {
          if (!d.error) {
            setCreditsUsed(d.credits_used ?? 0);
            setCreditsTotal(d.credits_total ?? 100);
          }
        })
        .catch(() => {});
    };
    fetchCredits();
    const id = setInterval(fetchCredits, 30000);
    return () => clearInterval(id);
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const email = user?.email || '';
  const initials = getInitials(displayName);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={onClose} />}
      <aside className={`fixed left-0 top-0 h-full w-[220px] bg-white border-r border-gray-100 flex flex-col z-40 transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>

        <div className="px-5 h-14 flex items-center border-b border-gray-100 shrink-0">
          <Link href="/">
            <Logo size={34} textSize="text-[15px]" />
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">Main</p>
          {navItems.slice(0, 5).map(item => (
            <Link key={item.href} href={item.href} onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive(item.href)
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}>
              <span className={isActive(item.href) ? 'text-blue-600' : 'text-gray-400'}>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.label === 'Unibox' && unreadCount > 0 && (
                <span className="text-[10px] font-bold text-blue-600 tabular-nums">{unreadCount}</span>
              )}
            </Link>
          ))}

          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2 mt-5">Reports</p>
          {navItems.slice(5).map(item => (
            <Link key={item.href} href={item.href} onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive(item.href)
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}>
              <span className={isActive(item.href) ? 'text-blue-600' : 'text-gray-400'}>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.label === 'Support' && supportBadge > 0 && (
                <span className="text-[10px] font-bold text-blue-600 tabular-nums">{supportBadge}</span>
              )}
            </Link>
          ))}

          {isAdmin && (
            <>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2 mt-5">Admin</p>
              <Link href="/admin" onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  pathname.startsWith('/admin')
                    ? 'bg-red-50 text-red-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}>
                <span className={pathname.startsWith('/admin') ? 'text-red-600' : 'text-gray-400'}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                </span>
                <span className="flex-1">Admin Panel</span>
                <span className="text-[9px] font-bold bg-red-500 text-white rounded px-1">ADMIN</span>
              </Link>
            </>
          )}

          <div className="mt-6 mx-1 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 p-4 text-white">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold">Free Plan</p>
              <span className="text-[10px] font-bold text-blue-200">{Math.max(0, creditsTotal - creditsUsed)} left</span>
            </div>
            <div className="w-full h-1.5 bg-blue-800/50 rounded-full mb-1.5 overflow-hidden">
              <div className="h-full bg-white/80 rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.round((creditsUsed / creditsTotal) * 100))}%` }}/>
            </div>
            <p className="text-[10px] text-blue-200 mb-3">{creditsUsed} / {creditsTotal} emails sent</p>
            <Link href="/pricing" className="block text-center text-[11px] font-bold bg-white text-blue-700 rounded-lg py-1.5 hover:bg-blue-50 transition-colors">
              Upgrade →
            </Link>
          </div>
        </nav>

        <div className="px-3 py-3 border-t border-gray-100 shrink-0">
          <Link href="/dashboard/settings" onClick={onClose}
            className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover"/>
                : initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{displayName}</p>
              <p className="text-[10px] text-gray-400 truncate">{email}</p>
            </div>
            <svg className="w-3.5 h-3.5 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </Link>
          <button onClick={signOut}
            className="mt-1 w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

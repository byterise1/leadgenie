'use client';

import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

/* -- icon helpers ----------------------------------------------------------- */
const Ic = {
  Lightning: ({ c='w-4 h-4' }:{c?:string}) => (
    <svg className={c} viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
  ),
  Mail: ({ c='w-4 h-4' }:{c?:string}) => (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
    </svg>
  ),
  AtSign: ({ c='w-4 h-4' }:{c?:string}) => (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="4"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-3.92 7.94"/>
    </svg>
  ),
  Sun: ({ c='w-4 h-4' }:{c?:string}) => (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="4"/>
      <path strokeLinecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
  ),
  Layers: ({ c='w-4 h-4' }:{c?:string}) => (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
  ),
  Repeat: ({ c='w-4 h-4' }:{c?:string}) => (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3"/>
    </svg>
  ),
  BarChart: ({ c='w-4 h-4' }:{c?:string}) => (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
    </svg>
  ),
  Shield: ({ c='w-4 h-4' }:{c?:string}) => (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
    </svg>
  ),
  Sparkles: ({ c='w-4 h-4' }:{c?:string}) => (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"/>
    </svg>
  ),
  /* Use Case icons */
  Building: ({ c='w-4 h-4' }:{c?:string}) => (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 9h1m4 0h1M9 13h1m4 0h1M9 17h1m4 0h1"/>
    </svg>
  ),
  Briefcase: ({ c='w-4 h-4' }:{c?:string}) => (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
    </svg>
  ),
  Monitor: ({ c='w-4 h-4' }:{c?:string}) => (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
    </svg>
  ),
  Users: ({ c='w-4 h-4' }:{c?:string}) => (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
  ShoppingBag: ({ c='w-4 h-4' }:{c?:string}) => (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
    </svg>
  ),
  TrendingUp: ({ c='w-4 h-4' }:{c?:string}) => (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/>
    </svg>
  ),
  /* Resource icons */
  HelpCircle: ({ c='w-4 h-4' }:{c?:string}) => (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  ),
  BookOpen: ({ c='w-4 h-4' }:{c?:string}) => (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
    </svg>
  ),
  Template: ({ c='w-4 h-4' }:{c?:string}) => (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
    </svg>
  ),
  Tag: ({ c='w-4 h-4' }:{c?:string}) => (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
    </svg>
  ),
};

/* -- Nav data ---------------------------------------------------------------- */
const products = [
  {
    col: 'Cold Email',
    color: 'blue',
    items: [
      { label: 'Campaigns',           desc: 'Multi-step sequences at scale',       icon: <Ic.Mail />,    href: '/#campaigns',        },
      { label: 'Email Accounts',      desc: 'Connect unlimited Gmail & Outlook',   icon: <Ic.AtSign />,  href: '/#sending-accounts'  },
      { label: 'Email Warmup',        desc: 'Build sender reputation 24/7',        icon: <Ic.Sun />,     href: '/#warmup', badge:'NEW'},
      { label: 'Unibox',              desc: 'All replies in one smart inbox',      icon: <Ic.Layers />,  href: '/#unibox'            },
      { label: 'Follow-up Sequences', desc: 'Smart automated follow-up chains',    icon: <Ic.Repeat />,  href: '/#campaigns'         },
    ],
  },
  {
    col: 'Intelligence',
    color: 'indigo',
    items: [
      { label: 'Analytics',           desc: 'Real-time campaign performance',      icon: <Ic.BarChart />,  href: '/#analytics', badge:'NEW' },
      { label: 'Deliverability',      desc: 'Monitor inbox placement rates',       icon: <Ic.Shield />,    href: '/#warmup'                },
      { label: 'AI Workflows',        desc: 'Automate triggers & follow-ups',      icon: <Ic.Sparkles />,  href: '/#workflows'             },
    ],
  },
];

type UCItem = { label: string; desc: string; href: string; icon: React.ReactNode };
const useCases: UCItem[] = [
  { label: 'Agency',      icon: <Ic.Building />,     desc: 'Manage cold email for multiple clients',      href: '/use-cases/agency'      },
  { label: 'B2B Sales',   icon: <Ic.Briefcase />,    desc: 'Fill your pipeline with qualified meetings',  href: '/use-cases/b2b-sales'   },
  { label: 'SaaS',        icon: <Ic.Monitor />,      desc: 'Drive signups, demos and free trials',        href: '/use-cases/saas'        },
  { label: 'Recruitment', icon: <Ic.Users />,         desc: 'Reach passive candidates automatically',     href: '/use-cases/recruitment' },
  { label: 'E-commerce',  icon: <Ic.ShoppingBag />,  desc: 'Prospect wholesale & retail partners',       href: '/use-cases/ecommerce'   },
  { label: 'Consulting',  icon: <Ic.TrendingUp />,   desc: 'Book discovery calls with ideal clients',    href: '/use-cases/consulting'  },
];

type ResItem = { label: string; desc: string; href: string; icon: React.ReactNode };
const resources: ResItem[] = [
  { label: 'Help Center',     icon: <Ic.HelpCircle />, desc: 'Guides, tutorials & FAQs',            href: '/help'      },
  { label: 'Blog',            icon: <Ic.BookOpen />,   desc: 'Cold email tips and strategies',       href: '/blog'      },
  { label: 'Email Templates', icon: <Ic.Template />,   desc: 'Free high-converting templates',       href: '/templates' },
  { label: 'Plans & Pricing', icon: <Ic.Tag />,        desc: 'Simple pricing for every team size',   href: '/pricing'   },
];

type DropKey = 'products' | 'usecases' | 'resources' | null;

/* -- colour lookup ----------------------------------------------------------- */
const colColors: Record<string, string> = {
  blue:   'text-blue-600 bg-blue-50 group-hover:bg-blue-100 group-hover:text-blue-700',
  indigo: 'text-indigo-600 bg-indigo-50 group-hover:bg-indigo-100 group-hover:text-indigo-700',
};
const ucColors = ['bg-blue-50 text-blue-600','bg-indigo-50 text-indigo-600','bg-purple-50 text-purple-600',
                  'bg-green-50 text-green-600','bg-orange-50 text-orange-600','bg-pink-50 text-pink-600'];
const resColors = ['bg-sky-50 text-sky-600','bg-emerald-50 text-emerald-600',
                   'bg-violet-50 text-violet-600','bg-amber-50 text-amber-600'];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function Navbar() {
  const [mob, setMob] = useState(false);
  const [drop, setDrop] = useState<DropKey>(null);
  const [user, setUser] = useState<User | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setDrop(null); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
    router.refresh();
  };

  const close = () => { setDrop(null); setMob(false); };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
  const initials = displayName ? getInitials(displayName) : '?';

  return (
    <header ref={ref} className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="container flex items-center justify-between h-[64px]">

        {/* Logo */}
        <Link href="/" onClick={close} className="flex items-center gap-2 shrink-0">
          <Logo size={52} textSize="text-[22px]" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-semibold">
          {([['products','Products'],['usecases','Solutions'],['resources','Resources']] as [DropKey,string][]).map(([k,l]) => (
            <button key={k} onClick={() => setDrop(p => p===k ? null : k)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all duration-150
                ${drop===k ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
              {l}
              <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${drop===k ? 'rotate-180 text-blue-500' : 'text-gray-400'}`}
                fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
          ))}
          <Link href="/pricing" onClick={close}
            className="px-4 py-2.5 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all duration-150">
            Pricing
          </Link>
        </nav>

        {/* CTAs — auth-aware */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <Link href="/dashboard" onClick={close}
                className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                Dashboard
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">
                  {initials}
                </span>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={close}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                Login
              </Link>
              <Link href="/signup" onClick={close}
                className="px-5 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-full hover:bg-blue-700 active:scale-95 transition-all shadow-sm">
                Get Started Free
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setMob(v=>!v)} className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100" aria-label="menu">
          {mob
            ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
          }
        </button>
      </div>

      {/* -- Products dropdown -- */}
      {drop === 'products' && (
        <div className="absolute inset-x-0 top-[64px] bg-white border-b border-gray-100 shadow-2xl z-50">
          <div className="container py-8">
            <div className="grid grid-cols-[1fr_1fr_280px] gap-8">
              {products.map(col => (
                <div key={col.col}>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] mb-4">{col.col}</p>
                  <div className="space-y-1">
                    {col.items.map(item => (
                      <Link key={item.label} href={item.href} onClick={close}
                        className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 group transition-colors">
                        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${colColors[col.color]}`}>
                          {item.icon}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900 group-hover:text-gray-700">{item.label}</span>
                            {item.badge && <span className="text-[9px] font-black bg-blue-600 text-white rounded-full px-1.5 py-0.5">{item.badge}</span>}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              {/* Promo panel */}
              <div className="border-l border-gray-100 pl-8 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] mb-4">Get Started</p>
                  <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                    <div className="h-24 flex items-center justify-center bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700">
                      <Ic.Lightning c="w-12 h-12 text-white/90" />
                    </div>
                    <div className="p-4 bg-white">
                      <p className="text-sm font-bold text-gray-900">Start free today</p>
                      <p className="text-xs text-gray-400 mt-0.5 mb-3">No credit card — 5-min setup</p>
                      <Link href="/signup" onClick={close}
                        className="inline-flex items-center gap-1 text-xs font-bold bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 transition-colors">
                        Create Account ?
                      </Link>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 mt-4 leading-relaxed">
                  Join <strong className="text-gray-600">8,500+</strong> teams using Leads Genie to book more meetings.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -- Solutions (Use Cases) dropdown -- */}
      {drop === 'usecases' && (
        <div className="absolute inset-x-0 top-[64px] bg-white border-b border-gray-100 shadow-2xl z-50">
          <div className="container py-8">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 max-w-3xl">
              {useCases.map((item, idx) => (
                <Link key={item.label} href={item.href} onClick={close}
                  className="flex items-start gap-3 p-4 rounded-2xl hover:bg-gray-50 group transition-colors border border-transparent hover:border-gray-100">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors ${ucColors[idx % ucColors.length]}`}>
                    {item.icon}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{item.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-snug">{item.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* -- Resources dropdown -- */}
      {drop === 'resources' && (
        <div className="absolute inset-x-0 top-[64px] bg-white border-b border-gray-100 shadow-2xl z-50">
          <div className="container py-8">
            <div className="grid grid-cols-2 gap-3 max-w-xl">
              {resources.map((item, idx) => (
                <Link key={item.label} href={item.href} onClick={close}
                  className="flex items-start gap-3 p-4 rounded-2xl hover:bg-gray-50 group transition-colors border border-transparent hover:border-gray-100">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors ${resColors[idx % resColors.length]}`}>
                    {item.icon}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{item.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-snug">{item.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* -- Mobile menu -- */}
      {mob && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 max-h-[80vh] overflow-y-auto shadow-xl">
          {products.map(col => (
            <div key={col.col} className="mb-5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 px-2 mb-2">{col.col}</p>
              {col.items.map(item => (
                <Link key={item.label} href={item.href} onClick={close}
                  className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colColors[col.color]}`}>{item.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                    <p className="text-[11px] text-gray-400">{item.desc}</p>
                  </div>
                  {item.badge && <span className="ml-auto text-[9px] font-black bg-blue-100 text-blue-600 rounded-full px-1.5 py-0.5">{item.badge}</span>}
                </Link>
              ))}
            </div>
          ))}
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 px-2 mb-2">Solutions</p>
            {useCases.map((item, idx) => (
              <Link key={item.label} href={item.href} onClick={close}
                className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ucColors[idx % ucColors.length]}`}>{item.icon}</span>
                <p className="text-sm font-medium text-gray-700">{item.label}</p>
              </Link>
            ))}
          </div>
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 px-2 mb-2">Resources</p>
            {resources.map((item, idx) => (
              <Link key={item.label} href={item.href} onClick={close}
                className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${resColors[idx % resColors.length]}`}>{item.icon}</span>
                <p className="text-sm font-medium text-gray-700">{item.label}</p>
              </Link>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-4 flex flex-col gap-2">
            {user ? (
              <>
                <Link href="/dashboard" onClick={close} className="text-center py-3 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">Go to Dashboard</Link>
                <button onClick={handleSignOut} className="text-center py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors">Sign out</button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={close} className="text-center py-2.5 text-sm font-semibold text-gray-700 hover:text-gray-900">Login</Link>
                <Link href="/signup" onClick={close} className="text-center py-3 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">Get Started Free</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

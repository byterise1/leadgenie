'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';

/* ─── Icon set — simple, bold, readable at 16px ──────────────────────────── */
function IcLightning({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}
/* Campaigns — envelope */
function IcMail({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
/* Email Accounts — @ symbol (clear email identity) */
function IcAtSign({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-3.92 7.94" />
    </svg>
  );
}
/* Email Warmup — sun (warmth, heat) */
function IcSun({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}
/* Unibox — stacked layers (multiple accounts, unified) */
function IcLayers({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}
/* Follow-up Sequences — arrow loop */
function IcRepeat({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" />
    </svg>
  );
}
/* Analytics — bar chart */
function IcBarChart({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}
/* Deliverability — shield check */
function IcShield({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}
/* AI Workflows — sparkles */
function IcSparkles({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  );
}

/* ─── Types ───────────────────────────────────────────────────────────────── */
type NavItem = { label: string; icon: React.ReactNode; href: string; badge?: string };
type ProductCol = { col: string; items: NavItem[] };

const products: ProductCol[] = [
  {
    col: 'Outreach',
    items: [
      { label: 'Campaigns',           icon: <IcMail />,     href: '/#campaigns'        },
      { label: 'Email Accounts',      icon: <IcAtSign />,   href: '/#sending-accounts' },
      { label: 'Email Warmup',        icon: <IcSun />,      href: '/#warmup',  badge: 'NEW' },
      { label: 'Unibox',              icon: <IcLayers />,   href: '/#unibox'           },
      { label: 'Follow-up Sequences', icon: <IcRepeat />,   href: '/#campaigns'        },
    ],
  },
  {
    col: 'Analytics',
    items: [
      { label: 'Analytics & Tracking', icon: <IcBarChart />, href: '/#analytics', badge: 'NEW' },
      { label: 'Deliverability',        icon: <IcShield />,  href: '/#warmup'               },
      { label: 'AI Workflows',          icon: <IcSparkles />,href: '/#workflows'            },
    ],
  },
];

const useCases = [
  { label: 'Agency',      desc: 'Manage cold email for multiple clients',        href: '/use-cases/agency'      },
  { label: 'B2B Sales',   desc: 'Fill your pipeline with qualified meetings',     href: '/use-cases/b2b-sales'   },
  { label: 'SaaS',        desc: 'Drive signups and demos with targeted outreach', href: '/use-cases/saas'        },
  { label: 'Recruitment', desc: 'Reach passive candidates automatically',         href: '/use-cases/recruitment' },
  { label: 'E-commerce',  desc: 'Prospect wholesale and retail partners',         href: '/use-cases/ecommerce'   },
  { label: 'Consulting',  desc: 'Book discovery calls with your ideal clients',   href: '/use-cases/consulting'  },
];

const resources = [
  { label: 'Help Center',     desc: 'Setup guides, tutorials & FAQs',    href: '/help'      },
  { label: 'Blog',            desc: 'Cold email guides and strategies',   href: '/blog'      },
  { label: 'Email Templates', desc: 'Free library of proven templates',   href: '/templates' },
  { label: 'Pricing',         desc: 'Plans for every team size',          href: '/pricing'   },
];

type DropKey = 'products' | 'usecases' | 'resources' | null;

export function Navbar() {
  const [mob, setMob] = useState(false);
  const [drop, setDrop] = useState<DropKey>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setDrop(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const close = () => { setDrop(null); setMob(false); };

  return (
    <header ref={ref} className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
      <div className="container flex items-center justify-between h-[62px]">

        {/* Logo */}
        <Link href="/" onClick={close}
          className="flex items-center gap-2 font-extrabold text-[17px] text-gray-900 shrink-0 group">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white group-hover:bg-blue-700 transition-colors">
            <IcLightning c="w-3.5 h-3.5" />
          </span>
          LeadGenie
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5 text-sm font-semibold">
          {([['products', 'Products'], ['usecases', 'Use Cases'], ['resources', 'Resources']] as [DropKey, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setDrop(p => p === k ? null : k)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-colors
                ${drop === k ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}>
              {l}
              <svg className={`w-4 h-4 transition-transform duration-200 ${drop === k ? 'rotate-180 text-blue-500' : 'text-gray-400'}`}
                fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          ))}
          <Link href="/pricing" onClick={close}
            className="px-3.5 py-2 rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors">
            Pricing
          </Link>
        </nav>

        {/* CTAs */}
        <div className="hidden md:flex items-center gap-2">
          <Link href="/login" onClick={close}
            className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors">
            Login
          </Link>
          <Link href="/signup" onClick={close}
            className="px-4 py-2 text-sm font-semibold border border-gray-300 text-gray-900 rounded-full hover:bg-gray-50 transition-colors">
            Get Started
          </Link>
          <Link href="/signup" onClick={close}
            className="px-5 py-2 text-sm font-bold bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-sm">
            See Demo
          </Link>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setMob(v => !v)}
          className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100" aria-label="menu">
          {mob
            ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          }
        </button>
      </div>

      {/* ── Products dropdown ── */}
      {drop === 'products' && (
        <div className="absolute inset-x-0 top-[62px] bg-white border-b border-gray-200 shadow-xl z-50">
          <div className="container py-6">
            <div className="grid grid-cols-3 gap-6">
              {products.map(col => (
                <div key={col.col}>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-2">{col.col}</p>
                  {col.items.map(item => (
                    <Link key={item.label} href={item.href} onClick={close}
                      className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-blue-50 group transition-colors">
                      <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 group-hover:bg-blue-100 text-gray-500 group-hover:text-blue-600 transition-colors shrink-0">
                        {item.icon}
                      </span>
                      <span className="text-sm text-gray-700 group-hover:text-gray-900 font-semibold">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto text-[9px] font-black bg-blue-100 text-blue-600 rounded-full px-1.5 py-0.5 shrink-0">{item.badge}</span>
                      )}
                    </Link>
                  ))}
                </div>
              ))}
              {/* Promo card */}
              <div className="border-l border-gray-100 pl-6">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Get Started</p>
                <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 h-20 flex items-center justify-center">
                    <IcLightning c="w-10 h-10 text-white opacity-90" />
                  </div>
                  <div className="p-4 bg-white">
                    <p className="text-sm font-bold text-gray-900">Start for free today</p>
                    <p className="text-xs text-gray-500 mt-1 mb-3">No credit card required</p>
                    <Link href="/signup" onClick={close}
                      className="text-xs font-bold bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700 transition-colors inline-block">
                      Create Account →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Use Cases dropdown ── */}
      {drop === 'usecases' && (
        <div className="absolute inset-x-0 top-[62px] bg-white border-b border-gray-200 shadow-xl z-50">
          <div className="container py-5">
            <div className="grid grid-cols-3 gap-1 max-w-lg">
              {useCases.map(item => (
                <Link key={item.label} href={item.href} onClick={close}
                  className="rounded-xl px-4 py-3 hover:bg-blue-50 group transition-colors">
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{item.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Resources dropdown ── */}
      {drop === 'resources' && (
        <div className="absolute inset-x-0 top-[62px] bg-white border-b border-gray-200 shadow-xl z-50">
          <div className="container py-5">
            <div className="grid grid-cols-2 gap-1 max-w-xs">
              {resources.map(item => (
                <Link key={item.label} href={item.href} onClick={close}
                  className="rounded-xl px-4 py-3 hover:bg-blue-50 group transition-colors">
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{item.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile menu ── */}
      {mob && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 max-h-[80vh] overflow-y-auto">
          {products.map(col => (
            <div key={col.col} className="mb-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2 py-2">{col.col}</p>
              {col.items.map(item => (
                <Link key={item.label} href={item.href} onClick={close}
                  className="flex items-center gap-3 px-2 py-2.5 text-sm text-gray-700 hover:text-gray-900 rounded-xl hover:bg-gray-50 transition-colors">
                  <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 shrink-0">
                    {item.icon}
                  </span>
                  {item.label}
                  {item.badge && <span className="ml-auto text-[9px] font-black bg-blue-100 text-blue-600 rounded-full px-1.5 py-0.5">{item.badge}</span>}
                </Link>
              ))}
            </div>
          ))}
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2 py-2">Use Cases</p>
            {useCases.map(item => (
              <Link key={item.label} href={item.href} onClick={close}
                className="block px-2 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-xl hover:bg-gray-50">{item.label}</Link>
            ))}
          </div>
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2 py-2">Resources</p>
            {resources.map(item => (
              <Link key={item.label} href={item.href} onClick={close}
                className="block px-2 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-xl hover:bg-gray-50">{item.label}</Link>
            ))}
          </div>
          <Link href="/pricing" onClick={close} className="block px-2 py-2.5 text-sm font-semibold text-gray-700 mb-3 border-t border-gray-100 pt-3">Pricing</Link>
          <div className="border-t border-gray-100 pt-3 flex flex-col gap-2">
            <Link href="/login"  onClick={close} className="text-center text-sm font-semibold py-2.5 text-gray-700">Login</Link>
            <Link href="/signup" onClick={close} className="text-center text-sm font-bold border border-gray-300 text-gray-900 rounded-full py-2.5 hover:bg-gray-50">Get Started</Link>
            <Link href="/signup" onClick={close} className="text-center text-sm font-bold bg-blue-600 text-white rounded-full py-2.5 hover:bg-blue-700">See Demo</Link>
          </div>
        </div>
      )}
    </header>
  );
}

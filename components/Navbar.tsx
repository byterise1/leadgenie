'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';

/* ─── Inline SVG icons (no emoji) ─────────────────────────────────────── */
function IcLightning({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}
function IcMail({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
function IcServer({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM4 14a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" />
    </svg>
  );
}
function IcFire({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
    </svg>
  );
}
function IcInbox({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" />
    </svg>
  );
}
function IcRepeat({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}
function IcBarChart({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}
function IcShield({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}
function IcLink({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  );
}

/* ─── Types ──────────────────────────────────────────────────────────────── */
type NavItem = { label: string; icon: React.ReactNode; href: string; badge?: string };
type ProductCol = { col: string; items: NavItem[] };

const products: ProductCol[] = [
  {
    col: 'Outreach',
    items: [
      { label: 'Campaigns',            icon: <IcMail />,    href: '/#campaigns'        },
      { label: 'Email Accounts',       icon: <IcServer />,  href: '/#sending-accounts' },
      { label: 'Email Warmup',         icon: <IcFire />,    href: '/#warmup',  badge: 'NEW' },
      { label: 'Unibox',               icon: <IcInbox />,   href: '/#unibox'           },
      { label: 'Follow-up Sequences',  icon: <IcRepeat />,  href: '/#campaigns'        },
    ],
  },
  {
    col: 'Analytics',
    items: [
      { label: 'Analytics & Tracking', icon: <IcBarChart />, href: '/#analytics', badge: 'NEW' },
      { label: 'Deliverability',        icon: <IcShield />,  href: '/#warmup'               },
      { label: 'Integrations',          icon: <IcLink />,    href: '/#workflows'            },
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
          className="flex items-center gap-2 font-bold text-[17px] text-gray-900 shrink-0 group">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white group-hover:bg-blue-700 transition-colors">
            <IcLightning c="w-3.5 h-3.5" />
          </span>
          LeadGenie
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5 text-sm font-medium">
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

        {/* Right CTAs */}
        <div className="hidden md:flex items-center gap-2">
          <Link href="/login" onClick={close}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
            Login
          </Link>
          <Link href="/signup" onClick={close}
            className="px-4 py-2 text-sm font-semibold border border-gray-800 text-gray-900 rounded-full hover:bg-gray-50 transition-colors">
            Get Started
          </Link>
          <Link href="/signup" onClick={close}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-sm">
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
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-2">{col.col}</p>
                  {col.items.map(item => (
                    <Link key={item.label} href={item.href} onClick={close}
                      className="flex items-center gap-2.5 px-2 py-2.5 rounded-xl hover:bg-blue-50 group">
                      <span className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors shrink-0 flex items-center justify-center">
                        {item.icon}
                      </span>
                      <span className="text-sm text-gray-700 group-hover:text-gray-900 font-medium">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto text-[9px] font-bold bg-blue-100 text-blue-600 rounded-full px-1.5 py-0.5 shrink-0">{item.badge}</span>
                      )}
                    </Link>
                  ))}
                </div>
              ))}
              {/* Promo card */}
              <div className="border-l border-gray-100 pl-6">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Get Started</p>
                <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 h-20 flex items-center justify-center">
                    <IcLightning c="w-10 h-10 text-white opacity-90" />
                  </div>
                  <div className="p-4 bg-white">
                    <p className="text-sm font-bold text-gray-900">Start for free today</p>
                    <p className="text-xs text-gray-500 mt-1 mb-3">No credit card required</p>
                    <Link href="/signup" onClick={close}
                      className="text-xs font-semibold bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700 transition-colors inline-block">
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
                  className="rounded-xl px-4 py-3 hover:bg-blue-50 group">
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
                  className="rounded-xl px-4 py-3 hover:bg-blue-50 group">
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
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 px-2 py-2">{col.col}</p>
              {col.items.map(item => (
                <Link key={item.label} href={item.href} onClick={close}
                  className="flex items-center gap-2.5 px-2 py-2.5 text-sm text-gray-700 hover:text-gray-900 rounded-xl hover:bg-gray-50">
                  <span className="w-5 h-5 text-gray-400 shrink-0 flex items-center justify-center">{item.icon}</span>
                  {item.label}
                  {item.badge && <span className="ml-auto text-[9px] font-bold bg-blue-100 text-blue-600 rounded-full px-1.5 py-0.5">{item.badge}</span>}
                </Link>
              ))}
            </div>
          ))}
          <div className="mb-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 px-2 py-2">Use Cases</p>
            {useCases.map(item => (
              <Link key={item.label} href={item.href} onClick={close}
                className="block px-2 py-2.5 text-sm text-gray-700 hover:text-gray-900 rounded-xl hover:bg-gray-50">{item.label}</Link>
            ))}
          </div>
          <div className="mb-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 px-2 py-2">Resources</p>
            {resources.map(item => (
              <Link key={item.label} href={item.href} onClick={close}
                className="block px-2 py-2.5 text-sm text-gray-700 hover:text-gray-900 rounded-xl hover:bg-gray-50">{item.label}</Link>
            ))}
          </div>
          <Link href="/pricing" onClick={close} className="block px-2 py-2.5 text-sm font-medium text-gray-700 mb-3 border-t border-gray-100 pt-3">Pricing</Link>
          <div className="border-t border-gray-100 pt-3 flex flex-col gap-2">
            <Link href="/login"  onClick={close} className="text-center text-sm font-medium py-2.5 text-gray-700">Login</Link>
            <Link href="/signup" onClick={close} className="text-center text-sm font-semibold border border-gray-800 text-gray-900 rounded-full py-2.5 hover:bg-gray-50">Get Started</Link>
            <Link href="/signup" onClick={close} className="text-center text-sm font-semibold bg-blue-600 text-white rounded-full py-2.5 hover:bg-blue-700">See Demo</Link>
          </div>
        </div>
      )}
    </header>
  );
}

'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';

/* ─── All product links go to homepage sections via #anchor ─── */
const products = [
  {
    col: 'Outreach',
    items: [
      { label: 'Campaigns',          icon: '📧', href: '/#campaigns'       },
      { label: 'Email Accounts',     icon: '📨', href: '/#sending-accounts'},
      { label: 'Email Warmup',       icon: '🔥', href: '/#warmup',  badge: 'NEW' },
      { label: 'Unibox',             icon: '📥', href: '/#unibox'          },
      { label: 'Follow-up Sequences',icon: '🔄', href: '/#campaigns'       },
    ],
  },
  {
    col: 'Analytics',
    items: [
      { label: 'Analytics & Tracking', icon: '📊', href: '/#analytics',     badge: 'NEW' },
      { label: 'Deliverability',        icon: '🛡️', href: '/#warmup'         },
      { label: 'Integrations',          icon: '🔗', href: '/#integrations'  },
    ],
  },
];

const useCases = [
  { label: 'Agency',      desc: 'Manage cold email for multiple clients',     href: '/signup' },
  { label: 'B2B Sales',   desc: 'Fill your pipeline with qualified meetings',  href: '/signup' },
  { label: 'SaaS',        desc: 'Drive signups and demos with targeted outreach', href: '/signup' },
  { label: 'Recruitment', desc: 'Reach passive candidates automatically',      href: '/signup' },
  { label: 'E-commerce',  desc: 'Prospect wholesale and retail partners',      href: '/signup' },
  { label: 'Consulting',  desc: 'Book discovery calls with your ideal clients', href: '/signup' },
];

const resources = [
  { label: 'Help Center',    desc: 'Setup guides, tutorials & FAQs',      href: '/help'      },
  { label: 'Blog',           desc: 'Cold email guides and strategies',     href: '/blog'      },
  { label: 'Email Templates',desc: 'Free library of proven templates',     href: '/templates' },
  { label: 'Pricing',        desc: 'Plans for every team size',            href: '/pricing'   },
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
    <header ref={ref} className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="container flex items-center justify-between h-[60px]">

        {/* Logo */}
        <Link href="/" onClick={close}
          className="flex items-center gap-2 font-bold text-[17px] text-gray-900 shrink-0">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">⚡</span>
          LeadGenie
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5 text-sm font-medium">
          {([['products','Products'],['usecases','Use Cases'],['resources','Resources']] as [DropKey,string][]).map(([k,l]) => (
            <button key={k} onClick={() => setDrop(p => p===k ? null : k)}
              className={`flex items-center gap-1 px-3.5 py-2 rounded-lg transition-colors
                ${drop===k ? 'text-blue-600' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}>
              {l}
              <svg className={`w-3.5 h-3.5 transition-transform duration-150 ${drop===k?'rotate-180':''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
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
            className="px-4 py-2 text-sm font-semibold bg-gray-900 text-white rounded-full hover:bg-gray-700 transition-colors">
            See Demo
          </Link>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setMob(v=>!v)}
          className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100" aria-label="menu">
          {mob
            ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
          }
        </button>
      </div>

      {/* ── Products dropdown ── */}
      {drop === 'products' && (
        <div className="absolute inset-x-0 top-[60px] bg-white border-b border-gray-200 shadow-lg z-50">
          <div className="container py-6">
            <div className="grid grid-cols-3 gap-6">
              {products.map(col => (
                <div key={col.col}>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-2">{col.col}</p>
                  {col.items.map(item => (
                    <Link key={item.label} href={item.href} onClick={close}
                      className="flex items-center gap-2.5 px-2 py-2.5 rounded-xl hover:bg-gray-50 group">
                      <span className="text-base w-5 text-center shrink-0">{item.icon}</span>
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
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 h-20 flex items-center justify-center text-4xl">⚡</div>
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
        <div className="absolute inset-x-0 top-[60px] bg-white border-b border-gray-200 shadow-lg z-50">
          <div className="container py-5">
            <div className="grid grid-cols-3 gap-1 max-w-lg">
              {useCases.map(item => (
                <Link key={item.label} href={item.href} onClick={close}
                  className="rounded-xl px-4 py-3 hover:bg-gray-50 group">
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
        <div className="absolute inset-x-0 top-[60px] bg-white border-b border-gray-200 shadow-lg z-50">
          <div className="container py-5">
            <div className="grid grid-cols-2 gap-1 max-w-xs">
              {resources.map(item => (
                <Link key={item.label} href={item.href} onClick={close}
                  className="rounded-xl px-4 py-3 hover:bg-gray-50 group">
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
                  <span>{item.icon}</span>
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
            <Link href="/signup" onClick={close} className="text-center text-sm font-semibold bg-gray-900 text-white rounded-full py-2.5 hover:bg-gray-700">See Demo</Link>
          </div>
        </div>
      )}
    </header>
  );
}

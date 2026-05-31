'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';

const productsMenu = {
  col1: {
    heading: 'Outreach',
    items: [
      { label: 'Campaigns',          icon: '📧', desc: 'Build & launch cold email sequences', href: '#' },
      { label: 'Email Accounts',     icon: '📨', desc: 'Connect unlimited sending accounts',  href: '#' },
      { label: 'Email Warmup',       icon: '🔥', desc: 'AI-powered sender reputation warmup', href: '#', badge: 'NEW' },
      { label: 'Unibox',             icon: '📥', desc: 'All replies in one unified inbox',    href: '#' },
      { label: 'Follow-up Sequences',icon: '🔄', desc: 'Automated multi-step follow-ups',     href: '#' },
    ],
  },
  col2: {
    heading: 'Leads & Content',
    items: [
      { label: 'Lead Database',      icon: '🗄️', desc: '160M+ verified B2B contacts',        href: '#' },
      { label: 'Email Templates',    icon: '✉️', desc: 'High-converting template library',    href: '#' },
      { label: 'AI Personalization', icon: '🤖', desc: 'GPT-4 powered email writing',         href: '#', badge: 'NEW' },
      { label: 'Email Verification', icon: '✅', desc: 'Remove invalid emails before sending', href: '#' },
      { label: 'CRM',                icon: '👥', desc: 'Built-in pipeline & contact manager',  href: '#' },
    ],
  },
  col3: {
    heading: 'Deliverability',
    items: [
      { label: 'Analytics',          icon: '📊', desc: 'Opens, clicks, replies & revenue',    href: '#' },
      { label: 'Email Tracking',     icon: '👁️', desc: 'Real-time open & click tracking',     href: '#', badge: 'NEW' },
      { label: 'Inbox Placement',    icon: '🎯', desc: 'Test where your emails land',          href: '#' },
      { label: 'Deliverability Hub', icon: '🛡️', desc: 'DMARC, DKIM, SPF & reputation tools', href: '#' },
      { label: 'Automations',        icon: '⚙️', desc: 'Trigger-based campaign workflows',    href: '#', badge: 'NEW' },
    ],
  },
};

const useCasesMenu = [
  { label: 'Agency',      desc: 'Manage cold email for multiple clients at scale', href: '#' },
  { label: 'B2B Sales',   desc: 'Fill your pipeline with qualified meetings',      href: '#' },
  { label: 'SaaS',        desc: 'Drive signups and demos with targeted outreach',  href: '#' },
  { label: 'Recruitment', desc: 'Reach passive candidates automatically',           href: '#' },
  { label: 'E-commerce',  desc: 'Prospect wholesale buyers and retail partners',   href: '#' },
  { label: 'Consulting',  desc: 'Book discovery calls with your ideal clients',    href: '#' },
];

const resourcesMenu = [
  { label: 'Blog',                  desc: 'Cold email guides, tips & strategies',   href: '#' },
  { label: 'Help Center',           desc: 'Setup guides and tutorials',             href: '#' },
  { label: 'API Docs',              desc: 'Integrate LeadGenie into your stack',    href: '#' },
  { label: 'Community',             desc: 'Join 30k+ cold email practitioners',     href: '#' },
  { label: 'Email Templates',       desc: 'Free library of proven templates',       href: '#' },
  { label: 'Cold Email Benchmark',  desc: '2026 industry data & reply rate stats',  href: '#' },
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

  const toggle = (k: DropKey) => setDrop(p => p === k ? null : k);

  const Chevron = ({ open }: { open: boolean }) => (
    <svg className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );

  return (
    <header ref={ref} className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="container flex items-center justify-between h-[60px]">

        {/* Logo */}
        <Link href="/" onClick={() => setDrop(null)}
          className="flex items-center gap-2 font-bold text-[17px] text-gray-900 shrink-0">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">⚡</span>
          LeadGenie
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5 text-sm font-medium">
          {([['products','Products'],['usecases','Use Cases'],['resources','Resources']] as [DropKey,string][]).map(([k,l]) => (
            <button key={k} onClick={() => toggle(k)}
              className={`flex items-center gap-1 px-3.5 py-2 rounded-lg transition-colors
                ${drop===k ? 'text-blue-600' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}>
              {l} <Chevron open={drop===k} />
            </button>
          ))}
          <Link href="/pricing" onClick={() => setDrop(null)}
            className="px-3.5 py-2 rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors">
            Pricing
          </Link>
        </nav>

        {/* Right buttons */}
        <div className="hidden md:flex items-center gap-2">
          <Link href="/login" onClick={() => setDrop(null)}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
            Login
          </Link>
          <Link href="/signup" onClick={() => setDrop(null)}
            className="px-4 py-2 text-sm font-semibold border border-gray-900 text-gray-900 rounded-full hover:bg-gray-50 transition-colors">
            Get Started
          </Link>
          <Link href="/signup" onClick={() => setDrop(null)}
            className="px-4 py-2 text-sm font-semibold bg-gray-900 text-white rounded-full hover:bg-gray-700 transition-colors">
            See Demo
          </Link>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => { setMob(v => !v); setDrop(null); }}
          className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100" aria-label="menu">
          {mob
            ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
          }
        </button>
      </div>

      {/* ── Products mega-dropdown ── */}
      {drop === 'products' && (
        <div className="absolute inset-x-0 top-[60px] bg-white border-b border-gray-200 shadow-xl z-50">
          <div className="container py-7">
            <div className="grid grid-cols-4 gap-8">
              {Object.values(productsMenu).map((col) => (
                <div key={col.heading}>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-3">{col.heading}</p>
                  {col.items.map(item => (
                    <Link key={item.label} href={item.href} onClick={() => setDrop(null)}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 group">
                      <span className="text-base w-5 text-center mt-0.5 shrink-0">{item.icon}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-gray-800 group-hover:text-blue-600">{item.label}</span>
                          {item.badge && <span className="text-[9px] font-bold bg-blue-100 text-blue-600 rounded-full px-1.5 py-0.5">{item.badge}</span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 leading-snug">{item.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ))}
              {/* Promo */}
              <div className="border-l border-gray-100 pl-7">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Latest</p>
                <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 h-28 flex items-center justify-center text-4xl">📊</div>
                  <div className="p-4 bg-white">
                    <p className="text-sm font-bold text-gray-900 leading-snug">Cold Email Benchmark 2026</p>
                    <p className="text-xs text-gray-500 mt-1 mb-3">Industry open & reply rate data</p>
                    <button className="text-xs font-semibold border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">Read Report →</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Use Cases dropdown ── */}
      {drop === 'usecases' && (
        <div className="absolute inset-x-0 top-[60px] bg-white border-b border-gray-200 shadow-xl z-50">
          <div className="container py-6">
            <div className="grid grid-cols-3 gap-2 max-w-lg">
              {useCasesMenu.map(item => (
                <Link key={item.label} href={item.href} onClick={() => setDrop(null)}
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
        <div className="absolute inset-x-0 top-[60px] bg-white border-b border-gray-200 shadow-xl z-50">
          <div className="container py-6">
            <div className="grid grid-cols-3 gap-2 max-w-lg">
              {resourcesMenu.map(item => (
                <Link key={item.label} href={item.href} onClick={() => setDrop(null)}
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
          {[
            { label: 'Products',  items: [...productsMenu.col1.items,...productsMenu.col2.items,...productsMenu.col3.items] },
            { label: 'Use Cases', items: useCasesMenu.map(i => ({...i, icon:''})) },
            { label: 'Resources', items: resourcesMenu.map(i => ({...i, icon:''})) },
          ].map(section => (
            <div key={section.label} className="mb-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 px-3 py-2">{section.label}</p>
              {section.items.map((item: any) => (
                <Link key={item.label} href={item.href} onClick={() => setMob(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 rounded-xl hover:bg-gray-50">
                  {item.icon && <span>{item.icon}</span>}
                  {item.label}
                  {item.badge && <span className="ml-auto text-[9px] font-bold bg-blue-100 text-blue-600 rounded-full px-1.5 py-0.5">{item.badge}</span>}
                </Link>
              ))}
            </div>
          ))}
          <Link href="/pricing" onClick={() => setMob(false)} className="block px-3 py-2.5 text-sm font-medium text-gray-700 mb-3">Pricing</Link>
          <div className="border-t border-gray-100 pt-4 flex flex-col gap-2">
            <Link href="/login"   onClick={() => setMob(false)} className="text-center text-sm font-medium py-2.5 text-gray-700">Login</Link>
            <Link href="/signup"  onClick={() => setMob(false)} className="text-center text-sm font-semibold border border-gray-900 text-gray-900 rounded-full py-2.5">Get Started</Link>
            <Link href="/signup"  onClick={() => setMob(false)} className="text-center text-sm font-semibold bg-gray-900 text-white rounded-full py-2.5">See Demo</Link>
          </div>
        </div>
      )}
    </header>
  );
}

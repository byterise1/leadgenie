'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';

const productsMenu = {
  col1: [
    { label: 'Outreach',       icon: '📧', href: '#' },
    { label: 'Lead Database',  icon: '🗄️', href: '#' },
    { label: 'Deliverability', icon: '✅', href: '#' },
    { label: 'AI Sales Agent', icon: '🤖', href: '#', badge: 'New' },
    { label: 'AI Reply Agent', icon: '💬', href: '#', badge: 'New' },
  ],
  col2: [
    { label: 'CRM',              icon: '👥', href: '#' },
    { label: 'Website Visitors', icon: '🌐', href: '#' },
    { label: 'Email Accounts',   icon: '📨', href: '#' },
    { label: 'Automations',      icon: '⚙️', href: '#', badge: 'New' },
    { label: 'AiMod',            icon: '🛡️', href: '#', badge: 'New' },
  ],
  col3: [
    { label: 'Verification',    icon: '🔍', href: '#' },
    { label: 'Inbox Placement', icon: '📥', href: '#' },
    { label: 'Instantly AI',    icon: '⚡', href: '#' },
    { label: 'AI Agents',       icon: '🤖', href: '#', badge: 'New' },
  ],
};

const useCasesMenu = [
  { label: 'Agency',      desc: 'Scale client campaigns with AI outreach',      href: '#' },
  { label: 'B2B Sales',   desc: 'Drive pipeline with smart personalised email', href: '#' },
  { label: 'Recruitment', desc: 'Find and engage top talent automatically',      href: '#' },
  { label: 'SaaS',        desc: 'Grow your user base with targeted outreach',    href: '#' },
  { label: 'E-commerce',  desc: 'Reach buyers and recover carts at scale',       href: '#' },
  { label: 'Consulting',  desc: 'Fill your calendar with qualified leads',        href: '#' },
];

const resourcesMenu = [
  { label: 'Blog',                 desc: 'Tips, guides and best practices',   href: '#' },
  { label: 'Help Center',          desc: 'Documentation and tutorials',       href: '#' },
  { label: 'API Docs',             desc: 'Integrate with our full API',        href: '#' },
  { label: 'Community',            desc: 'Connect with 30k+ users',           href: '#' },
  { label: 'Changelog',            desc: 'See what we shipped this week',     href: '#' },
  { label: 'Cold Email Benchmark', desc: '2026 report — industry data',       href: '#' },
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

  const chevron = (open: boolean) => (
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
              {l} {chevron(drop===k)}
            </button>
          ))}
          <Link href="/pricing" onClick={() => setDrop(null)}
            className="px-3.5 py-2 rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors">
            Pricing
          </Link>
        </nav>

        {/* Right buttons — Login | Get Started (outlined) | See Demo (black) */}
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

      {/* ── Products mega dropdown ── */}
      {drop === 'products' && (
        <div className="absolute inset-x-0 top-[60px] bg-white border-b border-gray-200 shadow-lg z-50">
          <div className="container py-6">
            <div className="grid grid-cols-4 gap-6">
              {[productsMenu.col1, productsMenu.col2, productsMenu.col3].map((col, ci) => (
                <div key={ci}>
                  {col.map(item => (
                    <Link key={item.label} href={item.href} onClick={() => setDrop(null)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 group">
                      <span className="text-base w-5 text-center">{item.icon}</span>
                      <span className="text-sm text-gray-700 group-hover:text-gray-900 font-medium">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto text-[10px] font-bold bg-blue-100 text-blue-600 rounded-full px-2 py-0.5">{item.badge}</span>
                      )}
                    </Link>
                  ))}
                </div>
              ))}
              {/* Updates panel */}
              <div className="border-l border-gray-100 pl-6">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Updates</p>
                <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 h-24 flex items-center justify-center text-4xl">📊</div>
                  <div className="p-4 bg-white">
                    <p className="text-sm font-semibold text-gray-900 leading-snug">Cold Email Benchmark Report 2026</p>
                    <p className="text-xs text-gray-500 mt-1 mb-3">Explore the latest trends</p>
                    <button className="text-xs font-semibold border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">Read Report</button>
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
        <div className="absolute inset-x-0 top-[60px] bg-white border-b border-gray-200 shadow-lg z-50">
          <div className="container py-5">
            <div className="grid grid-cols-3 gap-1 max-w-lg">
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
            { label: 'Products', items: [...productsMenu.col1,...productsMenu.col2,...productsMenu.col3] },
            { label: 'Use Cases', items: useCasesMenu.map(i=>({...i,icon:''})) },
            { label: 'Resources', items: resourcesMenu.map(i=>({...i,icon:''})) },
          ].map(section => (
            <div key={section.label} className="mb-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 px-3 py-2">{section.label}</p>
              {section.items.map((item: any) => (
                <Link key={item.label} href={item.href} onClick={() => setMob(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 rounded-xl hover:bg-gray-50">
                  {item.icon && <span>{item.icon}</span>}
                  {item.label}
                  {item.badge && <span className="ml-auto text-[10px] font-bold bg-blue-100 text-blue-600 rounded-full px-2 py-0.5">{item.badge}</span>}
                </Link>
              ))}
            </div>
          ))}
          <Link href="/pricing" onClick={() => setMob(false)} className="block px-3 py-2.5 text-sm font-medium text-gray-700 mb-4">Pricing</Link>
          <div className="border-t border-gray-100 pt-4 flex flex-col gap-2">
            <Link href="/login" onClick={() => setMob(false)} className="text-center text-sm font-medium py-2.5 text-gray-700">Login</Link>
            <Link href="/signup" onClick={() => setMob(false)} className="text-center text-sm font-semibold border border-gray-900 text-gray-900 rounded-full py-2.5 hover:bg-gray-50">Get Started</Link>
            <Link href="/signup" onClick={() => setMob(false)} className="text-center text-sm font-semibold bg-gray-900 text-white rounded-full py-2.5">See Demo</Link>
          </div>
        </div>
      )}
    </header>
  );
}

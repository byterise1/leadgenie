'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';

const productsMenu = {
  col1: [
    { label: 'Outreach',       icon: '📧', href: '#' },
    { label: 'Lead Database',  icon: '🗄️', href: '#' },
    { label: 'Deliverability', icon: '✅', href: '#' },
    { label: 'AI Sales Agent', icon: '🤖', href: '#', badge: 'NEW' },
    { label: 'AI Reply Agent', icon: '💬', href: '#', badge: 'NEW' },
  ],
  col2: [
    { label: 'CRM',              icon: '👥', href: '#' },
    { label: 'Website Visitors', icon: '🌐', href: '#' },
    { label: 'Email Accounts',   icon: '📨', href: '#' },
    { label: 'Automations',      icon: '⚙️', href: '#', badge: 'NEW' },
    { label: 'AiMod',            icon: '🛡️', href: '#', badge: 'NEW' },
  ],
  col3: [
    { label: 'Verification',     icon: '🔍', href: '#' },
    { label: 'Inbox Placement',  icon: '📥', href: '#' },
    { label: 'LeadGenie AI',     icon: '⚡', href: '#' },
    { label: 'AI Agents',        icon: '🤖', href: '#', badge: 'NEW' },
  ],
};

const useCasesMenu = [
  { label: 'Agency',      desc: 'Scale client campaigns with AI outreach',        href: '#' },
  { label: 'B2B Sales',   desc: 'Drive pipeline with smart personalised email',   href: '#' },
  { label: 'Recruitment', desc: 'Find and engage top talent automatically',        href: '#' },
  { label: 'SaaS',        desc: 'Grow your user base with targeted outreach',      href: '#' },
  { label: 'E-commerce',  desc: 'Reach buyers and recover carts at scale',         href: '#' },
  { label: 'Consulting',  desc: 'Fill your calendar with qualified leads',          href: '#' },
];

const resourcesMenu = [
  { label: 'Blog',                  desc: 'Tips, guides and best practices',      href: '#' },
  { label: 'Help Center',           desc: 'Documentation and tutorials',          href: '#' },
  { label: 'API Docs',              desc: 'Integrate with our full API',           href: '#' },
  { label: 'Community',             desc: 'Connect with 30k+ users',              href: '#' },
  { label: 'Changelog',             desc: 'See what we shipped this week',        href: '#' },
  { label: 'Cold Email Benchmark',  desc: '2026 report — industry data',          href: '#' },
];

type DropdownKey = 'products' | 'usecases' | 'resources' | null;

export function Navbar() {
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<DropdownKey>(null);
  const navRef = useRef<HTMLDivElement>(null);

  /* close dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node))
        setActiveDropdown(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (k: DropdownKey) => setActiveDropdown(p => p === k ? null : k);

  return (
    <header
      ref={navRef}
      className="sticky top-0 z-50 bg-white border-b border-gray-100"
      style={{ boxShadow: '0 1px 0 0 rgba(0,0,0,0.06)' }}
    >
      <div className="container flex items-center justify-between h-[60px]">

        {/* ── Logo ── */}
        <Link href="/" onClick={() => setActiveDropdown(null)}
          className="flex items-center gap-2 font-bold text-[17px] text-gray-900 shrink-0">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white text-xs font-bold">⚡</span>
          LeadGenie
        </Link>

        {/* ── Desktop nav ── */}
        <nav className="hidden md:flex items-center gap-0.5 text-sm">
          {([ ['products','Products'], ['usecases','Use Cases'], ['resources','Resources'] ] as [DropdownKey,string][]).map(([key, label]) => (
            <button key={key} onClick={() => toggle(key)}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg font-medium transition-colors
                ${activeDropdown === key
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
              {label}
              <svg className={`w-3.5 h-3.5 transition-transform duration-150 ${activeDropdown===key?'rotate-180':''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
          ))}
          <Link href="/pricing" onClick={() => setActiveDropdown(null)}
            className="px-3 py-2 rounded-lg font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors">
            Pricing
          </Link>
        </nav>

        {/* ── Right CTAs ── */}
        <div className="hidden md:flex items-center gap-2">
          <Link href="/login" onClick={() => setActiveDropdown(null)}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
            Log in
          </Link>
          <Link href="/signup" onClick={() => setActiveDropdown(null)}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">
            Get Started Free
          </Link>
        </div>

        {/* ── Mobile burger ── */}
        <button type="button" onClick={() => { setMobileOpen(v=>!v); setActiveDropdown(null); }}
          className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Toggle menu">
          {mobileOpen
            ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
          }
        </button>
      </div>

      {/* ══ PRODUCTS DROPDOWN ══ */}
      {activeDropdown === 'products' && (
        <div className="absolute inset-x-0 top-[60px] z-50 bg-white border-b border-gray-200" style={{boxShadow:'0 8px 32px rgba(0,0,0,0.08)'}}>
          <div className="container py-7">
            <div className="grid grid-cols-4 gap-8">
              {[productsMenu.col1, productsMenu.col2, productsMenu.col3].map((col, ci) => (
                <div key={ci}>
                  {col.map(item => (
                    <Link key={item.label} href={item.href} onClick={() => setActiveDropdown(null)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-50 group">
                      <span className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm">{item.icon}</span>
                      <span className="text-sm text-gray-700 group-hover:text-gray-900 font-medium">{item.label}</span>
                      {item.badge && <span className="ml-auto text-[10px] font-bold bg-blue-100 text-blue-600 rounded-full px-2 py-0.5">{item.badge}</span>}
                    </Link>
                  ))}
                </div>
              ))}
              {/* Promo card */}
              <div className="border-l border-gray-100 pl-7">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Latest</p>
                <div className="rounded-2xl overflow-hidden border border-gray-100 card-shadow">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 h-28 flex items-center justify-center">
                    <span className="text-4xl">📊</span>
                  </div>
                  <div className="p-4 bg-white">
                    <p className="text-sm font-semibold text-gray-900">Cold Email Benchmark 2026</p>
                    <p className="text-xs text-gray-500 mt-1 mb-3">Industry data & trends</p>
                    <button className="text-xs font-semibold border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">Read Report →</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ USE CASES DROPDOWN ══ */}
      {activeDropdown === 'usecases' && (
        <div className="absolute inset-x-0 top-[60px] z-50 bg-white border-b border-gray-200" style={{boxShadow:'0 8px 32px rgba(0,0,0,0.08)'}}>
          <div className="container py-6">
            <div className="grid grid-cols-3 gap-2 max-w-xl">
              {useCasesMenu.map(item => (
                <Link key={item.label} href={item.href} onClick={() => setActiveDropdown(null)}
                  className="rounded-xl px-4 py-3 hover:bg-gray-50 group">
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{item.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ RESOURCES DROPDOWN ══ */}
      {activeDropdown === 'resources' && (
        <div className="absolute inset-x-0 top-[60px] z-50 bg-white border-b border-gray-200" style={{boxShadow:'0 8px 32px rgba(0,0,0,0.08)'}}>
          <div className="container py-6">
            <div className="grid grid-cols-3 gap-2 max-w-xl">
              {resourcesMenu.map(item => (
                <Link key={item.label} href={item.href} onClick={() => setActiveDropdown(null)}
                  className="rounded-xl px-4 py-3 hover:bg-gray-50 group">
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{item.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ MOBILE MENU ══ */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 max-h-[80vh] overflow-y-auto space-y-1">
          <Section label="Products">
            {[...productsMenu.col1,...productsMenu.col2,...productsMenu.col3].map(item => (
              <Link key={item.label} href={item.href} onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 rounded-xl hover:bg-gray-50">
                <span>{item.icon}</span>{item.label}
                {item.badge && <span className="ml-auto text-[10px] font-bold bg-blue-100 text-blue-600 rounded-full px-2 py-0.5">{item.badge}</span>}
              </Link>
            ))}
          </Section>
          <Section label="Use Cases">
            {useCasesMenu.map(item => (
              <Link key={item.label} href={item.href} onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 text-sm text-gray-700 hover:text-gray-900 rounded-xl hover:bg-gray-50">{item.label}</Link>
            ))}
          </Section>
          <Section label="Resources">
            {resourcesMenu.map(item => (
              <Link key={item.label} href={item.href} onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 text-sm text-gray-700 hover:text-gray-900 rounded-xl hover:bg-gray-50">{item.label}</Link>
            ))}
          </Section>
          <Link href="/pricing" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-gray-700">Pricing</Link>
          <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
            <Link href="/login" onClick={() => setMobileOpen(false)} className="text-center text-sm font-medium border border-gray-200 rounded-full py-2.5 hover:bg-gray-50">Log in</Link>
            <Link href="/signup" onClick={() => setMobileOpen(false)} className="text-center text-sm font-semibold bg-blue-600 text-white rounded-full py-2.5 hover:bg-blue-700">Get Started Free</Link>
          </div>
        </div>
      )}
    </header>
  );
}

/* tiny helper to avoid repetition */
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pb-3 border-b border-gray-100">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 px-3 py-2">{label}</p>
      {children}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';

const productsMenu = {
  col1: [
    { label: 'Outreach', icon: '📧', href: '#' },
    { label: 'Lead Database', icon: '🗄️', href: '#' },
    { label: 'Deliverability', icon: '✅', href: '#' },
    { label: 'AI Sales Agent', icon: '🤖', href: '#', badge: 'NEW' },
    { label: 'AI Reply Agent', icon: '💬', href: '#', badge: 'NEW' },
  ],
  col2: [
    { label: 'CRM', icon: '👥', href: '#' },
    { label: 'Website Visitors', icon: '🌐', href: '#' },
    { label: 'Email Accounts', icon: '📨', href: '#' },
    { label: 'Automations', icon: '⚙️', href: '#', badge: 'NEW' },
    { label: 'AiMod', icon: '🛡️', href: '#', badge: 'NEW' },
  ],
  col3: [
    { label: 'Verification', icon: '🔍', href: '#' },
    { label: 'Inbox Placement', icon: '📥', href: '#' },
    { label: 'LeadGenie AI', icon: '⚡', href: '#' },
    { label: 'AI Agents', icon: '🤖', href: '#', badge: 'NEW' },
  ],
};

const useCasesMenu = [
  { label: 'Agency', desc: 'Scale client campaigns with AI outreach', href: '#' },
  { label: 'B2B Sales', desc: 'Drive pipeline with smart personalised email', href: '#' },
  { label: 'Recruitment', desc: 'Find and engage top talent automatically', href: '#' },
  { label: 'SaaS', desc: 'Grow your user base with targeted outreach', href: '#' },
  { label: 'E-commerce', desc: 'Reach buyers and recover carts at scale', href: '#' },
  { label: 'Consulting', desc: 'Fill your calendar with qualified leads', href: '#' },
];

const resourcesMenu = [
  { label: 'Blog', desc: 'Tips, guides and best practices', href: '#' },
  { label: 'Help Center', desc: 'Documentation and tutorials', href: '#' },
  { label: 'API Docs', desc: 'Integrate with our full API', href: '#' },
  { label: 'Community', desc: 'Connect with 30k+ users', href: '#' },
  { label: 'Changelog', desc: 'See what we shipped this week', href: '#' },
  { label: 'Cold Email Benchmark', desc: '2026 report — industry data', href: '#' },
];

type DropdownKey = 'products' | 'usecases' | 'resources' | null;

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<DropdownKey>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggle = (key: DropdownKey) =>
    setActiveDropdown((prev) => (prev === key ? null : key));

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white" ref={navRef}>
      <div className="container flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-gray-900" onClick={() => setActiveDropdown(null)}>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold">⚡</span>
          LeadGenie
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {/* Products */}
          <button
            onClick={() => toggle('products')}
            className={`flex items-center gap-1 text-sm transition-colors ${activeDropdown === 'products' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Products
            <svg className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'products' ? 'rotate-180 text-blue-600' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Use Cases */}
          <button
            onClick={() => toggle('usecases')}
            className={`flex items-center gap-1 text-sm transition-colors ${activeDropdown === 'usecases' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Use Cases
            <svg className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'usecases' ? 'rotate-180 text-blue-600' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Resources */}
          <button
            onClick={() => toggle('resources')}
            className={`flex items-center gap-1 text-sm transition-colors ${activeDropdown === 'resources' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Resources
            <svg className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'resources' ? 'rotate-180 text-blue-600' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors" onClick={() => setActiveDropdown(null)}>
            Pricing
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm text-gray-700 hover:text-gray-900 px-2 py-1.5 transition-colors" onClick={() => setActiveDropdown(null)}>
            Login
          </Link>
          <Link href="/signup" className="text-sm font-medium border border-gray-800 rounded-full px-4 py-2 hover:bg-gray-50 transition-colors" onClick={() => setActiveDropdown(null)}>
            Get Started
          </Link>
          <Link href="/signup" className="text-sm font-medium bg-gray-900 text-white rounded-full px-4 py-2 hover:bg-gray-800 transition-colors" onClick={() => setActiveDropdown(null)}>
            See Demo
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => { setMobileOpen((v) => !v); setActiveDropdown(null); }}
          className="md:hidden text-gray-700 p-2 rounded-lg hover:bg-gray-100"
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* ── PRODUCTS MEGA DROPDOWN ── */}
      {activeDropdown === 'products' && (
        <div className="absolute left-0 right-0 top-16 z-50 border-b border-gray-200 bg-white shadow-lg">
          <div className="container py-6">
            <div className="grid grid-cols-4 gap-8">
              {/* Col 1 */}
              <div>
                {productsMenu.col1.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-50 group"
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">{item.badge}</span>
                    )}
                  </Link>
                ))}
              </div>
              {/* Col 2 */}
              <div>
                {productsMenu.col2.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-50 group"
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">{item.badge}</span>
                    )}
                  </Link>
                ))}
              </div>
              {/* Col 3 */}
              <div>
                {productsMenu.col3.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-50 group"
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">{item.badge}</span>
                    )}
                  </Link>
                ))}
              </div>
              {/* Updates panel */}
              <div className="border-l border-gray-100 pl-6">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Updates</p>
                <div className="rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-700 h-24 flex items-center justify-center">
                    <div className="bg-white/20 rounded-xl p-3 text-white text-2xl">📊</div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-semibold text-gray-900 leading-snug">Cold Email Benchmark Report 2026</p>
                    <p className="text-xs text-gray-500 mt-1">Explore the latest trends</p>
                    <button className="mt-3 text-xs font-semibold border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">
                      Read Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── USE CASES DROPDOWN ── */}
      {activeDropdown === 'usecases' && (
        <div className="absolute left-0 right-0 top-16 z-50 border-b border-gray-200 bg-white shadow-lg">
          <div className="container py-6">
            <div className="grid grid-cols-3 gap-3 max-w-2xl">
              {useCasesMenu.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setActiveDropdown(null)}
                  className="rounded-xl px-4 py-3 hover:bg-gray-50 group"
                >
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{item.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── RESOURCES DROPDOWN ── */}
      {activeDropdown === 'resources' && (
        <div className="absolute left-0 right-0 top-16 z-50 border-b border-gray-200 bg-white shadow-lg">
          <div className="container py-6">
            <div className="grid grid-cols-3 gap-3 max-w-2xl">
              {resourcesMenu.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setActiveDropdown(null)}
                  className="rounded-xl px-4 py-3 hover:bg-gray-50 group"
                >
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{item.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE MENU ── */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-5 py-4 space-y-1 max-h-[80vh] overflow-y-auto">
          <div className="pb-3 border-b border-gray-100 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 px-3 py-2">Products</p>
            {[...productsMenu.col1, ...productsMenu.col2, ...productsMenu.col3].map((item) => (
              <Link key={item.label} href={item.href} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 rounded-xl hover:bg-gray-50">
                <span>{item.icon}</span>{item.label}
                {item.badge && <span className="ml-auto text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">{item.badge}</span>}
              </Link>
            ))}
          </div>
          <div className="py-3 border-b border-gray-100 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 px-3 py-2">Use Cases</p>
            {useCasesMenu.map((item) => (
              <Link key={item.label} href={item.href} onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-gray-700 hover:text-gray-900 rounded-xl hover:bg-gray-50">{item.label}</Link>
            ))}
          </div>
          <div className="py-3 border-b border-gray-100 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 px-3 py-2">Resources</p>
            {resourcesMenu.map((item) => (
              <Link key={item.label} href={item.href} onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-gray-700 hover:text-gray-900 rounded-xl hover:bg-gray-50">{item.label}</Link>
            ))}
          </div>
          <Link href="/pricing" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 text-sm text-gray-700 hover:text-gray-900">Pricing</Link>
          <div className="pt-3 flex flex-col gap-2">
            <Link href="/login" onClick={() => setMobileOpen(false)} className="text-center text-sm font-medium border border-gray-800 rounded-full px-4 py-2.5 hover:bg-gray-50">Login</Link>
            <Link href="/signup" onClick={() => setMobileOpen(false)} className="text-center text-sm font-medium bg-gray-900 text-white rounded-full px-4 py-2.5 hover:bg-gray-800">Get Started Free</Link>
          </div>
        </div>
      )}
    </header>
  );
}

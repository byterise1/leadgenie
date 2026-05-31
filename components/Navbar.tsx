'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';

/* ─── Menu data ─── */
const products = [
  {
    col: 'Outreach',
    items: [
      { label: 'Campaigns',           icon: '📧', href: '/campaigns'  },
      { label: 'Email Accounts',      icon: '📨', href: '/accounts'   },
      { label: 'Email Warmup',        icon: '🔥', href: '/warmup',    badge: 'NEW' },
      { label: 'Unibox',              icon: '📥', href: '/unibox'     },
      { label: 'Follow-up Sequences', icon: '🔄', href: '/sequences'  },
    ],
  },
  {
    col: 'Leads & AI',
    items: [
      { label: 'Lead Database',       icon: '🗄️', href: '/leads'       },
      { label: 'AI Personalization',  icon: '🤖', href: '/ai',         badge: 'NEW' },
      { label: 'Email Verification',  icon: '✅', href: '/verification' },
      { label: 'CRM',                 icon: '👥', href: '/crm'          },
      { label: 'Automations',         icon: '⚙️', href: '/automations', badge: 'NEW' },
    ],
  },
  {
    col: 'Analytics',
    items: [
      { label: 'Analytics',           icon: '📊', href: '/analytics'     },
      { label: 'Email Tracking',      icon: '👁️', href: '/tracking',     badge: 'NEW' },
      { label: 'Inbox Placement',     icon: '🎯', href: '/placement'     },
      { label: 'Deliverability Hub',  icon: '🛡️', href: '/deliverability' },
      { label: 'API',                 icon: '🔗', href: '/api'            },
    ],
  },
];

const useCases = [
  { label: 'Agency',      desc: 'Manage cold email for multiple clients',    href: '/use-cases/agency'      },
  { label: 'B2B Sales',   desc: 'Fill your pipeline with qualified meetings', href: '/use-cases/b2b-sales'   },
  { label: 'SaaS',        desc: 'Drive signups and demos at scale',           href: '/use-cases/saas'        },
  { label: 'Recruitment', desc: 'Reach passive candidates automatically',     href: '/use-cases/recruitment' },
  { label: 'E-commerce',  desc: 'Prospect wholesale and retail partners',     href: '/use-cases/ecommerce'   },
  { label: 'Consulting',  desc: 'Book discovery calls on autopilot',          href: '/use-cases/consulting'  },
];

const resources = [
  { label: 'Blog',                 desc: 'Cold email guides and strategies',   href: '/blog'            },
  { label: 'Help Center',          desc: 'Setup guides and tutorials',         href: '/help'            },
  { label: 'API Docs',             desc: 'Integrate LeadGenie into your stack', href: '/api-docs'       },
  { label: 'Community',            desc: 'Join 30,000+ practitioners',         href: '/community'       },
  { label: 'Email Templates',      desc: 'Free library of proven templates',   href: '/templates'       },
  { label: 'Cold Email Benchmark', desc: '2026 open & reply rate report',      href: '/benchmark'       },
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
              {l}
              <svg className={`w-3.5 h-3.5 transition-transform duration-150 ${drop===k?'rotate-180':''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
              </svg>
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
            className="px-4 py-2 text-sm font-semibold border border-gray-800 text-gray-900 rounded-full hover:bg-gray-50 transition-colors">
            Get Started
          </Link>
          <Link href="/signup" onClick={() => setDrop(null)}
            className="px-4 py-2 text-sm font-semibold bg-gray-900 text-white rounded-full hover:bg-gray-700 transition-colors">
            See Demo
          </Link>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => { setMob(v=>!v); setDrop(null); }}
          className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100" aria-label="menu">
          {mob
            ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
          }
        </button>
      </div>

      {/* ── Products mega-dropdown ── */}
      {drop === 'products' && (
        <div className="absolute inset-x-0 top-[60px] bg-white border-b border-gray-200 shadow-lg z-50">
          <div className="container py-6">
            <div className="grid grid-cols-4 gap-6">
              {products.map(col => (
                <div key={col.col}>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-2">{col.col}</p>
                  {col.items.map(item => (
                    <Link key={item.label} href={item.href} onClick={() => setDrop(null)}
                      className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-gray-50 group">
                      <span className="text-sm w-4 text-center shrink-0">{item.icon}</span>
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
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Latest</p>
                <div className="rounded-2xl overflow-hidden border border-gray-100">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 h-24 flex items-center justify-center text-3xl">📊</div>
                  <div className="p-4 bg-white">
                    <p className="text-sm font-bold text-gray-900 leading-snug">Cold Email Benchmark 2026</p>
                    <p className="text-xs text-gray-500 mt-1 mb-3">Open & reply rate industry data</p>
                    <Link href="/benchmark" onClick={() => setDrop(null)}
                      className="text-xs font-semibold border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors inline-block">
                      Read Report →
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
              {resources.map(item => (
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
          {products.map(col => (
            <div key={col.col} className="mb-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 px-2 py-2">{col.col}</p>
              {col.items.map(item => (
                <Link key={item.label} href={item.href} onClick={() => setMob(false)}
                  className="flex items-center gap-2.5 px-2 py-2 text-sm text-gray-700 hover:text-gray-900 rounded-xl hover:bg-gray-50">
                  <span className="text-sm">{item.icon}</span>
                  {item.label}
                  {item.badge && <span className="ml-auto text-[9px] font-bold bg-blue-100 text-blue-600 rounded-full px-1.5 py-0.5">{item.badge}</span>}
                </Link>
              ))}
            </div>
          ))}
          <div className="mb-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 px-2 py-2">Use Cases</p>
            {useCases.map(item => (
              <Link key={item.label} href={item.href} onClick={() => setMob(false)}
                className="block px-2 py-2 text-sm text-gray-700 hover:text-gray-900 rounded-xl hover:bg-gray-50">{item.label}</Link>
            ))}
          </div>
          <div className="mb-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 px-2 py-2">Resources</p>
            {resources.map(item => (
              <Link key={item.label} href={item.href} onClick={() => setMob(false)}
                className="block px-2 py-2 text-sm text-gray-700 hover:text-gray-900 rounded-xl hover:bg-gray-50">{item.label}</Link>
            ))}
          </div>
          <Link href="/pricing" onClick={() => setMob(false)} className="block px-2 py-2.5 text-sm font-medium text-gray-700 mb-3">Pricing</Link>
          <div className="border-t border-gray-100 pt-4 flex flex-col gap-2">
            <Link href="/login"  onClick={() => setMob(false)} className="text-center text-sm font-medium py-2.5 text-gray-700">Login</Link>
            <Link href="/signup" onClick={() => setMob(false)} className="text-center text-sm font-semibold border border-gray-800 text-gray-900 rounded-full py-2.5">Get Started</Link>
            <Link href="/signup" onClick={() => setMob(false)} className="text-center text-sm font-semibold bg-gray-900 text-white rounded-full py-2.5">See Demo</Link>
          </div>
        </div>
      )}
    </header>
  );
}

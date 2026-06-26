'use client';

import Link from 'next/link';
import { Logo } from '@/components/Logo';

function IcLightning() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  );
}

const product = [
  { label: 'Campaigns',      href: '/#campaigns'        },
  { label: 'Email Accounts', href: '/#sending-accounts' },
  { label: 'Email Warmup',   href: '/#warmup'           },
  { label: 'Unibox',         href: '/#unibox'           },
  { label: 'Analytics',      href: '/#analytics'        },
  { label: 'AI Workflows',   href: '/#workflows'        },
  { label: 'Pricing',        href: '/pricing'           },
];

const solutions = [
  { label: 'Agency',      href: '/use-cases/agency'      },
  { label: 'B2B Sales',   href: '/use-cases/b2b-sales'   },
  { label: 'SaaS',        href: '/use-cases/saas'        },
  { label: 'Recruitment', href: '/use-cases/recruitment' },
  { label: 'E-commerce',  href: '/use-cases/ecommerce'   },
  { label: 'Consulting',  href: '/use-cases/consulting'  },
];

const resources = [
  { label: 'Help Center',     href: '/help'      },
  { label: 'Blog',            href: '/blog'      },
  { label: 'Email Templates', href: '/templates' },
];

const company = [
  { label: 'About Us',  href: '/about'   },
  { label: 'Contact',   href: '/contact' },
  { label: 'Login',     href: '/login'   },
  { label: 'Sign Up',   href: '/signup'  },
];

const legal = [
  { label: 'Privacy Policy',   href: '/privacy'   },
  { label: 'Terms of Service', href: '/terms'     },
  { label: 'Cookie Policy',    href: '/cookies'   },
  { label: 'GDPR',             href: '/gdpr'      },
  { label: 'Anti-Spam',        href: '/anti-spam' },
];

const socials = [
  {
    label: 'X / Twitter', href: '#',
    path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z',
    hoverColor: 'hover:text-gray-900 hover:border-gray-300',
  },
  {
    label: 'LinkedIn', href: '#',
    path: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z',
    hoverColor: 'hover:text-blue-600 hover:border-blue-200',
  },
];

function FooterCol({ heading, links }: { heading: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h3 className="text-xs font-black uppercase tracking-[0.16em] text-gray-900 mb-5">{heading}</h3>
      <ul className="space-y-3">
        {links.map(item => (
          <li key={item.label}>
            <Link href={item.href}
              className="group flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors duration-150">
              <span className="w-0 group-hover:w-3 overflow-hidden transition-all duration-200 text-blue-400">�</span>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="bg-gray-950 text-white">
      {/* Top gradient accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-60" />

      <div className="container pt-16 pb-10">

        {/* Main grid */}
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.8fr_1fr_1fr_1fr_1fr] mb-14">

          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-flex mb-4">
              <Logo size={42} textSize="text-xl" textColor="text-white" />
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xs mb-6">
              The cold email outreach platform built for modern sales teams. Send smarter,
              land in more inboxes, and book more meetings � on autopilot.
            </p>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { v: '8,500+', l: 'Teams' },
                { v: '42M+',   l: 'Emails' },
                { v: '4.9?',   l: 'G2 Score' },
              ].map(s => (
                <div key={s.l} className="bg-gray-900 rounded-xl p-3 text-center border border-gray-800">
                  <p className="text-sm font-extrabold text-white">{s.v}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 font-medium">{s.l}</p>
                </div>
              ))}
            </div>

            {/* Social links */}
            <div className="flex items-center gap-2.5">
              {socials.map(s => (
                <Link key={s.label} href={s.href}
                  className={`w-9 h-9 rounded-lg border border-gray-800 flex items-center justify-center text-gray-500 transition-all duration-200 hover:scale-110 ${s.hoverColor}`}>
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d={s.path}/>
                  </svg>
                </Link>
              ))}
            </div>
          </div>

          {/* Columns */}
          <div className="dark-footer">
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-gray-400 mb-5">Product</h3>
            <ul className="space-y-3">
              {product.map(item => (
                <li key={item.label}>
                  <Link href={item.href}
                    className="group flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors duration-150">
                    <span className="w-0 group-hover:w-3 overflow-hidden transition-all duration-200 text-blue-400 shrink-0">�</span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-gray-400 mb-5">Solutions</h3>
            <ul className="space-y-3">
              {solutions.map(item => (
                <li key={item.label}>
                  <Link href={item.href}
                    className="group flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors duration-150">
                    <span className="w-0 group-hover:w-3 overflow-hidden transition-all duration-200 text-blue-400 shrink-0">�</span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-gray-400 mb-5">Resources</h3>
            <ul className="space-y-3">
              {resources.map(item => (
                <li key={item.label}>
                  <Link href={item.href}
                    className="group flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors duration-150">
                    <span className="w-0 group-hover:w-3 overflow-hidden transition-all duration-200 text-blue-400 shrink-0">�</span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-gray-400 mb-5">Company</h3>
            <ul className="space-y-3">
              {company.map(item => (
                <li key={item.label}>
                  <Link href={item.href}
                    className="group flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors duration-150">
                    <span className="w-0 group-hover:w-3 overflow-hidden transition-all duration-200 text-blue-400 shrink-0">�</span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600 order-2 sm:order-1">
            � 2026 Leads Genie, Inc. All rights reserved. Built for cold email professionals.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 order-1 sm:order-2">
            {legal.map((item, i) => (
              <span key={item.label} className="flex items-center gap-4">
                <Link href={item.href}
                  className="text-xs text-gray-600 hover:text-gray-300 transition-colors duration-150">
                  {item.label}
                </Link>
                {i < legal.length - 1 && <span className="text-gray-800 text-xs">�</span>}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

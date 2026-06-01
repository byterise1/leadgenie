'use client';

import Link from 'next/link';

const cols = [
  {
    heading: 'Product',
    links: [
      { label: 'Campaigns',          href: '/#campaigns'        },
      { label: 'Email Accounts',     href: '/#sending-accounts' },
      { label: 'Email Warmup',       href: '/#warmup'           },
      { label: 'Unibox',             href: '/#unibox'           },
      { label: 'Analytics',          href: '/#analytics'        },
      { label: 'Integrations',       href: '/#integrations'     },
      { label: 'Pricing',            href: '/pricing'           },
    ],
  },
  {
    heading: 'Use Cases',
    links: [
      { label: 'Agency',      href: '/use-cases/agency'      },
      { label: 'B2B Sales',   href: '/use-cases/b2b-sales'   },
      { label: 'SaaS',        href: '/use-cases/saas'        },
      { label: 'Recruitment', href: '/use-cases/recruitment' },
      { label: 'E-commerce',  href: '/use-cases/ecommerce'   },
      { label: 'Consulting',  href: '/use-cases/consulting'  },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Help Center',     href: '/help'      },
      { label: 'Blog',            href: '/blog'      },
      { label: 'Email Templates', href: '/templates' },
      { label: 'Pricing',         href: '/pricing'   },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About',   href: '/about'   },
      { label: 'Contact', href: '/contact' },
      { label: 'Login',   href: '/login'   },
      { label: 'Sign Up', href: '/signup'  },
    ],
  },
];

const legal = [
  { label: 'Privacy Policy',   href: '/privacy'   },
  { label: 'Terms of Service', href: '/terms'     },
  { label: 'Cookie Policy',    href: '/cookies'   },
  { label: 'GDPR',             href: '/gdpr'      },
  { label: 'Anti-Spam',        href: '/anti-spam' },
];

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="container pt-14 pb-8">

        {/* Top grid */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-6 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 font-bold text-[17px] text-gray-900 mb-4">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">⚡</span>
              LeadGenie
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs mb-6">
              The cold email outreach platform trusted by 30,000+ teams to book more meetings
              and close more deals — on autopilot.
            </p>
            {/* Social */}
            <div className="flex items-center gap-3">
              {[
                { label: 'X',        href: '#', path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
                { label: 'LinkedIn', href: '#', path: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z' },
              ].map(s => (
                <Link key={s.label} href={s.href}
                  className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d={s.path}/>
                  </svg>
                </Link>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          {cols.map(col => (
            <div key={col.heading}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-4">{col.heading}</h3>
              <ul className="space-y-2.5">
                {col.links.map(item => (
                  <li key={item.label}>
                    <Link href={item.href}
                      className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400 order-2 sm:order-1">
            © 2026 LeadGenie, Inc. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 order-1 sm:order-2">
            {legal.map(item => (
              <Link key={item.label} href={item.href}
                className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

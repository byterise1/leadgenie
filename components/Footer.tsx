'use client';

import Link from 'next/link';

const products = [
  { label: 'Outreach', href: '#' },
  { label: 'Lead Database', href: '#' },
  { label: 'Deliverability', href: '#' },
  { label: 'AI Sales Agent', href: '#' },
  { label: 'AI Reply Agent', href: '#' },
  { label: 'CRM', href: '#' },
  { label: 'Automations', href: '#' },
];

const useCases = [
  { label: 'Agency', href: '#' },
  { label: 'B2B Sales', href: '#' },
  { label: 'Recruitment', href: '#' },
  { label: 'SaaS', href: '#' },
];

const resources = [
  { label: 'Blog', href: '#' },
  { label: 'Help Center', href: '#' },
  { label: 'API Docs', href: '#' },
  { label: 'Community', href: '#' },
];

const legal = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Cookie Policy', href: '/cookies' },
];

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white pt-14 pb-8">
      <div className="container">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5 mb-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg text-gray-900 mb-4">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm">⚡</span>
              LeadGenie
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
              The AI platform for lead pipeline automation, intelligent outreach, and measurable revenue growth.
            </p>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-900 mb-4">Products</h3>
            <ul className="space-y-3">
              {products.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Use Cases */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-900 mb-4">Use Cases</h3>
            <ul className="space-y-3">
              {useCases.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-900 mb-4">Resources</h3>
            <ul className="space-y-3">
              {resources.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-900 mb-4">Legal</h3>
            <ul className="space-y-3">
              {legal.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">© 2026 LeadGenie. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">Privacy</Link>
            <Link href="/terms" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">Terms</Link>
            <Link href="/cookies" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

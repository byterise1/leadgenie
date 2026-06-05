import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import './globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: 'LeadGenie — Cold Email Outreach That Books Meetings',
  description:
    'LeadGenie is the #1 cold email outreach platform. Send unlimited emails, auto-warm your domains, and book more meetings with AI-personalised sequences. Trusted by 8,500+ sales teams.',
  metadataBase: new URL('https://leadgenie.io'),
  openGraph: {
    title: 'LeadGenie — Cold Email Outreach That Books Meetings',
    description:
      'Send unlimited cold emails, auto-warm your domains, and book more B2B meetings with AI outreach. Start free — no credit card.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className="bg-white text-gray-900 antialiased font-sans">{children}</body>
    </html>
  );
}

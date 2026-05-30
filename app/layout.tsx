import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LeadGenie — Find Clients Instantly with AI',
  description: 'LeadGenie helps you find perfect leads, create AI Sales Agents, and automate your outreach & sales.',
  metadataBase: new URL('https://example.com'),
  openGraph: {
    title: 'LeadGenie — Find Clients Instantly with AI',
    description: 'Get more clients by chatting to AI. Find leads, automate outreach, and grow your pipeline.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}

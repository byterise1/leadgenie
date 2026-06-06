'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DashboardSidebar } from '@/components/DashboardSidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const credits = 100;
  const usedCredits = 0;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DashboardSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 md:ml-[220px] min-w-0 flex flex-col">
        {/* Top bar — always visible */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center px-4 gap-3 shrink-0 sticky top-0 z-20">
          {/* Mobile menu toggle */}
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <span className="md:hidden font-bold text-gray-900">LeadGenie</span>

          <div className="flex-1"/>

          {/* Credits — icon + count only */}
          <div className="flex items-center gap-2.5 border border-gray-200 rounded-xl px-3 py-1.5 bg-white">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="currentColor">
              <path d="M7 15.5c0 .049.006.096.007.145a7.3 7.3 0 1 1 8.638-8.638c-.049 0-.096-.007-.145-.007a8.557 8.557 0 0 0-.877.045 6.296 6.296 0 1 0-7.578 7.578A8.557 8.557 0 0 0 7 15.5zm.983-11.27l-.119-.992A5.3 5.3 0 0 0 3.2 8.558c.002.153.01.303.024.45l.995-.093a4.508 4.508 0 0 1-.019-.367A4.3 4.3 0 0 1 7.983 4.23zM22.8 15.5a7.3 7.3 0 1 1-7.3-7.3 7.308 7.308 0 0 1 7.3 7.3zm-1 0a6.3 6.3 0 1 0-6.3 6.3 6.307 6.307 0 0 0 6.3-6.3zm-10.58.415a4.508 4.508 0 0 1-.02-.367 4.3 4.3 0 0 1 3.783-4.318l-.119-.992a5.3 5.3 0 0 0-4.664 5.32c.002.153.01.303.024.45zm8.028-4.163l-.707.707a4.3 4.3 0 1 1-6.082 6.082l-.707.707a5.3 5.3 0 0 0 7.496-7.496z"/>
            </svg>
            <span className="text-xs font-bold text-gray-900">{credits - usedCredits}</span>
            <span className="text-xs text-gray-400">credits</span>
            <div className="w-px h-3.5 bg-gray-200"/>
            <Link href="/dashboard/billing" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors whitespace-nowrap">
              Upgrade
            </Link>
          </div>

          {/* Help */}
          <a href="/help" className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" title="Help">
            <svg className="w-4.5 h-4.5 w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </a>
        </header>

        {children}
      </div>
    </div>
  );
}

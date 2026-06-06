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

          {/* Credits pill */}
          <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"/>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-gray-900">{credits - usedCredits}</span>
              <span className="text-xs text-gray-400">/ {credits} credits</span>
            </div>
            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${((credits - usedCredits) / credits) * 100}%` }}/>
            </div>
            <Link href="/pricing" className="text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors whitespace-nowrap">
              Get more →
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

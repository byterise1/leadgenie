'use client';

import { useState } from 'react';
import { DashboardSidebar } from '@/components/DashboardSidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DashboardSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 md:ml-[220px] min-w-0 flex flex-col">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center h-14 px-4 bg-white border-b border-gray-100">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <span className="ml-3 font-bold text-gray-900">LeadGenie</span>
        </div>
        {children}
      </div>
    </div>
  );
}

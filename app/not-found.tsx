'use client';

import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <Navbar />
      <main className="container grid min-h-[600px] items-center justify-center gap-8 py-20 text-center">
        <div className="space-y-4">
          <h1 className="text-6xl font-semibold text-slate-950">404</h1>
          <p className="text-xl text-slate-600">Page not found</p>
          <p className="max-w-2xl text-base leading-7 text-slate-500">
            The page you're looking for doesn't exist or has been moved. Let's get you back on track.
          </p>
          <Link
            href="/"
            className="inline-flex rounded-full bg-slate-950 px-7 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Return home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

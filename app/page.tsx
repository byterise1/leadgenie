'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

/* ════════════════════════════════════════════════════════════
   SVG ICON COMPONENTS  (all emojis replaced)
════════════════════════════════════════════════════════════ */
function IcLightning({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}
function IcMail({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
function IcUsers({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}
function IcRocket({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  );
}
function IcCalendar({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
function IcFire({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
    </svg>
  );
}
function IcInbox({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" />
    </svg>
  );
}
function IcBarChart({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}
function IcSparkles({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  );
}
function IcStar({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="currentColor" viewBox="0 0 24 24">
      <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}
function IcTrend({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  );
}
function IcWarning({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}
function IcRobot({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
    </svg>
  );
}
function IcMailOpen({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z" />
    </svg>
  );
}
function IcCursor({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
    </svg>
  );
}
function IcChat({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  );
}
function IcClock({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IcDatabase({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7c0-1.657 3.582-3 8-3s8 1.343 8 3M4 7v5c0 1.657 3.582 3 8 3s8-1.343 8-3V7M4 7v5M4 12v5c0 1.657 3.582 3 8 3s8-1.343 8-3v-5" />
    </svg>
  );
}
function IcServer({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM4 14a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════
   PERSON AVATAR — human silhouette SVG
════════════════════════════════════════════════════════════ */
const AVATAR_GRADS: [string, string][] = [
  ['#3b82f6', '#6366f1'],
  ['#8b5cf6', '#ec4899'],
  ['#10b981', '#0ea5e9'],
  ['#f59e0b', '#ef4444'],
  ['#06b6d4', '#8b5cf6'],
  ['#f97316', '#ec4899'],
];

function PersonAvatar({ idx, size = 36 }: { idx: number; size?: number }) {
  const [from, to] = AVATAR_GRADS[idx % AVATAR_GRADS.length];
  const id = `pav${idx}`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className="shrink-0 rounded-full">
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="20" fill={`url(#${id})`} />
      <circle cx="20" cy="14" r="7" fill="rgba(255,255,255,0.88)" />
      <path d="M2 44 Q2 24 20 24 Q38 24 38 44Z" fill="rgba(255,255,255,0.88)" />
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════
   DATA
════════════════════════════════════════════════════════════ */
const testimonials = [
  {
    quote: "LeadGenie completely transformed our agency. We went from sending 2,000 emails a week to over 200,000 — across 40+ client domains — without a single deliverability issue. The warmup alone is worth 10x the price.",
    name: 'Mike Ellis', role: 'Co-Founder, Kale Acquisition', company: 'Kale', initials: 'ME', color: 'bg-green-600',
  },
  {
    quote: "We booked 47 qualified meetings in our first month. The campaign builder is incredibly intuitive — I had our first 5-step sequence running in under 20 minutes. The Unibox makes managing replies from 12 accounts feel effortless.",
    name: 'Briken Bufi', role: 'CEO & Co-Founder, Aella Creative Force', company: 'Aella', initials: 'BB', color: 'bg-blue-600',
  },
  {
    quote: "I've tried Instantly, Lemlist, and Mailshake. LeadGenie beats them all on deliverability and ease of use. Our open rates jumped from 28% to 61% after switching. The AI personalisation is genuinely impressive.",
    name: 'Alex Baldovin', role: 'CEO, Authbound', company: 'Authbound', initials: 'AB', color: 'bg-purple-600',
  },
];

const BRANDS = [
  'Stripe', 'Notion', 'Linear', 'Vercel', 'Figma',
  'HubSpot', 'Zapier', 'Segment', 'Intercom', 'Outreach',
];

type AIResult =
  | { type: 'email'; to: string; subject: string; body: string }
  | { type: 'answer'; answer: string };

/* ════════════════════════════════════════════════════════════
   SECTION BADGE
════════════════════════════════════════════════════════════ */
function SectionBadge({ icon, label, dark = false }: { icon: React.ReactNode; label: string; dark?: boolean }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-4 ${
      dark
        ? 'bg-white/15 border border-white/25 text-white/80'
        : 'bg-blue-50 border border-blue-100 text-blue-600'
    }`}>
      <span className={`flex items-center justify-center w-3.5 h-3.5 ${dark ? 'text-white/70' : 'text-blue-500'}`}>{icon}</span>
      {label}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PAGE
════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [error, setError] = useState('');

  async function handleSearch() {
    if (!query.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const res = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data);
    } catch {
      setError('Something went wrong. Check your GROQ_API_KEY in .env.local.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="hero-gradient pb-20 pt-20">
        <div className="container text-center">

          {/* Announcement pill */}
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
            className="mb-6 flex justify-center">
            <Link href="/signup"
              className="inline-flex items-center gap-2 border border-white/20 bg-white/10 rounded-full px-4 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/20 transition-colors">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              New: AI-powered email warmup is live — try it free
              <svg className="w-3.5 h-3.5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </motion.div>

          {/* Headline */}
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="text-4xl sm:text-5xl lg:text-[58px] font-extrabold text-white leading-[1.1] tracking-tight">
            Cold Email Outreach That{' '}
            <span className="inline-flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-blue-500/60 border-2 border-white/30 align-middle mx-1 text-white">
              <IcLightning c="w-5 h-5 sm:w-6 sm:h-6" />
            </span>{' '}
            Books Meetings
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }}
            className="mt-3 text-sm font-semibold text-blue-200 tracking-wide uppercase">
            Built for sales teams, agencies &amp; SaaS founders
          </motion.p>

          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.12 }}
            className="mt-3 text-base sm:text-lg text-blue-100 max-w-xl mx-auto leading-relaxed">
            Connect unlimited sending accounts, warm up your domains automatically, and run
            AI-personalised cold email campaigns that land in the inbox — not spam.
          </motion.p>

          {/* AI search bar */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 mx-auto max-w-[580px]">
            <div className="flex items-center bg-white rounded-full shadow-2xl px-5 py-3 gap-3 ring-1 ring-white/20">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Ask AI to write your first cold email campaign..."
                className="flex-1 text-sm text-gray-700 outline-none bg-transparent placeholder:text-gray-400 font-medium" />
              <button onClick={handleSearch} disabled={loading}
                className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60 shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </motion.div>

          {/* AI response card */}
          {(loading || result || error) && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              className="mt-4 mx-auto max-w-[580px] bg-white rounded-2xl shadow-2xl ring-1 ring-black/8 overflow-hidden text-left">

              {error && (
                <div className="flex items-center gap-3 px-5 py-4">
                  <span className="text-red-500 shrink-0"><IcWarning c="w-5 h-5" /></span>
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>
              )}

              {loading && (
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="h-5 w-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin shrink-0" />
                  <p className="text-sm text-gray-500 font-medium">LeadGenie AI is thinking...</p>
                </div>
              )}

              {result?.type === 'answer' && (
                <>
                  <div className="px-5 py-2.5 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
                    <span className="text-indigo-600"><IcRobot c="w-4 h-4" /></span>
                    <p className="text-xs font-semibold text-indigo-700">LeadGenie AI</p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-sm text-gray-700 leading-relaxed">{result.answer}</p>
                  </div>
                  <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-400">Want to see it in action?</p>
                    <Link href="/signup"
                      className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg px-4 py-2 hover:bg-blue-700 transition-colors shrink-0">
                      Try LeadGenie Free
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Link>
                  </div>
                </>
              )}

              {result?.type === 'email' && (
                <>
                  <div className="px-5 py-2.5 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                    <span className="text-blue-600"><IcSparkles c="w-4 h-4" /></span>
                    <p className="text-xs font-semibold text-blue-700">Your email is ready</p>
                  </div>
                  <div className="px-5 py-4 space-y-2.5">
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-14 shrink-0 mt-0.5">To</span>
                      <span className="text-xs text-gray-700 font-medium">{result.to}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-14 shrink-0 mt-0.5">Subject</span>
                      <span className="text-xs text-gray-900 font-semibold">{result.subject}</span>
                    </div>
                    <div className="pt-2 border-t border-gray-100 text-xs text-gray-600 leading-relaxed whitespace-pre-line">
                      {result.body}
                    </div>
                  </div>
                  <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-400">No credit card required</p>
                    <Link href="/signup"
                      className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg px-4 py-2 hover:bg-blue-700 transition-colors shrink-0">
                      Use this template — Start Free
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Link>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* Step-by-step flow */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-1">
            {[
              { n: '1', label: 'Add Email Account', icon: <IcServer c="w-3.5 h-3.5" /> },
              { n: '2', label: 'Upload Prospects',   icon: <IcUsers c="w-3.5 h-3.5" /> },
              { n: '3', label: 'Launch Campaign',    icon: <IcRocket c="w-3.5 h-3.5" /> },
              { n: '4', label: 'Book Meetings',      icon: <IcCalendar c="w-3.5 h-3.5" /> },
            ].map((step, i) => (
              <div key={step.n} className="flex items-center">
                <div className="flex items-center gap-2 bg-white/12 border border-white/20 rounded-2xl px-4 py-2.5 backdrop-blur-sm hover:bg-white/18 transition-colors cursor-default">
                  <span className="h-5 w-5 rounded-full bg-blue-500/80 text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-sm">
                    {step.n}
                  </span>
                  <span className="text-white/70 shrink-0">{step.icon}</span>
                  <span className="text-xs sm:text-sm font-semibold text-white/90">{step.label}</span>
                </div>
                {i < 3 && (
                  <svg className="w-4 h-4 text-white/25 mx-1.5 hidden sm:block shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            ))}
          </motion.div>

          {/* Trusted brands — animated marquee */}
          <div className="mt-16">
            <p className="text-xs font-semibold text-blue-200/70 uppercase tracking-widest mb-5">
              Trusted by teams at world-class companies
            </p>
            <div
              className="overflow-hidden"
              style={{
                WebkitMaskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
                maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
              }}>
              <div className="flex w-max gap-4 animate-marquee">
                {[...BRANDS, ...BRANDS].map((name, i) => (
                  <div key={i}
                    className="flex-shrink-0 flex items-center gap-2 bg-white/10 border border-white/15 rounded-xl px-5 py-2.5 hover:bg-white/18 transition-colors cursor-default">
                    <span className="w-2 h-2 rounded-full bg-white/50 shrink-0" />
                    <span className="text-sm font-bold text-white/80 whitespace-nowrap tracking-tight">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          STATS BAR
      ══════════════════════════════════════════ */}
      <section className="bg-white border-b border-gray-100 py-14">
        <div className="container">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {[
              { v: '8,500+', l: 'Active Users',     icon: <IcUsers c="w-5 h-5" />,    color: 'text-blue-600',   bg: 'bg-blue-50' },
              { v: '42M+',   l: 'Emails Delivered', icon: <IcMail c="w-5 h-5" />,     color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { v: '58%',    l: 'Avg Open Rate',    icon: <IcTrend c="w-5 h-5" />,    color: 'text-green-600',  bg: 'bg-green-50' },
              { v: '4.9/5',  l: 'G2 Rating',        icon: <IcStar c="w-5 h-5" />,     color: 'text-yellow-600', bg: 'bg-yellow-50' },
            ].map(s => (
              <motion.div key={s.l}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.5 }}
                className="flex flex-col items-center text-center bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <span className={`w-10 h-10 flex items-center justify-center rounded-xl ${s.bg} ${s.color} mb-3`}>{s.icon}</span>
                <p className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">{s.v}</p>
                <p className="mt-1.5 text-sm text-gray-500 font-medium">{s.l}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          1. UNLIMITED SENDING ACCOUNTS
      ══════════════════════════════════════════ */}
      <section id="sending-accounts" className="bg-white py-24">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}>
            <SectionBadge icon={<IcMail />} label="Email Accounts" />
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight">
              Add Unlimited Sending Accounts
            </h2>
            <p className="mt-4 text-gray-500 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              Connect Gmail, Outlook, and custom SMTP accounts — as many as you need.
              Rotate between senders automatically to stay under daily limits and
              protect your domain reputation.
            </p>
            <Link href="/signup"
              className="mt-6 inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold rounded-full px-7 py-3 hover:bg-gray-700 transition-colors">
              Start For Free
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-12 mx-auto max-w-3xl rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5"
            style={{ background: 'linear-gradient(135deg,#1a3480 0%,#1d4ed8 45%,#3b82f6 100%)' }}>
            <div className="p-8 sm:p-10">
              <div className="bg-white rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IcServer c="w-4 h-4 text-gray-400" />
                    <p className="text-sm font-bold text-gray-900">Email Accounts</p>
                  </div>
                  <button className="flex items-center gap-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700 transition-colors">
                    + Add Account
                  </button>
                </div>
                <div className="divide-y divide-gray-50">
                  {[
                    { email: 'alex@company.io',    provider: 'Gmail',   health: 98, status: 'Active',  sends: '142/200' },
                    { email: 'sarah@outreach.co',  provider: 'Outlook', health: 95, status: 'Active',  sends: '87/200'  },
                    { email: 'mike@growthco.com',  provider: 'Gmail',   health: 71, status: 'Warming', sends: '30/50'   },
                    { email: 'leads@salesteam.io', provider: 'SMTP',    health: 99, status: 'Active',  sends: '198/300' },
                    { email: 'outreach@scale.ai',  provider: 'Gmail',   health: 43, status: 'Warming', sends: '12/30'   },
                  ].map((acc, i) => (
                    <div key={acc.email} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50">
                      <PersonAvatar idx={i} size={32} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{acc.email}</p>
                        <p className="text-xs text-gray-400">{acc.provider}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{
                            width: `${acc.health}%`,
                            background: acc.health > 80 ? '#22c55e' : acc.health > 50 ? '#f59e0b' : '#ef4444'
                          }} />
                        </div>
                        <span className="text-xs text-gray-500 w-6 text-right">{acc.health}</span>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                        acc.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>{acc.status}</span>
                      <span className="text-xs text-gray-400 shrink-0 hidden sm:block">{acc.sends}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          2. EMAIL WARMUP
      ══════════════════════════════════════════ */}
      <section id="warmup" className="teal-gradient py-24">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}>
            <SectionBadge icon={<IcFire />} label="Email Warmup" dark />
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
              Land in the Inbox. Every Time.
            </h2>
            <p className="mt-4 text-blue-100 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              Our AI warmup network automatically builds your sender reputation by sending, opening,
              and replying to emails on your behalf — 24/7 in the background, before you launch
              a single cold email campaign.
            </p>
            <Link href="/signup"
              className="mt-6 inline-flex items-center gap-2 bg-white text-gray-900 text-sm font-semibold rounded-full px-7 py-3 hover:bg-blue-50 transition-colors shadow-sm">
              Start For Free
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-12 mx-auto max-w-3xl">
            <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-black/8 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900">Warmup Dashboard</p>
                  <p className="text-xs text-gray-400 mt-0.5">alex@company.io · Running 18 days</p>
                </div>
                <span className="flex items-center gap-1.5 text-xs font-semibold bg-green-100 text-green-700 rounded-full px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />Warming Up
                </span>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { l: 'Inbox Rate',   v: '97.3%',  color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
                    { l: 'Spam Rate',    v: '0.4%',   color: 'text-red-500',   bg: 'bg-red-50 border-red-100'     },
                    { l: 'Health Score', v: '98/100', color: 'text-blue-600',  bg: 'bg-blue-50 border-blue-100'   },
                  ].map(s => (
                    <div key={s.l} className={`rounded-xl p-3.5 border text-center ${s.bg}`}>
                      <p className={`text-2xl font-extrabold ${s.color}`}>{s.v}</p>
                      <p className="text-xs text-gray-500 mt-1 font-medium">{s.l}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Inbox Placement Score — Last 30 Days</p>
                <div className="h-24 flex items-end gap-1">
                  {[42,51,58,63,60,69,72,75,78,82,80,85,83,88,86,91,89,93,90,95,92,96,94,97,95,97,96,98,97,98].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-sm" style={{
                      height: `${h}%`,
                      background: `rgba(59,130,246,${0.2 + i * 0.027})`
                    }} />
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                  <span>Day 1 — Score: 42%</span>
                  <span className="text-green-600 font-semibold">Today — Score: 98% ↑</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          3. CAMPAIGN BUILDER
      ══════════════════════════════════════════ */}
      <section id="campaigns" className="bg-gray-50 py-24">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}>
            <SectionBadge icon={<IcRocket />} label="Campaigns" />
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight">
              Launch Cold Email Campaigns That Get Replies
            </h2>
            <p className="mt-4 text-gray-500 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              Build multi-step email sequences with AI personalisation, smart follow-ups,
              and inbox rotation. Schedule, A/B test, pause, or scale — all from one dashboard.
            </p>
            <Link href="/signup"
              className="mt-6 inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold rounded-full px-7 py-3 hover:bg-gray-700 transition-colors">
              Start For Free
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-12 mx-auto max-w-3xl rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5"
            style={{ background: 'linear-gradient(135deg,#1a3480 0%,#1d4ed8 45%,#3b82f6 100%)' }}>
            <div className="p-8 sm:p-10">
              <div className="grid sm:grid-cols-2 gap-5 text-left">
                {/* Sequence steps */}
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <IcLightning c="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-bold text-gray-900">Campaign: SaaS Founders Q3</p>
                  </div>
                  <div className="space-y-3">
                    {[
                      { step: 1, day: 'Day 1',  label: 'Initial Email',   open: '64%', reply: '—'   },
                      { step: 2, day: 'Day 3',  label: 'Follow-up #1',    open: '41%', reply: '—'   },
                      { step: 3, day: 'Day 7',  label: 'Follow-up #2',    open: '29%', reply: '—'   },
                      { step: 4, day: 'Day 14', label: 'Break-up Email',  open: '52%', reply: '18%' },
                    ].map(s => (
                      <div key={s.step} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-blue-50/40 transition-colors">
                        <span className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">{s.step}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800">{s.label}</p>
                          <p className="text-[10px] text-gray-400">{s.day}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-gray-400">Open: <span className="font-semibold text-green-600">{s.open}</span></p>
                          {s.reply !== '—' && <p className="text-[10px] text-gray-400">Reply: <span className="font-semibold text-blue-600">{s.reply}</span></p>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="mt-4 w-full border-2 border-dashed border-gray-200 rounded-xl py-2 text-xs font-semibold text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors">
                    + Add Follow-up Step
                  </button>
                </div>

                {/* Email preview */}
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-3">AI-Personalised Email Preview</p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] text-gray-400 mb-1">To</p>
                      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                        <PersonAvatar idx={0} size={20} />
                        <span className="text-xs text-gray-700 font-medium">John Doe · VP Sales, Acme Corp</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 mb-1">Subject</p>
                      <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-gray-800 font-medium">
                        Quick question about Acme&apos;s outbound stack
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 mb-1">Body</p>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-xs text-gray-700 leading-relaxed">
                        Hi John,<br /><br />
                        I noticed Acme Corp just expanded into enterprise — congrats on the Series B!<br /><br />
                        We help VP Sales teams like yours book 30–50 meetings/month through cold email without hiring more SDRs...
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button className="flex-1 bg-blue-600 text-white text-xs font-bold rounded-lg py-2 hover:bg-blue-700 transition-colors">Send Campaign</button>
                      <button className="flex items-center gap-1 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors">
                        <IcSparkles c="w-3.5 h-3.5 text-purple-500" /> Rewrite
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          4. UNIBOX
      ══════════════════════════════════════════ */}
      <section id="unibox" className="bg-white py-24">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}>
            <SectionBadge icon={<IcInbox />} label="Unibox" />
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight">
              Every Reply. One Smart Inbox.
            </h2>
            <p className="mt-4 text-gray-500 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              Stop switching between 20 different email accounts. LeadGenie&apos;s Unibox pulls every
              reply into one place — filter by campaign, label by intent, assign to teammates,
              and close deals faster.
            </p>
            <Link href="/signup"
              className="mt-6 inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold rounded-full px-7 py-3 hover:bg-gray-700 transition-colors">
              Start For Free
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-12 mx-auto max-w-3xl rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5"
            style={{ background: 'linear-gradient(135deg,#5b21b6 0%,#4338ca 48%,#1d4ed8 100%)' }}>
            <div className="p-8 sm:p-10">
              <div className="bg-white rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5">
                {/* Inbox header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-bold text-gray-900">Unibox</p>
                    <span className="text-xs font-bold bg-blue-600 text-white rounded-full px-2 py-0.5">8 new</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {['All', 'Interested', 'Not Now', 'DNC'].map((f, i) => (
                      <button key={f} className={`text-[11px] font-semibold rounded-full px-2.5 py-1 transition-colors ${
                        i === 0 ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                      }`}>{f}</button>
                    ))}
                  </div>
                </div>
                {/* Email rows */}
                {[
                  { from: 'Sarah Chen', co: 'Stripe',  time: '2m',  preview: "Hi, this looks interesting! Can we schedule a...", tag: 'Interested',  tagColor: 'bg-green-100 text-green-700',   read: false, idx: 0 },
                  { from: 'James Park', co: 'Notion',  time: '14m', preview: "Sure, let's chat. What times work for you this...", tag: 'Meeting Set', tagColor: 'bg-blue-100 text-blue-700',    read: false, idx: 1 },
                  { from: 'Lena Wolf',  co: 'Linear',  time: '1h',  preview: "We actually just signed with another vendor, but...", tag: 'Not Now',   tagColor: 'bg-yellow-100 text-yellow-700', read: true,  idx: 2 },
                  { from: 'Tom Reid',   co: 'Vercel',  time: '3h',  preview: "Thanks for reaching out — we're open to exploring...", tag: 'Interested', tagColor: 'bg-green-100 text-green-700', read: true,  idx: 3 },
                  { from: 'Amy Tran',   co: 'Figma',   time: '5h',  preview: "Could you send over more info about pricing and...", tag: 'Needs Info',  tagColor: 'bg-purple-100 text-purple-700', read: true, idx: 4 },
                ].map(mail => (
                  <div key={mail.from}
                    className={`flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors ${!mail.read ? 'bg-blue-50/25' : ''}`}>
                    <PersonAvatar idx={mail.idx} size={36} />
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm text-gray-900 ${!mail.read ? 'font-bold' : 'font-semibold'}`}>{mail.from}</span>
                        <span className="text-xs text-gray-400">· {mail.co}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{mail.preview}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-[10px] text-gray-400">{mail.time} ago</span>
                      <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${mail.tagColor}`}>{mail.tag}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          5. ANALYTICS
      ══════════════════════════════════════════ */}
      <section id="analytics" className="teal-gradient py-24">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}>
            <SectionBadge icon={<IcBarChart />} label="Analytics" dark />
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
              Know Exactly What&apos;s Working
            </h2>
            <p className="mt-4 text-blue-100 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              Track opens, clicks, replies, bounces, and unsubscribes in real-time. See which
              subject lines, templates, and follow-up steps drive the most meetings — then
              double down on what works.
            </p>
            <Link href="/signup"
              className="mt-6 inline-flex items-center gap-2 bg-white text-gray-900 text-sm font-semibold rounded-full px-7 py-3 hover:bg-blue-50 transition-colors shadow-sm">
              Start For Free
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-12 mx-auto max-w-3xl bg-white rounded-2xl shadow-2xl ring-1 ring-black/8 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900">Campaign Analytics</p>
                <p className="text-xs text-gray-400 mt-0.5">SaaS Founders Q3 · Last 30 days</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-semibold bg-green-100 text-green-700 rounded-full px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />Live
              </span>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { l: 'Sent',    v: '8,240',  sub: '+1,200 this week',  color: 'text-gray-900'   },
                  { l: 'Opened',  v: '58.3%',  sub: '+6.2% vs last run', color: 'text-blue-600'   },
                  { l: 'Clicked', v: '14.7%',  sub: '+3.1% vs last run', color: 'text-indigo-600' },
                  { l: 'Replied', v: '18.4%',  sub: '1,515 replies',     color: 'text-green-600'  },
                ].map(m => (
                  <div key={m.l} className="bg-gray-50 border border-gray-100 rounded-xl p-3.5 text-center hover:bg-blue-50/30 transition-colors">
                    <p className={`text-xl font-extrabold ${m.color}`}>{m.v}</p>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">{m.l}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{m.sub}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 text-left">Open Rate Trend</p>
              <div className="h-32 flex items-end gap-1.5">
                {[38,42,45,48,44,52,55,51,58,60,56,63,61,65,62,67,64,69,66,71,68,72,70,74,72,75,73,77,75,78].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-sm"
                    style={{ height: `${h}%`, background: `rgba(59,130,246,${0.2 + i * 0.027})` }} />
                ))}
              </div>
              {/* Live activity */}
              <div className="mt-5 border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 text-left">Live Activity</p>
                {[
                  { icon: <IcMailOpen c="w-3.5 h-3.5" />, event: 'Email opened',   who: 'Sarah Chen · Stripe', time: '2s ago',  color: 'text-blue-500'  },
                  { icon: <IcCursor c="w-3.5 h-3.5" />,   event: 'Link clicked',   who: 'James Park · Notion', time: '47s ago', color: 'text-indigo-500' },
                  { icon: <IcChat c="w-3.5 h-3.5" />,     event: 'Reply received', who: 'Lena Wolf · Linear',  time: '3m ago',  color: 'text-green-500'  },
                  { icon: <IcMailOpen c="w-3.5 h-3.5" />, event: 'Email opened',   who: 'Tom Reid · Vercel',   time: '5m ago',  color: 'text-blue-500'  },
                ].map(a => (
                  <div key={a.who} className="flex items-center justify-between py-2 text-left gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`shrink-0 ${a.color}`}>{a.icon}</span>
                      <span className="text-xs text-gray-600 font-semibold whitespace-nowrap">{a.event}</span>
                      <span className="text-xs text-gray-400 truncate">— {a.who}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0">{a.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          6. AI WORKFLOWS — automation flows
      ══════════════════════════════════════════ */}
      <section id="workflows" className="bg-gray-50 py-24">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}>
            <SectionBadge icon={<IcSparkles />} label="AI Workflows" />
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight">
              Automate Every Follow-Up
            </h2>
            <p className="mt-4 text-gray-500 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              Set your triggers once — LeadGenie automatically handles follow-ups, tags leads by
              intent, and routes hot prospects to your team so no opportunity slips through the cracks.
            </p>
            <Link href="/signup"
              className="mt-6 inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold rounded-full px-7 py-3 hover:bg-gray-700 transition-colors">
              Start For Free
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-12 max-w-2xl mx-auto space-y-3">
            {[
              {
                trigger: 'Lead opens your email',
                action: 'Auto-send follow-up in 2 days',
                result: '+24% reply rate',
                tBg: 'bg-blue-50 text-blue-700 border-blue-100',
                aBg: 'bg-indigo-50 text-indigo-700 border-indigo-100',
                rColor: 'text-green-600 bg-green-50',
                tIcon: <IcMailOpen c="w-3.5 h-3.5" />,
                aIcon: <IcClock c="w-3.5 h-3.5" />,
              },
              {
                trigger: 'Lead replies positively',
                action: 'Tag as Interested, route to Unibox',
                result: 'Zero missed hot leads',
                tBg: 'bg-green-50 text-green-700 border-green-100',
                aBg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                rColor: 'text-emerald-700 bg-emerald-50',
                tIcon: <IcChat c="w-3.5 h-3.5" />,
                aIcon: <IcInbox c="w-3.5 h-3.5" />,
              },
              {
                trigger: 'Meeting booked via calendar',
                action: 'Remove from sequence, sync to CRM',
                result: 'No duplicate outreach',
                tBg: 'bg-purple-50 text-purple-700 border-purple-100',
                aBg: 'bg-violet-50 text-violet-700 border-violet-100',
                rColor: 'text-violet-700 bg-violet-50',
                tIcon: <IcCalendar c="w-3.5 h-3.5" />,
                aIcon: <IcDatabase c="w-3.5 h-3.5" />,
              },
            ].map((wf, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold shrink-0 ${wf.tBg}`}>
                    {wf.tIcon}
                    <span>When: {wf.trigger}</span>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 shrink-0 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold flex-1 ${wf.aBg}`}>
                    {wf.aIcon}
                    <span>Then: {wf.action}</span>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${wf.rColor}`}>
                    → {wf.result}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          7. TESTIMONIALS
      ══════════════════════════════════════════ */}
      <section className="bg-white py-24">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}>
            <SectionBadge icon={<IcStar />} label="Testimonials" />
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight">
              Real Results. Real Customers.
            </h2>
            <p className="mt-3 text-gray-400 text-base">
              Trusted by 8,500+ sales teams, agencies, and SaaS founders worldwide.
            </p>
          </motion.div>

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto text-left">
            {testimonials.map((t, idx) => (
              <motion.div key={t.name}
                initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="bg-white rounded-2xl p-7 flex flex-col justify-between border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                <div>
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                </div>
                <div className="mt-6 flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full ${t.color} text-white flex items-center justify-center text-sm font-bold shrink-0`}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                  <span className="ml-auto text-xs font-bold text-gray-400 italic bg-gray-50 border border-gray-100 rounded-lg px-2 py-1">{t.company}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          8. CTA
      ══════════════════════════════════════════ */}
      <section className="cta-gradient py-24">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight">
              Start Booking Meetings
              <br />
              <span className="inline-flex items-center gap-2 justify-center">
                This Week —{' '}
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/20 border border-white/30 text-white">
                  <IcLightning c="w-4 h-4" />
                </span>
                {' '}Free
              </span>
            </h2>
            <p className="mt-4 text-blue-200 text-base max-w-sm mx-auto leading-relaxed">
              No credit card required. Get set up in minutes and launch your first cold email
              campaign today.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/signup"
                className="bg-white text-gray-900 text-sm font-bold rounded-full px-8 py-3.5 hover:bg-blue-50 transition-colors shadow-lg">
                Get Started Free
              </Link>
              <Link href="/pricing"
                className="border border-white/30 text-white text-sm font-semibold rounded-full px-7 py-3 hover:bg-white/10 transition-colors">
                See Pricing
              </Link>
            </div>

            {/* Social proof row */}
            <div className="mt-10 flex items-center justify-center gap-6 flex-wrap">
              {[
                { icon: <IcUsers c="w-4 h-4" />, text: '8,500+ active teams' },
                { icon: <IcStar c="w-4 h-4" />,  text: '4.9/5 on G2'        },
                { icon: <IcMail c="w-4 h-4" />,  text: '42M+ emails sent'   },
              ].map(s => (
                <div key={s.text} className="flex items-center gap-2 text-white/70 text-xs font-medium">
                  <span className="text-white/50">{s.icon}</span>
                  {s.text}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

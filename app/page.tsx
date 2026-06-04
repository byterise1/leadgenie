'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

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

type EmailResult = { to: string; subject: string; body: string };

function SectionBadge({ icon, label, dark = false }: { icon: string; label: string; dark?: boolean }) {
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold mb-4 ${
      dark
        ? 'bg-white/15 border border-white/25 text-white/80'
        : 'bg-blue-50 border border-blue-100 text-blue-600'
    }`}>
      <span>{icon}</span> {label}
    </div>
  );
}

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState<EmailResult | null>(null);
  const [error, setError] = useState('');

  async function handleSearch() {
    if (!query.trim() || loading) return;
    setLoading(true);
    setGeneratedEmail(null);
    setError('');
    try {
      const res = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setGeneratedEmail(data);
    } catch {
      setError('Could not generate email. Check your GROQ_API_KEY in .env.local.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />

      {/* ══════════════════════════════════════════
          HERO — blue gradient, centered (Instantly style)
      ══════════════════════════════════════════ */}
      <section className="hero-gradient pb-20 pt-20">
        <div className="container text-center">

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

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="text-4xl sm:text-5xl lg:text-[58px] font-bold text-white leading-[1.1] tracking-tight">
            Cold Email Outreach That{' '}
            <span className="inline-flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-blue-700 border-2 border-white/30 text-xl align-middle mx-1">⚡</span>{' '}
            Books Meetings
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }}
            className="mt-3 text-sm font-semibold text-blue-200 tracking-wide">
            Perfect for sales teams, agencies, and SaaS founders.
          </motion.p>

          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.12 }}
            className="mt-3 text-base sm:text-lg text-blue-100 max-w-xl mx-auto leading-relaxed">
            Connect unlimited sending accounts, warm up your domains automatically, and run
            AI-personalised campaigns that land in the inbox — not spam.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 mx-auto max-w-[560px]">
            <div className="flex items-center bg-white rounded-full shadow-lg px-5 py-3 gap-3">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Ask AI to write your first cold email campaign..."
                className="flex-1 text-sm text-gray-700 outline-none bg-transparent placeholder:text-gray-400" />
              <button onClick={handleSearch}
                disabled={loading}
                className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </motion.div>

          {/* AI-generated email result */}
          {(loading || generatedEmail || error) && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              className="mt-4 mx-auto max-w-[560px] bg-white rounded-2xl shadow-2xl ring-1 ring-black/8 overflow-hidden text-left">
              {error ? (
                <div className="flex items-center gap-3 px-5 py-4">
                  <span className="text-red-500">⚠️</span>
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>
              ) : loading ? (
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="h-5 w-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin shrink-0" />
                  <p className="text-sm text-gray-500 font-medium">AI is writing your email...</p>
                </div>
              ) : generatedEmail && (
                <>
                  <div className="px-5 py-2.5 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                    <span className="text-blue-600">✨</span>
                    <p className="text-xs font-semibold text-blue-700">Your email is ready</p>
                  </div>
                  <div className="px-5 py-4 space-y-2.5">
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-14 shrink-0 mt-0.5">To</span>
                      <span className="text-xs text-gray-700 font-medium">{generatedEmail.to}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-14 shrink-0 mt-0.5">Subject</span>
                      <span className="text-xs text-gray-900 font-semibold">{generatedEmail.subject}</span>
                    </div>
                    <div className="pt-2 border-t border-gray-100 text-xs text-gray-600 leading-relaxed whitespace-pre-line">
                      {generatedEmail.body}
                    </div>
                  </div>
                  <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-400">No credit card required</p>
                    <Link href="/signup"
                      className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg px-4 py-2 hover:bg-blue-700 transition-colors shrink-0">
                      Use this template — Start Free
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                      </svg>
                    </Link>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* Step-by-step flow */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-1">
            {[
              { n: '1', label: 'Add Sending Account', icon: '📨' },
              { n: '2', label: 'Upload Prospects',    icon: '👥' },
              { n: '3', label: 'Create Campaign',     icon: '⚡' },
              { n: '4', label: 'Book Meetings',       icon: '📅' },
            ].map((step, i) => (
              <div key={step.n} className="flex items-center">
                <div className="flex items-center gap-2 bg-white/12 border border-white/20 rounded-full px-3.5 py-2 backdrop-blur-sm">
                  <span className="h-5 w-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow">{step.n}</span>
                  <span className="text-xs sm:text-sm font-medium text-white/90">{step.icon} {step.label}</span>
                </div>
                {i < 3 && (
                  <svg className="w-5 h-5 text-white/30 mx-1 hidden sm:block shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            ))}
          </motion.div>

          {/* Trusted brands */}
          <div className="mt-14">
            <p className="text-sm text-blue-200 mb-6">Trusted by teams at world-leading companies</p>
            <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-8">
              {[
                { name: 'HP',          style: 'font-black text-[15px] tracking-tight text-white/80'            },
                { name: 'SONY',        style: 'font-black text-[13px] tracking-[0.18em] text-white/80'         },
                { name: 'Stripe',      style: 'font-bold text-[15px] text-[#a5b4fc]'                           },
                { name: 'Revolut',     style: 'font-extrabold text-[14px] tracking-tight text-white/80'        },
                { name: 'Ramp',        style: 'font-black text-[15px] text-[#fca5a5]'                          },
                { name: 'Flexport',    style: 'font-bold text-[14px] tracking-wide text-white/70'              },
                { name: 'Freshworks',  style: 'font-bold text-[13px] text-[#86efac]'                           },
                { name: 'Lovable',     style: 'font-extrabold text-[14px] text-[#fda4af]'                      },
              ].map(co => (
                <span key={co.name}
                  className={`inline-flex items-center px-3 py-1 rounded-lg bg-white/8 border border-white/10 ${co.style}`}>
                  {co.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          STATS BAR
      ══════════════════════════════════════════ */}
      <section className="bg-white border-b border-gray-100 py-14">
        <div className="container">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { v: '30,000+', l: 'Active Users',       icon: '👥' },
              { v: '500M+',   l: 'Emails Delivered',   icon: '📧' },
              { v: '61%',     l: 'Avg Open Rate',       icon: '📈' },
              { v: '4.9/5',   l: 'G2 Rating',           icon: '⭐' },
            ].map(s => (
              <div key={s.l}
                className="flex flex-col items-center text-center bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <span className="text-2xl mb-2">{s.icon}</span>
                <p className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">{s.v}</p>
                <p className="mt-1.5 text-sm text-gray-500 font-medium">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          1. UNLIMITED SENDING ACCOUNTS — white bg
      ══════════════════════════════════════════ */}
      <section id="sending-accounts" className="bg-white py-24">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}>
            <SectionBadge icon="📨" label="Email Accounts" />
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">Add Unlimited Sending Accounts</h2>
            <p className="mt-4 text-gray-500 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              Connect Gmail, Outlook, and custom SMTP accounts — as many as you need.
              Rotate between senders automatically to stay under daily limits and
              protect your domain reputation.
            </p>
            <Link href="/signup"
              className="mt-6 inline-flex items-center bg-gray-900 text-white text-sm font-semibold rounded-full px-7 py-3 hover:bg-gray-700 transition-colors">
              Start For Free
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-12 mx-auto max-w-3xl rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5"
            style={{ background: 'linear-gradient(135deg,#1a3480 0%,#1d4ed8 45%,#3b82f6 100%)' }}>
            <div className="p-8 sm:p-10">
              <div className="bg-white rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-900">Email Accounts</p>
                  <button className="flex items-center gap-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700">
                    + Add Account
                  </button>
                </div>
                <div className="divide-y divide-gray-50">
                  {[
                    { email: 'alex@company.io',     provider: 'Gmail',   health: 98, status: 'Active',   sends: '142/200' },
                    { email: 'sarah@outreach.co',   provider: 'Outlook', health: 95, status: 'Active',   sends: '87/200'  },
                    { email: 'mike@growthco.com',   provider: 'Gmail',   health: 71, status: 'Warming',  sends: '30/50'   },
                    { email: 'leads@salesteam.io',  provider: 'SMTP',    health: 99, status: 'Active',   sends: '198/300' },
                    { email: 'outreach@scale.ai',   provider: 'Gmail',   health: 43, status: 'Warming',  sends: '12/30'   },
                  ].map(acc => (
                    <div key={acc.email} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50">
                      <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center shrink-0">
                        {acc.email[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{acc.email}</p>
                        <p className="text-xs text-gray-400">{acc.provider}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{
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
          2. EMAIL WARMUP — teal gradient
      ══════════════════════════════════════════ */}
      <section id="warmup" className="teal-gradient py-24">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}>
            <SectionBadge icon="🔥" label="Email Warmup" dark />
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">Land in the Inbox. Every Time.</h2>
            <p className="mt-4 text-blue-100 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              Our AI warmup network automatically builds your sender reputation by sending, opening,
              and replying to emails on your behalf — 24/7 in the background, before you launch
              a single campaign.
            </p>
            <Link href="/signup"
              className="mt-6 inline-flex items-center bg-gray-900 text-white text-sm font-semibold rounded-full px-7 py-3 hover:bg-gray-700 transition-colors">
              Start For Free
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
                    { l: 'Inbox Rate', v: '97.3%', color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
                    { l: 'Spam Rate',  v: '0.4%',  color: 'text-red-500',   bg: 'bg-red-50 border-red-100'   },
                    { l: 'Health Score', v: '98/100', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
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
                      background: `rgba(59,130,246,${0.25 + i * 0.025})`
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
          3. CAMPAIGN BUILDER — gray-50 bg
      ══════════════════════════════════════════ */}
      <section id="campaigns" className="bg-gray-50 py-24">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}>
            <SectionBadge icon="🚀" label="Campaigns" />
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">Launch Campaigns That Get Replies</h2>
            <p className="mt-4 text-gray-500 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              Build multi-step email sequences with AI personalisation, smart follow-ups,
              and inbox rotation. Schedule, A/B test, pause, or scale — all from one dashboard.
            </p>
            <Link href="/signup"
              className="mt-6 inline-flex items-center bg-gray-900 text-white text-sm font-semibold rounded-full px-7 py-3 hover:bg-gray-700 transition-colors">
              Start For Free
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
                    <span className="text-blue-600 text-base">⚡</span>
                    <p className="text-sm font-bold text-gray-900">Campaign: SaaS Founders Q3</p>
                  </div>
                  <div className="space-y-3">
                    {[
                      { step: 1, day: 'Day 1',  label: 'Initial Email',    open: '64%', reply: '—'   },
                      { step: 2, day: 'Day 3',  label: 'Follow-up #1',     open: '41%', reply: '—'   },
                      { step: 3, day: 'Day 7',  label: 'Follow-up #2',     open: '29%', reply: '—'   },
                      { step: 4, day: 'Day 14', label: 'Break-up Email',   open: '52%', reply: '18%' },
                    ].map(s => (
                      <div key={s.step} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
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
                        <span className="h-5 w-5 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">JD</span>
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
                        Hi John,<br/><br/>
                        I noticed Acme Corp just expanded into enterprise — congrats on the Series B!<br/><br/>
                        We help VP Sales teams like yours book 30-50 meetings/month through cold email without hiring more SDRs...
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button className="flex-1 bg-blue-600 text-white text-xs font-bold rounded-lg py-2 hover:bg-blue-700">Send Campaign</button>
                      <button className="border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg px-3 py-2 hover:bg-gray-50">✨ Rewrite</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          4. UNIBOX — white bg (visual break from gray)
      ══════════════════════════════════════════ */}
      <section id="unibox" className="bg-white py-24">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}>
            <SectionBadge icon="📥" label="Unibox" />
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">Every Reply. One Smart Inbox.</h2>
            <p className="mt-4 text-gray-500 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              Stop switching between 20 different email accounts. LeadGenie&apos;s Unibox pulls every
              reply into one place — filter by campaign, label by intent, assign to teammates,
              and close deals faster.
            </p>
            <Link href="/signup"
              className="mt-6 inline-flex items-center bg-gray-900 text-white text-sm font-semibold rounded-full px-7 py-3 hover:bg-gray-700 transition-colors">
              Start For Free
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
                    <span className="text-xs font-bold bg-blue-600 text-white rounded-full px-2 py-0.5">12 new</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {['All', 'Interested', 'Not Now', 'Do Not Contact'].map((f, i) => (
                      <button key={f} className={`text-[11px] font-semibold rounded-full px-2.5 py-1 transition-colors ${
                        i === 0 ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                      }`}>{f}</button>
                    ))}
                  </div>
                </div>
                {/* Emails */}
                {[
                  { from: 'Sarah Chen', co: 'Stripe', time: '2m', preview: 'Hi, this looks interesting! Can we schedule a...', tag: 'Interested',   tagColor: 'bg-green-100 text-green-700',  read: false },
                  { from: 'James Park', co: 'Notion', time: '14m', preview: "Sure, let's chat. What times work for you this...", tag: 'Meeting Set',  tagColor: 'bg-blue-100 text-blue-700',   read: false },
                  { from: 'Lena Wolf', co: 'Linear', time: '1h',  preview: 'We actually just signed with another vendor, but...', tag: 'Not Now',     tagColor: 'bg-yellow-100 text-yellow-700', read: true },
                  { from: 'Tom Reid',  co: 'Vercel', time: '3h',  preview: "Thanks for reaching out — we're open to exploring...", tag: 'Interested',tagColor: 'bg-green-100 text-green-700',  read: true },
                  { from: 'Amy Tran',  co: 'Figma',  time: '5h',  preview: 'Could you send over more info about pricing and...', tag: 'Needs Info',  tagColor: 'bg-purple-100 text-purple-700', read: true },
                ].map(mail => (
                  <div key={mail.from} className={`flex items-center gap-4 px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer ${!mail.read ? 'bg-blue-50/30' : ''}`}>
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {mail.from.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-semibold text-gray-900 ${!mail.read ? 'font-bold' : ''}`}>{mail.from}</span>
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
          5. ANALYTICS & TRACKING — teal gradient
      ══════════════════════════════════════════ */}
      <section id="analytics" className="teal-gradient py-24">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}>
            <SectionBadge icon="📊" label="Analytics" dark />
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">Know Exactly What&apos;s Working</h2>
            <p className="mt-4 text-blue-100 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              Track opens, clicks, replies, bounces, and unsubscribes in real-time. See which
              subject lines, templates, and follow-up steps drive the most meetings booked —
              then double down on what works.
            </p>
            <Link href="/signup"
              className="mt-6 inline-flex items-center bg-gray-900 text-white text-sm font-semibold rounded-full px-7 py-3 hover:bg-gray-700 transition-colors">
              Start For Free
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
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />Live
              </span>
            </div>
            <div className="p-6">
              {/* Metric cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { l: 'Sent',       v: '12,840', sub: '+2,400 this week', color: 'text-gray-900'  },
                  { l: 'Opened',     v: '61.3%',  sub: '+8.2% vs last run', color: 'text-blue-600' },
                  { l: 'Clicked',    v: '14.7%',  sub: '+3.1% vs last run', color: 'text-indigo-600'},
                  { l: 'Replied',    v: '18.4%',  sub: '2,363 replies',     color: 'text-green-600' },
                ].map(m => (
                  <div key={m.l} className="bg-gray-50 border border-gray-100 rounded-xl p-3.5 text-center">
                    <p className={`text-xl font-extrabold ${m.color}`}>{m.v}</p>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">{m.l}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{m.sub}</p>
                  </div>
                ))}
              </div>
              {/* Chart */}
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 text-left">Open Rate Trend</p>
              <div className="h-32 flex items-end gap-1.5">
                {[38,42,45,48,44,52,55,51,58,60,56,63,61,65,62,67,64,69,66,71,68,72,70,74,72,75,73,77,75,78].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-sm"
                    style={{ height: `${h}%`, background: `rgba(59,130,246,${0.25 + i * 0.025})` }} />
                ))}
              </div>
              {/* Recent activity */}
              <div className="mt-5 border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 text-left">Live Activity</p>
                {[
                  { event: '✉️ Email opened',   who: 'Sarah Chen · Stripe', time: '2s ago'  },
                  { event: '🔗 Link clicked',   who: 'James Park · Notion', time: '47s ago' },
                  { event: '💬 Reply received', who: 'Lena Wolf · Linear',  time: '3m ago'  },
                  { event: '✉️ Email opened',   who: 'Tom Reid · Vercel',   time: '5m ago'  },
                ].map(a => (
                  <div key={a.who} className="flex items-center justify-between py-2 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{a.event.split(' ')[0]}</span>
                      <span className="text-xs text-gray-600 font-medium">{a.event.substring(2)}</span>
                      <span className="text-xs text-gray-400">— {a.who}</span>
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
          6. AI WORKFLOWS — gray-50
      ══════════════════════════════════════════ */}
      <section id="workflows" className="bg-gray-50 py-24">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}>
            <SectionBadge icon="🤖" label="AI Workflows" />
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">AI Workflows</h2>
            <p className="mt-3 text-sm font-medium text-blue-600">
              Set it once, and LeadGenie handles the follow-ups for you automatically.
            </p>
            <p className="mt-3 text-gray-500 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              When a lead opens your email, clicks a link, or books a meeting — LeadGenie
              automatically routes them, tags their intent, and triggers the right next-step
              campaign. No manual work. No missed follow-ups.
            </p>
            <Link href="/signup"
              className="mt-6 inline-flex items-center bg-gray-900 text-white text-sm font-semibold rounded-full px-7 py-3 hover:bg-gray-700 transition-colors">
              Start For Free
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-12 max-w-2xl mx-auto bg-white rounded-2xl shadow-xl ring-1 ring-black/5 border border-gray-100 p-6 sm:p-8 text-left">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Add a trigger</h3>
            <p className="text-sm text-gray-500 mb-5">Select a trigger that will initiate the action</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Leads</p>
                <div className="space-y-2">
                  {[{ l: 'Calendly',   e: '📅' }, { l: 'Hubspot',    e: '🟠' }, { l: 'SalesForce', e: '☁️' }].map(t => (
                    <button key={t.l} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm text-gray-700">
                      <span className="h-7 w-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm">{t.e}</span>{t.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Wait for Effect</p>
                <div className="space-y-2">
                  {[{ l: 'LeadGenie', e: '⚡' }, { l: 'Schedule', e: '🕐' }, { l: 'Notion', e: '📝' }].map(t => (
                    <button key={t.l} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm text-gray-700">
                      <span className="h-7 w-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm">{t.e}</span>{t.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          7. CONNECT YOUR TOOLS — white bg
      ══════════════════════════════════════════ */}
      <section id="integrations" className="bg-white py-24">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}>
            <SectionBadge icon="🔗" label="Integrations" />
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">Connect Your Tools</h2>
            <p className="mt-4 text-gray-600 text-base sm:text-lg max-w-lg mx-auto">
              LeadGenie works perfectly with <span className="underline underline-offset-2 font-semibold">all</span> the products you&apos;re already using.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 bg-green-50 border border-green-100 rounded-full px-4 py-1.5 text-sm font-semibold text-green-700">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Works with 5,000+ tools via Zapier
            </div>
            <div className="mt-4">
              <Link href="/signup"
                className="inline-flex items-center bg-gray-900 text-white text-sm font-semibold rounded-full px-7 py-3 hover:bg-gray-700 transition-colors">
                Start For Free
              </Link>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-12 mx-auto max-w-3xl rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5"
            style={{ background: 'linear-gradient(135deg,#5b21b6 0%,#4338ca 48%,#1d4ed8 100%)' }}>
            <div className="p-8 sm:p-10">
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { name: 'Zapier',          icon: '⚡', desc: 'Connect LeadGenie to 5,000+ apps and automate your entire outreach stack.',           btn: 'Copy API Key' },
                  { name: 'Slack',           icon: '💬', desc: 'Get instant notifications the moment a prospect replies, opens, or books a meeting.', btn: 'Manage'       },
                  { name: 'Google Calendar', icon: '📅', desc: 'Automatically sync booked meetings to your calendar and trigger follow-up campaigns.', btn: 'Connect'      },
                  { name: 'OpenAI',          icon: '🤖', desc: 'Leverage GPT-4 to write hyper-personalised cold emails at scale, in seconds.',        btn: 'Add'          },
                ].map(item => (
                  <div key={item.name} className="bg-white rounded-2xl p-5 text-left shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{item.icon}</span>
                      <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed mb-4">{item.desc}</p>
                    <button className="bg-blue-600 text-white text-xs font-semibold rounded-lg px-4 py-2 hover:bg-blue-700 transition-colors">{item.btn}</button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          8. CUSTOMER TESTIMONIALS — light gray bg
      ══════════════════════════════════════════ */}
      <section className="bg-gray-50 py-24">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}>
            <SectionBadge icon="⭐" label="Testimonials" />
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">Customer Testimonials</h2>
            <p className="mt-3 text-gray-400 text-base">Real Results. Real Customers.</p>
          </motion.div>

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto text-left">
            {testimonials.map((t, idx) => (
              <motion.div key={t.name}
                initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="bg-white rounded-2xl p-7 flex flex-col justify-between border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div>
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
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
          9. CTA — blue gradient (matches Instantly)
      ══════════════════════════════════════════ */}
      <section className="cta-gradient py-24">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
              Start Booking Meetings
              <br />
              <span className="inline-flex items-center gap-2 justify-center">
                This Week —{' '}
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/20 border border-white/30 text-lg">⚡</span>
                {' '}Free
              </span>
            </h2>
            <p className="mt-4 text-blue-200 text-base max-w-sm mx-auto">
              No credit card required. Get set up in minutes and launch your first campaign today.
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
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

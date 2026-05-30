'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const companies = ['HP', 'SONY', 'X', 'stripe', 'Lovable', 'flexport', 'ramp ↗', 'Revolut', 'freshworks'];

const testimonials = [
  {
    quote: "We've tested a lot of sequencers & ultimately LeadGenie has been the most helpful in generating revenue for our clients. It has all the functionality any advanced cold email initiative needs, while still being easy to use.",
    name: 'Mike Ellis', role: 'Co-Founder, Kale Acquisition', company: 'kale', initials: 'ME', color: 'bg-green-600',
  },
  {
    quote: "LeadGenie became the backbone of our outreach — over 100,000 emails sent across 20+ domains with 20%+ reply rates and a steady stream of qualified leads. It's not just a sending tool, it's our growth engine.",
    name: 'Briken Bufi', role: 'CEO & Co-Founder of Aella Creative Force', company: 'AELLA', initials: 'BB', color: 'bg-blue-600',
  },
  {
    quote: "LeadGenie nails what others get wrong — it's actually intuitive to use. The integrations are seamless, the UX doesn't make you want to pull your hair out.",
    name: 'Alex Baldovin', role: 'CEO, Authbound', company: 'Authbound', initials: 'AB', color: 'bg-purple-600',
  },
];

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [tIdx, setTIdx] = useState(0);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />

      {/* ════════════════════════════════════════
          1. HERO — blue gradient, centered
      ════════════════════════════════════════ */}
      <section className="hero-gradient pb-16 pt-16">
        <div className="container text-center">

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="text-4xl sm:text-5xl lg:text-[56px] font-bold text-white leading-tight">
            Find Clients{' '}
            <span className="inline-flex items-center justify-center h-11 w-11 sm:h-13 sm:w-13 rounded-full bg-blue-700 border-2 border-white/30 text-2xl align-middle mx-1">⚡</span>{' '}
            Instantly
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-3 text-base sm:text-lg text-blue-100">
            Get more clients by chatting to AI
          </motion.p>

          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 mx-auto max-w-[560px]">
            <div className="flex items-center bg-white rounded-full shadow-lg px-5 py-3 gap-3">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Ask Co-pilot to Find What's Driving the Market..."
                className="flex-1 text-sm text-gray-700 outline-none bg-transparent placeholder:text-gray-400" />
              <button className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </motion.div>

          {/* Pill suggestions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {['Create Sales Agent', 'Create Reply Agent', 'Find Leads'].map(label => (
              <button key={label}
                className="text-xs sm:text-sm text-gray-700 bg-white/90 hover:bg-white border border-gray-200 rounded-full px-4 py-1.5 transition-colors shadow-sm">
                {label}
              </button>
            ))}
          </motion.div>

          {/* Logos */}
          <div className="mt-12">
            <p className="text-sm text-blue-200 mb-5">Used by the world's leading companies</p>
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
              {companies.map(co => (
                <span key={co} className="text-sm font-semibold text-white/70 tracking-wide">{co}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          2. REACH CLIENTS ON AUTOPILOT — white bg, centered
      ════════════════════════════════════════ */}
      <section className="bg-white py-24">
        <div className="container text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">Reach Clients On Autopilot</h2>
            <p className="mt-4 text-gray-500 text-base sm:text-lg max-w-lg mx-auto">
              Use LeadGenie AI to find perfect leads, create AI Sales Agents and automate your outreach &amp; sales.
            </p>
            <Link href="/signup"
              className="mt-6 inline-flex items-center bg-gray-900 text-white text-sm font-semibold rounded-full px-7 py-3 hover:bg-gray-700 transition-colors">
              Start For Free
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-12 mx-auto max-w-3xl rounded-3xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg,#1d4ed8 0%,#3b82f6 50%,#93c5fd 100%)' }}>
            <div className="p-8 sm:p-10">
              <div className="grid md:grid-cols-2 gap-5 text-left">
                {/* Leads Finder sidebar */}
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Leads Finder</p>
                  <div className="space-y-1.5">
                    {['By Profile', 'By Location', 'Job Title', 'Industry', 'Company Size'].map(f => (
                      <div key={f} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer">
                        <span className="h-3.5 w-3.5 rounded-full border-2 border-blue-400 bg-blue-100 shrink-0" />
                        <span className="text-sm text-gray-700">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* AI card */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-6 flex flex-col items-center justify-center text-white text-center">
                  <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center mb-4 text-3xl">⚡</div>
                  <p className="font-bold text-lg">Start Your Search With LeadGenie AI</p>
                  <p className="text-blue-100 text-sm mt-2">Find your ideal customers in seconds</p>
                  <button className="mt-5 bg-white text-blue-700 font-semibold text-sm rounded-full px-6 py-2.5 hover:bg-blue-50 transition-colors">
                    Search Now →
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          3. AUTOMATE YOUR OUTREACH — teal gradient, centered
      ════════════════════════════════════════ */}
      <section className="teal-gradient py-24">
        <div className="container text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">Automate Your Outreach</h2>
            <p className="mt-4 text-blue-100 text-base sm:text-lg max-w-lg mx-auto">
              Create &amp; Launch campaigns in minutes. Let LeadGenie AI craft and personalise outreach at scale.
            </p>
            <Link href="/signup"
              className="mt-6 inline-flex items-center bg-gray-900 text-white text-sm font-semibold rounded-full px-7 py-3 hover:bg-gray-700 transition-colors">
              Start For Free
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-12 grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {/* AI Campaign card */}
            <div className="bg-white rounded-2xl p-5 shadow-lg text-left">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-blue-600 text-lg">⚡</span>
                <p className="text-sm font-semibold text-gray-800">LeadGenie AI</p>
              </div>
              <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide">Active Campaign</p>
              {['Warm up your Email Domain', 'Personalise at scale with AI', 'Track replies automatically', 'Auto follow-up sequences'].map((step, i) => (
                <div key={step} className="flex items-start gap-2 mb-2.5">
                  <span className="mt-0.5 h-5 w-5 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                  <p className="text-sm text-gray-700">{step}</p>
                </div>
              ))}
            </div>
            {/* Lead Finder card */}
            <div className="bg-white rounded-2xl p-5 shadow-lg text-left">
              <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide">LeadGenie Lead Finder</p>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Company</p>
                  <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
                    <span>⚡</span><span>LeadGenie</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Lead Type Search</p>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none" placeholder="Company Marketers..." readOnly />
                </div>
                <button className="w-full bg-blue-600 text-white text-sm font-semibold rounded-lg py-2.5 hover:bg-blue-700 transition-colors">
                  Find Leads
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          4. AI WORKFLOWS — white/gray bg, centered
      ════════════════════════════════════════ */}
      <section className="bg-gray-50 py-24">
        <div className="container text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">AI Workflows</h2>
            <p className="mt-4 text-gray-500 text-base sm:text-lg max-w-xl mx-auto">
              Workflows that just work. When a lead visits your site, replies, or books a meeting, LeadGenie automatically routes them, tags them, and triggers next-step campaigns — no manual setup needed.
            </p>
            <Link href="/signup"
              className="mt-6 inline-flex items-center bg-gray-900 text-white text-sm font-semibold rounded-full px-7 py-3 hover:bg-gray-700 transition-colors">
              Start For Free
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-12 max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 text-left">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-sm text-gray-400">Search...</p>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1 mt-3">Add a trigger</h3>
            <p className="text-sm text-gray-500 mb-5">Select a trigger that will initiate the action</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Leads</p>
                <div className="space-y-2">
                  {[{ l: 'Calendly', e: '📅' }, { l: 'Hubspot', e: '🟠' }, { l: 'SalesForce', e: '☁️' }].map(t => (
                    <button key={t.l}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm text-gray-700">
                      <span className="h-7 w-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm">{t.e}</span>
                      {t.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Wait for Effect</p>
                <div className="space-y-2">
                  {[{ l: 'LeadGenie', e: '⚡' }, { l: 'Schedule', e: '🕐' }, { l: 'Notion', e: '📝' }].map(t => (
                    <button key={t.l}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm text-gray-700">
                      <span className="h-7 w-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm">{t.e}</span>
                      {t.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          5. CONNECT YOUR TOOLS — purple gradient, centered
      ════════════════════════════════════════ */}
      <section className="bg-gray-50 py-24">
        <div className="container text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">Connect Your Tools</h2>
            <p className="mt-4 text-gray-600 text-base sm:text-lg max-w-lg mx-auto">
              LeadGenie works perfectly with <span className="underline underline-offset-2 font-semibold">all</span> the products you&apos;re already using.
            </p>
            <Link href="/signup"
              className="mt-6 inline-flex items-center bg-gray-900 text-white text-sm font-semibold rounded-full px-7 py-3 hover:bg-gray-700 transition-colors">
              Start For Free
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-12 mx-auto max-w-3xl rounded-3xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg,#5b21b6 0%,#4338ca 45%,#2563eb 100%)' }}>
            <div className="p-8 sm:p-10">
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { name: 'Zapier',           icon: '⚡', desc: 'Our Zapier integration helps you connect your LeadGenie workspace to thousands of apps and services.', btn: 'Copy API Key' },
                  { name: 'Slack',            icon: '💬', desc: 'The Slack integration lets you receive notifications when on activity occurs in your LeadGenie workspace.', btn: 'Manage' },
                  { name: 'Google Calendar',  icon: '📅', desc: 'The Google Calendar integration allows you to schedule meetings directly from LeadGenie.', btn: 'Connect' },
                  { name: 'OpenAI',           icon: '🤖', desc: 'The OpenAI integration allows you to leverage the capabilities of GPT models for automatic email responses and content generation.', btn: 'Add' },
                ].map(item => (
                  <div key={item.name} className="bg-white rounded-2xl p-5 text-left shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{item.icon}</span>
                      <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed mb-4">{item.desc}</p>
                    <button className="bg-blue-600 text-white text-xs font-semibold rounded-lg px-4 py-2 hover:bg-blue-700 transition-colors">
                      {item.btn}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          6. OPTIMIZED FOR REVENUE — teal gradient, centered
      ════════════════════════════════════════ */}
      <section className="teal-gradient py-24">
        <div className="container text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">Optimized For Revenue</h2>
            <p className="mt-4 text-blue-100 text-base sm:text-lg max-w-2xl mx-auto">
              Track campaign performance beyond vanity metrics with Opportunities, Pipeline, Conversions, and Revenue. Automatically pause the campaigns that need work and scale the ones that drive real business growth.
            </p>
            <Link href="/signup"
              className="mt-6 inline-flex items-center bg-gray-900 text-white text-sm font-semibold rounded-full px-7 py-3 hover:bg-gray-700 transition-colors">
              Start For Free
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-12 max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Overall Result</p>
                <p className="text-xs text-gray-400 mt-0.5">Campaign analytics</p>
              </div>
              <span className="text-xs font-semibold bg-green-100 text-green-700 rounded-full px-3 py-1 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />Live
              </span>
            </div>
            <div className="p-5">
              <div className="h-40 relative flex items-end gap-1">
                {[30, 45, 38, 55, 48, 62, 58, 72, 65, 80, 75, 90].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-lg"
                    style={{ height: `${h}%`, background: i % 3 === 0 ? '#3b82f6' : i % 3 === 1 ? '#60a5fa' : '#93c5fd', opacity: 0.7 + i * 0.02 }} />
                ))}
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                {[{ label: 'Email Accounts', value: '24' }, { label: 'Emails Sent', value: '122k' }, { label: 'Reply Rate', value: '18.4%' }].map(s => (
                  <div key={s.label}>
                    <p className="text-xl font-bold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          7. CUSTOMER TESTIMONIALS — light gray bg
      ════════════════════════════════════════ */}
      <section className="bg-gray-50 py-24">
        <div className="container text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">Customer Testimonials</h2>
            <p className="mt-3 text-gray-400 text-base">Real Results. Real Customers.</p>
          </motion.div>

          {/* 3-card slider (show 2 cards, 3rd partially visible hint) */}
          <div className="mt-12 grid sm:grid-cols-2 gap-5 max-w-4xl mx-auto text-left">
            {[testimonials[tIdx % 3], testimonials[(tIdx + 1) % 3]].map(t => (
              <motion.div key={t.name}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
                className="bg-white rounded-2xl p-7 flex flex-col justify-between border border-gray-200 shadow-sm">
                <p className="text-gray-800 text-base leading-relaxed flex-1">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full ${t.color} text-white flex items-center justify-center text-sm font-bold shrink-0`}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                  <span className="ml-auto text-sm font-bold text-gray-400 italic">{t.company}</span>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={() => setTIdx(i => (i - 1 + 3) % 3)}
              className="h-10 w-10 rounded-full border border-gray-300 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-600 text-xl shadow-sm">
              ‹
            </button>
            <button
              onClick={() => setTIdx(i => (i + 1) % 3)}
              className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors text-xl shadow-sm">
              ›
            </button>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          8. CTA — blue gradient (like hero)
      ════════════════════════════════════════ */}
      <section className="cta-gradient py-24">
        <div className="container text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
              Unlock The Power Of AI
              <br />
              <span className="inline-flex items-center gap-2">
                With{' '}
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/20 border border-white/30 text-lg">⚡</span>
                {' '}LeadGenie
              </span>
            </h2>
            <p className="mt-4 text-blue-200 text-base max-w-sm mx-auto">
              Get started now to access exclusive templates and elevate your projects to the next level.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/signup"
                className="bg-gray-900 text-white text-sm font-semibold rounded-full px-7 py-3 hover:bg-gray-700 transition-colors">
                Get Started
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

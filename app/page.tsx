'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const companies = ['HP', 'SONY', 'Stripe', 'Lovable', 'Flexport', 'Ramp', 'Revolut', 'Freshworks'];

const testimonials = [
  {
    quote: "We've tested a lot of sequencers & ultimately LeadGenie has been the most helpful in generating revenue for our clients. It has all the functionality any advanced cold email initiative needs, while still being easy to use.",
    name: 'Mike Ellis',
    role: 'Co-Founder, Kale Acquisition',
    company: 'Kale',
    initials: 'ME',
  },
  {
    quote: "LeadGenie became the backbone of our outreach — over 100,000 emails sent across 20+ domains with 20%+ reply rates and a steady stream of qualified leads. It's not just a sending tool, it's our growth engine.",
    name: 'Briken Bufi',
    role: 'CEO & Co-Founder, Aella Creative Force',
    company: 'AELLA',
    initials: 'BB',
  },
  {
    quote: "LeadGenie nails what others get wrong — it's actually intuitive to use. The integrations are seamless, the UX doesn't make you want to pull your hair out.",
    name: 'Alex Baldovin',
    role: 'CEO, Authbound',
    company: 'Authbound',
    initials: 'AB',
  },
];

const integrations = [
  { name: 'Zapier', desc: 'Connect LeadGenie to thousands of apps and services.', icon: '⚡', color: 'bg-orange-50 text-orange-500', btn: 'Copy API Key' },
  { name: 'Slack', desc: 'Receive notifications when activity occurs in your workspace.', icon: '#', color: 'bg-purple-50 text-purple-600', btn: 'Manage' },
  { name: 'Google Calendar', desc: 'Schedule meetings directly from LeadGenie campaigns.', icon: '📅', color: 'bg-blue-50 text-blue-500', btn: 'Connect' },
  { name: 'OpenAI', desc: 'Leverage GPT models for automatic email responses and content generation.', icon: '🤖', color: 'bg-gray-100 text-gray-800', btn: 'Add' },
];

const features = [
  { icon: '🎯', title: 'AI Lead Finder', desc: 'Find verified contacts by role, industry, company size, and more.' },
  { icon: '✉️', title: 'Smart Sequences', desc: 'Auto-personalize every email with AI — at any scale.' },
  { icon: '🔥', title: 'Email Warmup', desc: 'Land in the inbox, not spam. Warmup runs in the background 24/7.' },
  { icon: '📊', title: 'Revenue Analytics', desc: 'Track opens, replies, meetings booked, and pipeline generated.' },
  { icon: '🤖', title: 'AI Reply Agent', desc: 'Let AI handle replies, book meetings, and qualify leads automatically.' },
  { icon: '🔗', title: 'Native Integrations', desc: 'Connect with HubSpot, Salesforce, Slack, Zapier, and more.' },
];

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  const visibleTestimonials = [
    testimonials[testimonialIndex % testimonials.length],
    testimonials[(testimonialIndex + 1) % testimonials.length],
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>

        {/* ── HERO ── */}
        <section className="hero-dark pt-32 pb-0">
          <div className="container text-center relative z-10">

            {/* Announcement badge */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8 flex justify-center"
            >
              <Link
                href="/signup"
                className="inline-flex items-center gap-2.5 bg-white/8 hover:bg-white/12 border border-white/10 rounded-full px-4 py-2 transition-all group"
              >
                <span className="text-[10px] font-bold bg-blue-500 text-white rounded-full px-2 py-0.5 tracking-wide">
                  NEW
                </span>
                <span className="text-xs text-white/75 font-medium group-hover:text-white transition-colors">
                  AI Reply Agent is now live — automate your inbox
                </span>
                <svg className="w-3.5 h-3.5 text-white/40 group-hover:text-white/70 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65 }}
              className="text-5xl sm:text-6xl lg:text-[80px] font-extrabold text-white leading-[1.05] tracking-tight"
            >
              Find &amp; Close Clients
              <br />
              <span className="gradient-text">On Autopilot</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="mt-6 text-base sm:text-lg text-white/55 max-w-xl mx-auto leading-relaxed"
            >
              LeadGenie finds your ideal prospects, writes personalised outreach, and books
              meetings — while you focus on closing.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.22 }}
              className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-full px-8 py-3.5 transition-all shadow-lg shadow-blue-900/40 hover:shadow-blue-800/60 hover:-translate-y-px"
              >
                Start For Free
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 border border-white/15 text-white/80 hover:text-white hover:border-white/30 font-medium text-sm rounded-full px-8 py-3.5 transition-all hover:bg-white/5"
              >
                Sign In
              </Link>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="mt-4 text-xs text-white/30"
            >
              No credit card required · Free plan · Setup in 2 minutes
            </motion.p>

            {/* Product mockup */}
            <motion.div
              initial={{ opacity: 0, y: 48 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-16 relative mx-auto max-w-5xl"
            >
              {/* Glow */}
              <div className="absolute -inset-4 bg-blue-600/15 blur-3xl rounded-3xl pointer-events-none" />

              {/* Browser frame */}
              <div className="relative rounded-2xl overflow-hidden border border-white/10 glow-card">
                {/* Browser chrome */}
                <div className="flex items-center gap-3 px-5 py-3 bg-[#0d1117] border-b border-white/8">
                  <div className="flex gap-1.5 shrink-0">
                    <span className="h-3 w-3 rounded-full bg-red-500/60" />
                    <span className="h-3 w-3 rounded-full bg-yellow-500/60" />
                    <span className="h-3 w-3 rounded-full bg-green-500/60" />
                  </div>
                  <div className="flex-1 bg-white/6 rounded-md px-4 py-1.5 max-w-xs mx-auto flex items-center gap-2">
                    <svg className="w-3 h-3 text-white/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-xs text-white/30">app.leadgenie.io/dashboard</span>
                  </div>
                </div>

                {/* App UI */}
                <div className="bg-[#0a0d16] flex" style={{ minHeight: 340 }}>
                  {/* Sidebar */}
                  <div className="w-52 border-r border-white/6 bg-[#070912] p-3 hidden sm:flex flex-col gap-1">
                    <div className="flex items-center gap-2 px-3 py-2 mb-2">
                      <span className="h-6 w-6 rounded-md bg-blue-600 flex items-center justify-center text-xs text-white font-bold">⚡</span>
                      <span className="text-sm font-semibold text-white">LeadGenie</span>
                    </div>
                    {[
                      { icon: '📊', label: 'Dashboard', active: true },
                      { icon: '📧', label: 'Campaigns', active: false },
                      { icon: '👥', label: 'Leads', active: false },
                      { icon: '🤖', label: 'AI Agents', active: false },
                      { icon: '📥', label: 'Inbox', active: false },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs cursor-default ${
                          item.active
                            ? 'bg-blue-600/20 text-blue-300'
                            : 'text-white/40'
                        }`}
                      >
                        <span>{item.icon}</span>
                        {item.label}
                      </div>
                    ))}
                  </div>

                  {/* Main content */}
                  <div className="flex-1 p-5 overflow-hidden">
                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3 mb-5">
                      {[
                        { label: 'Emails Sent', value: '48,290', up: '+12%' },
                        { label: 'Reply Rate', value: '18.4%', up: '+2.1%' },
                        { label: 'Leads Found', value: '3,812', up: '+820' },
                      ].map((s) => (
                        <div key={s.label} className="bg-white/4 border border-white/6 rounded-xl p-3">
                          <p className="text-[10px] text-white/40 mb-1">{s.label}</p>
                          <p className="text-lg font-bold text-white">{s.value}</p>
                          <p className="text-[10px] text-green-400 font-medium">{s.up}</p>
                        </div>
                      ))}
                    </div>

                    {/* Mini table */}
                    <div className="bg-white/3 border border-white/6 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/6">
                        <span className="text-xs font-semibold text-white/70">Active Campaigns</span>
                        <span className="text-[10px] text-blue-400">View all →</span>
                      </div>
                      {[
                        { name: 'SaaS Founders Outreach', status: 'Active', rate: '11.0%' },
                        { name: 'E-commerce Decision Makers', status: 'Active', rate: '19.3%' },
                        { name: 'B2B Tech CTOs', status: 'Active', rate: '20.0%' },
                      ].map((row) => (
                        <div key={row.name} className="flex items-center justify-between px-4 py-2.5 border-b border-white/4 last:border-0">
                          <span className="text-xs text-white/60">{row.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-[10px] text-green-400 font-medium">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                              {row.status}
                            </span>
                            <span className="text-xs font-semibold text-blue-400">{row.rate}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── SOCIAL PROOF ── */}
        <section className="bg-white pt-20 pb-16">
          <div className="container">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center mb-14">
              {[
                { value: '30,000+', label: 'Companies' },
                { value: '500M+', label: 'Emails Sent' },
                { value: '18%', label: 'Avg Reply Rate' },
                { value: '4.9 / 5', label: 'Customer Rating' },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-3xl sm:text-4xl font-bold text-gray-900">{stat.value}</p>
                  <p className="mt-1.5 text-sm text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Logos */}
            <div className="border-t border-gray-100 pt-10 text-center">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-7">
                Trusted by teams at
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
                {companies.map((co) => (
                  <span key={co} className="text-sm font-bold text-gray-300 tracking-wide hover:text-gray-500 transition-colors cursor-default">
                    {co}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURES GRID ── */}
        <section className="bg-gray-50 py-24">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-14"
            >
              <span className="inline-block text-xs font-semibold text-blue-600 bg-blue-50 rounded-full px-3 py-1 mb-4 uppercase tracking-wider">
                Everything You Need
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
                One platform.<br />Unlimited growth.
              </h2>
              <p className="mt-4 text-gray-500 text-base sm:text-lg max-w-lg mx-auto">
                Every tool your outreach team needs — in one fast, AI-powered workspace.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: i * 0.07 }}
                  className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <div className="h-11 w-11 rounded-xl bg-blue-50 flex items-center justify-center text-xl mb-4">
                    {f.icon}
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── REACH CLIENTS ON AUTOPILOT ── */}
        <section className="bg-white py-24">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6 }}
              >
                <span className="inline-block text-xs font-semibold text-blue-600 bg-blue-50 rounded-full px-3 py-1 mb-5 uppercase tracking-wider">
                  Lead Generation
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                  Reach Clients<br />On Autopilot
                </h2>
                <p className="mt-5 text-gray-500 text-base sm:text-lg leading-relaxed">
                  Use LeadGenie AI to find perfect leads, create AI Sales Agents and automate your outreach &amp; sales with zero manual effort.
                </p>
                <ul className="mt-6 space-y-3">
                  {['Find verified leads by role, company, and industry', 'AI writes personalised emails for each prospect', 'Auto follow-ups and reply detection', 'Book meetings directly into your calendar'].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-gray-600">
                      <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="mt-8 inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold rounded-full px-6 py-3 hover:bg-gray-800 transition-colors"
                >
                  Start For Free
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="rounded-3xl overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 p-6 sm:p-8 shadow-lg"
              >
                <div className="grid gap-4">
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Leads Finder</p>
                    <div className="space-y-2">
                      {['By Profile', 'By Location', 'Job Title', 'Industry', 'Company Size'].map((filter) => (
                        <div key={filter} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer">
                          <span className="h-3.5 w-3.5 rounded-full border-2 border-blue-400 bg-blue-100" />
                          <span className="text-sm text-gray-700">{filter}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white text-center">
                    <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center mb-3 text-2xl mx-auto">⚡</div>
                    <p className="font-bold text-base">Start With LeadGenie AI</p>
                    <p className="text-blue-100 text-xs mt-1 mb-4">Find ideal customers in seconds</p>
                    <button className="bg-white text-blue-700 font-semibold text-sm rounded-full px-6 py-2 hover:bg-blue-50 transition-colors">
                      Search Now →
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── AUTOMATE YOUR OUTREACH ── */}
        <section className="teal-gradient py-24">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.7 }}
                className="grid sm:grid-cols-2 gap-4"
              >
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
                <div className="bg-white rounded-2xl p-5 shadow-lg text-left">
                  <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide">Lead Finder</p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Company</p>
                      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
                        <span>⚡</span><span>LeadGenie</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Lead Type</p>
                      <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none" placeholder="Company Marketers…" readOnly />
                    </div>
                    <button className="w-full bg-blue-600 text-white text-sm font-semibold rounded-lg py-2.5 hover:bg-blue-700 transition-colors">
                      Find Leads
                    </button>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6 }}
              >
                <span className="inline-block text-xs font-semibold text-white/60 bg-white/10 rounded-full px-3 py-1 mb-5 uppercase tracking-wider">
                  Outreach Automation
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
                  Automate Your Outreach
                </h2>
                <p className="mt-5 text-blue-100 text-base sm:text-lg leading-relaxed">
                  Create &amp; launch campaigns in minutes. Let LeadGenie AI craft and personalise outreach at any scale — then handle the replies too.
                </p>
                <Link
                  href="/signup"
                  className="mt-8 inline-flex items-center gap-2 bg-white text-blue-700 font-semibold text-sm rounded-full px-6 py-3 hover:bg-blue-50 transition-colors"
                >
                  Start For Free
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── AI WORKFLOWS ── */}
        <section className="bg-gray-50 py-24">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6 }}
              >
                <span className="inline-block text-xs font-semibold text-blue-600 bg-blue-50 rounded-full px-3 py-1 mb-5 uppercase tracking-wider">
                  Automation
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                  AI Workflows That Just Work
                </h2>
                <p className="mt-5 text-gray-500 text-base sm:text-lg leading-relaxed">
                  When a lead visits your site, replies, or books a meeting — LeadGenie automatically routes them, tags them, and triggers the next step. No manual setup needed.
                </p>
                <Link
                  href="/signup"
                  className="mt-8 inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold rounded-full px-6 py-3 hover:bg-gray-800 transition-colors"
                >
                  Start For Free
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-1">Add a trigger</h3>
                <p className="text-sm text-gray-500 mb-6">Select a trigger that will initiate the action</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Leads</p>
                    <div className="space-y-2">
                      {[{ label: 'Calendly', emoji: '📅' }, { label: 'Hubspot', emoji: '🟠' }, { label: 'SalesForce', emoji: '☁️' }].map((tool) => (
                        <button
                          key={tool.label}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm text-gray-700"
                        >
                          <span className="h-7 w-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm">{tool.emoji}</span>
                          {tool.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Wait for Effect</p>
                    <div className="space-y-2">
                      {[{ label: 'LeadGenie', emoji: '⚡' }, { label: 'Schedule', emoji: '🕐' }, { label: 'Notion', emoji: '📝' }].map((tool) => (
                        <button
                          key={tool.label}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm text-gray-700"
                        >
                          <span className="h-7 w-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm">{tool.emoji}</span>
                          {tool.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── CONNECT YOUR TOOLS ── */}
        <section className="purple-gradient py-24">
          <div className="container text-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block text-xs font-semibold text-white/50 bg-white/10 rounded-full px-3 py-1 mb-5 uppercase tracking-wider">
                Integrations
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">Connect Your Tools</h2>
              <p className="mt-4 text-purple-200 text-base sm:text-lg max-w-xl mx-auto">
                LeadGenie works perfectly with{' '}
                <span className="text-white font-semibold underline underline-offset-2">all</span>{' '}
                the products you&apos;re already using.
              </p>
              <Link
                href="/signup"
                className="mt-6 inline-flex items-center gap-2 bg-white text-purple-700 font-semibold text-sm rounded-full px-6 py-3 hover:bg-purple-50 transition-colors"
              >
                Start For Free
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="mt-12 grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto"
            >
              {integrations.map((item) => (
                <div key={item.name} className="bg-white rounded-2xl p-5 shadow-md text-left">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`h-9 w-9 rounded-xl ${item.color} flex items-center justify-center text-base font-bold`}>
                      {item.icon}
                    </span>
                    <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed mb-4">{item.desc}</p>
                  <button className="bg-blue-600 text-white text-xs font-semibold rounded-lg px-4 py-2 hover:bg-blue-700 transition-colors">
                    {item.btn}
                  </button>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── ANALYTICS ── */}
        <section className="blue-section-gradient py-24">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6 }}
              >
                <span className="inline-block text-xs font-semibold text-blue-200 bg-white/10 rounded-full px-3 py-1 mb-5 uppercase tracking-wider">
                  Revenue Intelligence
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
                  Optimized For Revenue
                </h2>
                <p className="mt-5 text-blue-200 text-base sm:text-lg leading-relaxed">
                  Track campaign performance beyond vanity metrics. See Opportunities, Pipeline, Conversions, and Revenue — then automatically scale what works.
                </p>
                <Link
                  href="/signup"
                  className="mt-8 inline-flex items-center gap-2 bg-white text-blue-700 font-semibold text-sm rounded-full px-6 py-3 hover:bg-blue-50 transition-colors"
                >
                  Start For Free
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="bg-white rounded-2xl shadow-2xl overflow-hidden"
              >
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Overall Result</p>
                    <p className="text-xs text-gray-400 mt-0.5">Campaign analytics</p>
                  </div>
                  <span className="text-xs font-semibold bg-green-100 text-green-700 rounded-full px-3 py-1 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Live
                  </span>
                </div>
                <div className="p-5">
                  <div className="h-36 relative flex items-end gap-1">
                    {[30, 45, 38, 55, 48, 62, 58, 72, 65, 80, 75, 90].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-lg transition-all"
                        style={{
                          height: `${h}%`,
                          background: `rgba(59,130,246,${0.3 + i * 0.055})`,
                        }}
                      />
                    ))}
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                    {[
                      { label: 'Email Accounts', value: '24' },
                      { label: 'Emails Sent', value: '122k' },
                      { label: 'Reply Rate', value: '18.4%' },
                    ].map((stat) => (
                      <div key={stat.label}>
                        <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                        <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section className="bg-white py-24">
          <div className="container text-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block text-xs font-semibold text-blue-600 bg-blue-50 rounded-full px-3 py-1 mb-5 uppercase tracking-wider">
                Social Proof
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">Customer Testimonials</h2>
              <p className="mt-3 text-gray-400 text-base">Real results. Real customers.</p>
            </motion.div>

            <div className="mt-12 grid sm:grid-cols-2 gap-5 max-w-4xl mx-auto text-left">
              {visibleTestimonials.map((t) => (
                <motion.div
                  key={t.name}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="border border-gray-200 rounded-2xl p-7 flex flex-col justify-between hover:shadow-sm transition-shadow"
                >
                  {/* Stars */}
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                      {t.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.role}</p>
                    </div>
                    <span className="ml-auto text-sm font-bold text-gray-300">{t.company}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                onClick={() => setTestimonialIndex((i) => (i - 1 + testimonials.length) % testimonials.length)}
                className="h-10 w-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-500 text-lg"
              >
                ‹
              </button>
              <button
                onClick={() => setTestimonialIndex((i) => (i + 1) % testimonials.length)}
                className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors text-lg"
              >
                ›
              </button>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="cta-gradient py-28">
          <div className="container text-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
                Unlock The Power Of AI
                <br />
                <span className="gradient-text">With LeadGenie</span>
              </h2>
              <p className="mt-5 text-white/50 text-base max-w-md mx-auto leading-relaxed">
                Join 30,000+ companies already automating their outreach and closing more deals with AI.
              </p>
              <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-full px-8 py-4 transition-all shadow-lg shadow-blue-900/40 hover:-translate-y-px"
                >
                  Get Started Free →
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 border border-white/15 text-white/70 hover:text-white hover:border-white/30 font-medium text-sm rounded-full px-8 py-4 transition-all hover:bg-white/5"
                >
                  See Pricing
                </Link>
              </div>
              <p className="mt-5 text-xs text-white/25">No credit card required · Cancel anytime</p>
            </motion.div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}

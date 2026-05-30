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
    name: 'Mike Ellis',
    role: 'Co-Founder, Kale Acquisition',
    company: 'kale',
    initials: 'ME',
  },
  {
    quote: "LeadGenie became the backbone of our outreach — over 100,000 emails sent across 20+ domains with 20%+ reply rates and a steady stream of qualified leads. It's not just a sending tool, it's our growth engine.",
    name: 'Briken Bufi',
    role: 'CEO & Co-Founder of Aella Creative Force',
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
  { name: 'Zapier', desc: 'Connect LeadGenie to thousands of apps and services.', color: 'text-orange-500', btn: 'Copy API Key' },
  { name: 'Slack', desc: 'Receive notifications when activity occurs in your workspace.', color: 'text-purple-500', btn: 'Manage' },
  { name: 'Google Calendar', desc: 'Schedule meetings directly from LeadGenie campaigns.', color: 'text-blue-500', btn: 'Connect' },
  { name: 'OpenAI', desc: 'Leverage GPT models for automatic email responses and content generation.', color: 'text-gray-800', btn: 'Add' },
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
        <section className="hero-gradient">
          <div className="container text-center pt-14 pb-10">

            {/* Announcement badge */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-7 flex justify-center"
            >
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/20 border border-white/20 rounded-full px-4 py-2 transition-colors"
              >
                <span className="text-xs font-semibold bg-blue-400/30 text-white rounded-full px-2 py-0.5">NEW</span>
                <span className="text-xs text-white font-medium">AI Reply Agent is now live →</span>
              </Link>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl sm:text-5xl lg:text-[64px] font-bold text-white leading-[1.1] tracking-tight"
            >
              Find &amp; Close Clients
              <br />
              <span className="text-blue-200">On Autopilot with AI</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-5 text-base sm:text-lg text-blue-100 max-w-lg mx-auto leading-relaxed"
            >
              LeadGenie finds your ideal prospects, writes personalised outreach, and books meetings — while you sleep.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18 }}
              className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-white text-blue-700 font-semibold text-sm rounded-full px-7 py-3.5 hover:bg-blue-50 transition-colors shadow-lg"
              >
                Start For Free
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 border border-white/30 text-white font-semibold text-sm rounded-full px-7 py-3.5 hover:bg-white/10 transition-colors"
              >
                Sign In
              </Link>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.28 }}
              className="mt-4 text-xs text-blue-200"
            >
              No credit card required · Free plan available · Setup in 2 minutes
            </motion.p>

            {/* AI search bar */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-10 mx-auto max-w-xl"
            >
              <div className="flex items-center bg-white rounded-full shadow-xl px-5 py-3.5 gap-3">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask AI to find leads, write emails, build campaigns…"
                  className="flex-1 text-sm text-gray-700 outline-none bg-transparent placeholder:text-gray-400"
                />
                <button className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {['Create Sales Agent', 'Create Reply Agent', 'Find Leads'].map((label) => (
                  <button
                    key={label}
                    className="text-xs text-white/90 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full px-3.5 py-1.5 transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Social proof bar */}
          <div className="container pb-14 text-center">
            <div className="border-t border-white/10 pt-10">
              <p className="text-xs font-semibold text-blue-300 uppercase tracking-widest mb-6">
                Trusted by 30,000+ companies worldwide
              </p>
              <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
                {companies.map((co) => (
                  <span key={co} className="text-sm font-bold text-white/60 tracking-wide hover:text-white/90 transition-colors cursor-default">
                    {co}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── SOCIAL PROOF STATS ── */}
        <section className="bg-white py-16 border-b border-gray-100">
          <div className="container">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
              {[
                { value: '30,000+', label: 'Companies' },
                { value: '500M+', label: 'Emails Sent' },
                { value: '18%', label: 'Avg Reply Rate' },
                { value: '4.9 / 5', label: 'Customer Rating' },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-3xl sm:text-4xl font-bold text-gray-900">{stat.value}</p>
                  <p className="mt-1.5 text-sm text-gray-500 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── REACH CLIENTS ON AUTOPILOT ── */}
        <section className="bg-white py-24">
          <div className="container text-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block text-xs font-semibold text-blue-600 bg-blue-50 rounded-full px-3 py-1 mb-4 uppercase tracking-wider">
                Lead Generation
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">Reach Clients On Autopilot</h2>
              <p className="mt-4 text-gray-500 text-base sm:text-lg max-w-xl mx-auto">
                Use LeadGenie AI to find perfect leads, create AI Sales Agents and automate your outreach &amp; sales.
              </p>
              <Link
                href="/signup"
                className="mt-6 inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold rounded-full px-6 py-3 hover:bg-gray-800 transition-colors"
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
              className="mt-12 rounded-3xl overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 p-6 sm:p-10 shadow-xl mx-auto max-w-4xl"
            >
              <div className="grid md:grid-cols-2 gap-6 text-left">
                {/* Leads Finder sidebar */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Leads Finder</p>
                  <div className="space-y-2">
                    {['By Profile', 'By Location', 'Job Title', 'Industry', 'Company Size'].map((filter) => (
                      <div key={filter} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer">
                        <span className="h-3.5 w-3.5 rounded-full border-2 border-blue-400 bg-blue-100" />
                        <span className="text-sm text-gray-700">{filter}</span>
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
            </motion.div>
          </div>
        </section>

        {/* ── AUTOMATE YOUR OUTREACH ── */}
        <section className="teal-gradient py-24">
          <div className="container text-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">Automate Your Outreach</h2>
              <p className="mt-4 text-blue-100 text-base sm:text-lg max-w-xl mx-auto">
                Create &amp; Launch campaigns in minutes. Let LeadGenie AI craft and personalise outreach at scale.
              </p>
              <Link
                href="/signup"
                className="mt-6 inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold rounded-full px-6 py-3 hover:bg-gray-800 transition-colors"
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
              className="mt-12 grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto"
            >
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
                <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide">Lead Finder</p>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Company</p>
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
                      <span>⚡</span>
                      <span>LeadGenie</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Lead Type Search</p>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none"
                      placeholder="Company Marketers..."
                      readOnly
                    />
                  </div>
                  <button className="w-full bg-blue-600 text-white text-sm font-semibold rounded-lg py-2.5 hover:bg-blue-700 transition-colors">
                    Find Leads
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── AI WORKFLOWS ── */}
        <section className="bg-gray-50 py-24">
          <div className="container text-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">AI Workflows</h2>
              <p className="mt-4 text-gray-500 text-base sm:text-lg max-w-2xl mx-auto">
                Workflows that just work. When a lead visits your site, replies, or books a meeting, LeadGenie automatically routes them, tags them, and triggers next-step campaigns — no manual setup needed.
              </p>
              <Link
                href="/signup"
                className="mt-6 inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold rounded-full px-6 py-3 hover:bg-gray-800 transition-colors"
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
              className="mt-12 max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-sm text-gray-400">Search...</p>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Add a trigger</h3>
              <p className="text-sm text-gray-500 mb-6">Select a trigger that will initiate the action</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Leads</p>
                  <div className="space-y-2">
                    {['Calendly', 'Hubspot', 'SalesForce'].map((tool) => (
                      <button
                        key={tool}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm text-gray-700"
                      >
                        <span className="h-7 w-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm">
                          {tool === 'Calendly' ? '📅' : tool === 'Hubspot' ? '🟠' : '☁️'}
                        </span>
                        {tool}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Wait for Effect</p>
                  <div className="space-y-2">
                    {['LeadGenie', 'Schedule', 'Notion'].map((tool) => (
                      <button
                        key={tool}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm text-gray-700"
                      >
                        <span className="h-7 w-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm">
                          {tool === 'LeadGenie' ? '⚡' : tool === 'Schedule' ? '🕐' : '📝'}
                        </span>
                        {tool}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
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
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">Connect Your Tools</h2>
              <p className="mt-4 text-purple-200 text-base sm:text-lg max-w-xl mx-auto">
                LeadGenie works perfectly with{' '}
                <span className="text-white font-semibold underline underline-offset-2">all</span>{' '}
                the products you're already using.
              </p>
              <Link
                href="/signup"
                className="mt-6 inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold rounded-full px-6 py-3 hover:bg-gray-800 transition-colors"
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
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-lg ${item.color}`}>
                      {item.name === 'Zapier' ? '⚡' : item.name === 'Slack' ? '#' : item.name === 'Google Calendar' ? '📅' : '🤖'}
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

        {/* ── OPTIMIZED FOR REVENUE ── */}
        <section className="blue-section-gradient py-24">
          <div className="container text-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">Optimized For Revenue</h2>
              <p className="mt-4 text-blue-200 text-base sm:text-lg max-w-2xl mx-auto">
                Track campaign performance beyond vanity metrics with Opportunities, Pipeline, Conversions, and Revenue. Automatically pause the campaigns that need work and scale the ones that drive real business growth.
              </p>
              <Link
                href="/signup"
                className="mt-6 inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold rounded-full px-6 py-3 hover:bg-gray-800 transition-colors"
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
              className="mt-12 max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Chart header */}
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Overall Result</p>
                  <p className="text-xs text-gray-400 mt-0.5">Campaign analytics</p>
                </div>
                <span className="text-xs font-medium bg-green-100 text-green-700 rounded-full px-3 py-1">Live</span>
              </div>
              {/* Chart area */}
              <div className="p-5">
                <div className="h-40 relative flex items-end gap-1">
                  {[30, 45, 38, 55, 48, 62, 58, 72, 65, 80, 75, 90].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-lg" style={{ height: `${h}%`, background: i % 3 === 0 ? '#3b82f6' : i % 3 === 1 ? '#60a5fa' : '#93c5fd', opacity: 0.7 + i * 0.02 }} />
                  ))}
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Email Accounts', value: '24' },
                    { label: 'Emails Sent', value: '122k' },
                    { label: 'Reply Rate', value: '18.4%' },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center">
                      <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                      <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── CUSTOMER TESTIMONIALS ── */}
        <section className="bg-white py-24">
          <div className="container text-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">Customer Testimonials</h2>
              <p className="mt-3 text-gray-400 text-base">Real Results. Real Customers.</p>
            </motion.div>

            <div className="mt-12 grid sm:grid-cols-2 gap-5 max-w-4xl mx-auto text-left">
              {visibleTestimonials.map((t) => (
                <motion.div
                  key={t.name}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="border border-gray-200 rounded-2xl p-7 flex flex-col justify-between"
                >
                  <p className="text-gray-700 text-sm leading-relaxed">"{t.quote}"</p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                      {t.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.role}</p>
                    </div>
                    <span className="ml-auto text-sm font-bold text-gray-400 italic">{t.company}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                onClick={() => setTestimonialIndex((i) => (i - 1 + testimonials.length) % testimonials.length)}
                className="h-10 w-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-600"
              >
                ‹
              </button>
              <button
                onClick={() => setTestimonialIndex((i) => (i + 1) % testimonials.length)}
                className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors"
              >
                ›
              </button>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="cta-gradient py-24">
          <div className="container text-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
                Unlock The Power Of AI
                <br />
                With{' '}
                <span className="inline-flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/20 border border-white/30 text-lg">⚡</span>
                  LeadGenie
                </span>
              </h2>
              <p className="mt-4 text-blue-200 text-base max-w-md mx-auto">
                Get started now to access exclusive templates and elevate your projects to the next level.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/signup"
                  className="bg-white text-blue-700 font-semibold text-sm rounded-full px-7 py-3.5 hover:bg-blue-50 transition-colors shadow-lg"
                >
                  Get Started Free →
                </Link>
                <Link
                  href="/pricing"
                  className="border border-white/40 text-white text-sm font-semibold rounded-full px-7 py-3.5 hover:bg-white/10 transition-colors"
                >
                  See Pricing
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}

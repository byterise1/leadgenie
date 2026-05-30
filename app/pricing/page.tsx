'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const tabs = [
  { id: 'outreach', label: 'Outreach', icon: '⚡' },
  { id: 'credits', label: 'LeadGenie Credits', icon: '💎' },
  { id: 'vip', label: 'VIP', icon: '⭐' },
];

const plans = [
  {
    name: 'Growth',
    icon: '⚡',
    price: { monthly: '$47', yearly: '$37' },
    period: '/monthly',
    cta: 'Get Started',
    featured: false,
    features: [
      'Unlimited Email Accounts',
      'Unlimited Email Warmup',
      '1000 Uploaded Contacts',
      '5000 Emails Monthly',
      'Chat Support',
    ],
  },
  {
    name: 'Hypergrowth',
    icon: '🚀',
    price: { monthly: '$97', yearly: '$77' },
    period: '/monthly',
    cta: 'Get Started',
    featured: true,
    features: [
      'Unlimited Email Accounts',
      'Unlimited Email Warmup',
      '25 000 Uploaded Contacts',
      '100 000 Emails Monthly',
      'Premium Live Support',
    ],
  },
  {
    name: 'Light Speed',
    icon: '🏢',
    price: { monthly: '$358', yearly: '$297' },
    period: '/monthly',
    cta: 'Get Started',
    featured: false,
    features: [
      'Everything in Hyper Growth +',
      '500 000 Emails Monthly',
      '100 000 Uploaded Contacts',
      'SISR System',
    ],
  },
  {
    name: 'Enterprise',
    icon: '🏛️',
    price: { monthly: 'Custom', yearly: 'Custom' },
    period: '',
    cta: 'Book A Call',
    featured: false,
    features: [
      'Everything in Light Speed +',
      '500 000+ Emails Monthly',
      '100 000+ Uploaded Contacts',
      'Private Deliverability Network',
    ],
  },
];

export default function PricingPage() {
  const [activeTab, setActiveTab] = useState('outreach');
  const [yearly, setYearly] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main className="pt-16 pb-24">
        <div className="container">

          {/* Tabs */}
          <div className="flex items-center justify-center mb-8">
            <div className="inline-flex items-center border border-gray-200 rounded-full p-1 bg-gray-50 gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-white shadow-sm text-gray-900 border border-gray-200'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mb-12">
            <span className={`text-sm font-medium ${!yearly ? 'text-gray-900' : 'text-gray-400'}`}>Monthly</span>
            <button
              onClick={() => setYearly((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${yearly ? 'bg-blue-600' : 'bg-gray-300'}`}
              aria-label="Toggle yearly billing"
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${yearly ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
            <span className={`text-sm font-medium ${yearly ? 'text-gray-900' : 'text-gray-400'}`}>Yearly</span>
          </div>

          {/* Pricing cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className={`relative rounded-2xl p-6 flex flex-col ${
                  plan.featured
                    ? 'bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-xl scale-105 z-10'
                    : 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                }`}
              >
                {/* Icon */}
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-xl mb-4 ${plan.featured ? 'bg-white/20' : 'bg-gray-100'}`}>
                  {plan.icon}
                </div>

                {/* Name */}
                <h3 className={`text-lg font-bold mb-1 ${plan.featured ? 'text-white' : 'text-gray-900'}`}>
                  {plan.name}
                </h3>

                {/* Price */}
                <div className="mb-5">
                  <span className={`text-3xl font-bold ${plan.featured ? 'text-white' : 'text-gray-900'}`}>
                    {yearly ? plan.price.yearly : plan.price.monthly}
                  </span>
                  {plan.period && (
                    <span className={`text-sm ${plan.featured ? 'text-blue-200' : 'text-gray-400'}`}>
                      {plan.period}
                    </span>
                  )}
                </div>

                {/* CTA */}
                <Link
                  href="#"
                  className={`w-full text-center text-sm font-semibold rounded-full py-2.5 mb-6 transition-colors ${
                    plan.featured
                      ? 'bg-white text-blue-700 hover:bg-blue-50'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  {plan.cta}
                </Link>

                {/* Features */}
                <ul className="space-y-3 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <svg
                        className={`w-4 h-4 mt-0.5 shrink-0 ${plan.featured ? 'text-blue-200' : 'text-blue-600'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={`text-sm ${plan.featured ? 'text-blue-100' : 'text-gray-600'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          {/* Compare features */}
          <div className="flex justify-center mt-10">
            <button className="flex items-center gap-2 border border-gray-300 rounded-full px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Compare Features
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}

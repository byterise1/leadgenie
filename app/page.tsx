'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FAQAccordion } from '@/components/FAQAccordion';

/* ------------------------------------------------------------
   SVG ICON COMPONENTS
------------------------------------------------------------ */
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
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
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
function IcAtSign({ c = 'w-4 h-4' }: { c?: string }) {
  return (
    <svg className={c} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-3.92 7.94" />
    </svg>
  );
}

/* ------------------------------------------------------------
   REAL PERSON AVATARS
------------------------------------------------------------ */
const AVATAR_PHOTOS = [
  'https://i.pravatar.cc/150?img=47',
  'https://i.pravatar.cc/150?img=68',
  'https://i.pravatar.cc/150?img=48',
  'https://i.pravatar.cc/150?img=3',
  'https://i.pravatar.cc/150?img=44',
  'https://i.pravatar.cc/150?img=12',
  'https://i.pravatar.cc/150?img=5',
  'https://i.pravatar.cc/150?img=65',
  'https://i.pravatar.cc/150?img=32',
];

function PersonAvatar({ idx, size = 40 }: { idx: number; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={AVATAR_PHOTOS[idx % AVATAR_PHOTOS.length]}
      alt="user"
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block' }}
    />
  );
}

/* ------------------------------------------------------------
   BRAND LOGO DATA
------------------------------------------------------------ */
type Brand = { name: string; icon?: React.ReactNode; label?: string };

const BRANDS: Brand[] = [
  // Slack — 4-part interlocked symbol
  { name: 'Slack', icon: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9">
      <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z"/>
    </svg>
  )},
  // Instagram — rounded square + circle + dot
  { name: 'Instagram', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-9 h-9">
      <rect x="2" y="2" width="20" height="20" rx="6" ry="6"/>
      <circle cx="12" cy="12" r="4.5"/>
      <circle cx="17.6" cy="6.4" r="1" fill="currentColor" stroke="none"/>
    </svg>
  )},
  // Facebook — f in filled circle (authentic FB logo shape)
  { name: 'Facebook', icon: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12c0-5.523-4.477-10-10-10z"/>
    </svg>
  )},
  // Microsoft — 4-square Windows logo
  { name: 'Microsoft', icon: (
    <svg viewBox="0 0 21 21" fill="currentColor" className="w-9 h-9">
      <rect x="1" y="1" width="9" height="9"/>
      <rect x="11" y="1" width="9" height="9"/>
      <rect x="1" y="11" width="9" height="9"/>
      <rect x="11" y="11" width="9" height="9"/>
    </svg>
  )},
  // AWS — "aws" text + signature curved arrow
  { name: 'AWS', icon: (
    <svg viewBox="0 0 60 32" className="w-16 h-8" fill="currentColor">
      <text x="1" y="22" fontSize="23" fontWeight="800" fontFamily="Arial,sans-serif" letterSpacing="-0.5">aws</text>
      <path d="M4 27 Q30 34 56 27" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      <path d="M52 24.5 L56 27 L52 29.5" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  // Cloudflare — puffy cumulus cloud + CLOUDFLARE text
  { name: 'Cloudflare', icon: (
    <svg viewBox="0 0 80 40" fill="currentColor" className="w-20 h-10">
      {/* cloud body */}
      <path d="M22 28H56a8 8 0 000-16h-1.3A12 12 0 0031 17.5l-.5-.5A8 8 0 0022 28z"/>
      {/* extra left bump */}
      <circle cx="24" cy="24" r="6"/>
      {/* CLOUDFLARE text */}
      <text x="0" y="38" fontSize="7.5" fontWeight="600" fontFamily="Arial,sans-serif" letterSpacing="0.5">CLOUDFLARE</text>
    </svg>
  ) },
  // Google — wordmark text
  { name: 'Google', label: 'Google' },
  // LinkedIn — in box
  { name: 'LinkedIn', icon: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9">
      <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
      <circle cx="4" cy="4" r="2"/>
    </svg>
  )},
  // HubSpot — sprocket icon + label
  { name: 'HubSpot', icon: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9">
      <path d="M22.162 5.656a8.383 8.383 0 00-3.402-3.12 8.556 8.556 0 00-4.33-.9c-2.174.156-4.22 1.04-5.78 2.526C7.09 5.647 6.175 7.56 6.033 9.62c-.13 1.905.414 3.79 1.535 5.33L5.5 19H9l.73-1.45a8.446 8.446 0 004.27 1.145c2.298 0 4.5-.878 6.13-2.44a8.307 8.307 0 002.32-5.932c.07-1.682-.4-3.34-1.288-4.667zM12 16a4 4 0 110-8 4 4 0 010 8z"/>
    </svg>
  ), label: 'HubSpot' },
  // Notion — N block icon
  { name: 'Notion', icon: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/>
    </svg>
  )},
  // Stripe — S wordmark
  { name: 'Stripe', label: 'stripe' },
  // Zapier — Z text
  { name: 'Zapier', label: 'Zapier' },
];

/* ------------------------------------------------------------
   TESTIMONIALS DATA
------------------------------------------------------------ */
const testimonials = [
  { quote: "Leads Genie completely transformed our agency. We went from 2,000 emails/week to 200,000+ across 40+ client domains — zero deliverability issues. The warmup alone is worth 10x the price.", name: 'Mike Ellis', role: 'Co-Founder, Kale Acquisition', company: 'Kale', avatarIdx: 0 },
  { quote: "We booked 47 qualified meetings in our first month. The campaign builder is incredibly intuitive — 5-step sequence running in under 20 minutes. Managing replies in the Unibox is effortless.", name: 'Briken Bufi', role: 'CEO, Aella Creative Force', company: 'Aella', avatarIdx: 1 },
  { quote: "I've tried Instantly, Lemlist, and Mailshake. Leads Genie beats them all. Our open rates jumped from 28% to 76% after switching. The AI personalisation is genuinely impressive.", name: 'Alex Baldovin', role: 'CEO, Authbound', company: 'Authbound', avatarIdx: 3 },
  { quote: "The AI warmup is a total game changer. We went from landing in spam 40% of the time to virtually zero. Deliverability scores are the best they've ever been across 30 sending accounts.", name: 'David Park', role: 'Head of Growth, Ripple Labs', company: 'Ripple', avatarIdx: 5 },
  { quote: "I manage 8 client accounts from one dashboard. Leads Genie saves me 20+ hours a week. The Unibox alone is worth the subscription — seamless across 50+ email accounts.", name: 'Sophie Laurent', role: 'Founder, Prolific Agency', company: 'Prolific', avatarIdx: 6 },
  { quote: "Switched from Apollo + Lemlist combo. Leads Genie does everything in one place for half the cost. We're booking 3-4x more meetings with the exact same prospect list.", name: 'Ryan Chen', role: 'VP Sales, Momentum Capital', company: 'Momentum', avatarIdx: 7 },
  { quote: "Finally a platform that handles everything in one place. We cut our tech stack from 5 tools to 1. Our team went from 20 meetings a month to 80+. Unbelievable ROI.", name: 'Marcus Webb', role: 'VP Sales, NextGenSoft', company: 'NextGenSoft', avatarIdx: 2 },
  { quote: "Leads Genie's AI personalisation is next-level. Our prospects actually think we researched them individually. Reply rates went from 3% to 19% overnight. Nothing else comes close.", name: 'Priya Nair', role: 'Growth Lead, Launchify', company: 'Launchify', avatarIdx: 4 },
  { quote: "We run a 12-person SDR team. Leads Genie scaled our outreach 10x without adding headcount. The analytics helped us cut underperforming sequences and double down on what works.", name: 'James Walker', role: 'Sales Director, GrowStack', company: 'GrowStack', avatarIdx: 8 },
];

type AIResult =
  | { type: 'email'; to: string; subject: string; body: string }
  | { type: 'answer'; answer: string };

/* ------------------------------------------------------------
   HELPERS
------------------------------------------------------------ */
function SectionBadge({ icon, label, dark = false }: { icon: React.ReactNode; label: string; dark?: boolean }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold mb-5 ${
      dark ? 'bg-white/15 border border-white/30 text-white/85' : 'bg-blue-50 border border-blue-100 text-blue-600'
    }`}>
      <span className={`flex items-center justify-center w-4 h-4 ${dark ? 'text-white/70' : 'text-blue-500'}`}>{icon}</span>
      {label}
    </div>
  );
}

function BrandPill({ brand }: { brand: Brand }) {
  return (
    <div className="flex-shrink-0 flex items-center gap-2.5 px-10 py-1 cursor-default select-none text-gray-400/80">
      {brand.icon && <span className="flex items-center">{brand.icon}</span>}
      {brand.label && (
        <span className="text-[21px] font-semibold tracking-tight leading-none whitespace-nowrap">{brand.label}</span>
      )}
    </div>
  );
}

function TestimonialCard({ t }: { t: typeof testimonials[0] }) {
  return (
    <div className="flex-shrink-0 w-[85vw] sm:w-[420px] scroll-snap-align-start bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col gap-5" style={{ scrollSnapAlign: 'start' }}>
      <svg className="w-8 h-8 text-blue-100" fill="currentColor" viewBox="0 0 32 32">
        <path d="M10 8C6.13 8 3 11.13 3 15v9h9v-9H6c0-2.21 1.79-4 4-4V8zm14 0c-3.87 0-7 3.13-7 7v9h9v-9h-6c0-2.21 1.79-4 4-4V8z"/>
      </svg>
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <svg key={i} className="w-4 h-4 fill-yellow-400" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <p className="text-gray-700 text-base leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
      <div className="flex items-center gap-3.5 pt-5 border-t border-gray-100">
        <PersonAvatar idx={t.avatarIdx} size={50} />
        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-gray-900 text-sm">{t.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{t.role}</p>
        </div>
        <div className="shrink-0 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-xl px-3 py-1.5 whitespace-nowrap">{t.company}</div>
      </div>
    </div>
  );
}

const maskFade = {
  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
  maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
};

/* ------------------------------------------------------------
   PAGE
------------------------------------------------------------ */
export default function HomePage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [error, setError] = useState('');

  async function handleSearch() {
    if (!query.trim() || loading) return;
    setLoading(true); setResult(null); setError('');
    try {
      const res = await fetch('/api/generate-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data);
    } catch { setError('Something went wrong. Check your GROQ_API_KEY in .env.local.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />

      {/* ------------------------------------------
          HERO
      ------------------------------------------ */}
      <section className="hero-gradient pb-24 pt-20">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
            className="mb-7 flex justify-center">
            <Link href="/signup"
              className="inline-flex items-center gap-2 border border-white/25 bg-white/12 rounded-full px-4 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/20 transition-colors backdrop-blur-sm max-w-[90vw]">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse shrink-0" />
              <span className="hidden sm:inline">New: AI-powered email warmup is live — try it free</span>
              <span className="sm:hidden">AI warmup is live — try free</span>
              <svg className="w-3.5 h-3.5 text-white/50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="text-[28px] sm:text-4xl md:text-5xl lg:text-[60px] font-extrabold text-white leading-[1.08] tracking-tight">
            Cold Email Outreach That Books Meetings
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }}
            className="mt-4 text-sm font-semibold text-blue-200 tracking-widest uppercase">
            Built for sales teams · agencies · SaaS founders
          </motion.p>

          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.12 }}
            className="mt-4 text-base sm:text-lg text-blue-100/90 max-w-xl mx-auto leading-relaxed font-medium">
            Connect unlimited sending accounts, warm up your domains automatically, and run
            AI-personalised cold email campaigns that land in the inbox — not spam.
          </motion.p>

          {/* AI search bar */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-9 mx-auto max-w-[600px]">
            <div className="flex items-center bg-white rounded-2xl shadow-2xl px-5 py-3.5 gap-3 ring-1 ring-white/10">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Ask AI to write your first cold email campaign..."
                className="flex-1 text-sm text-gray-700 outline-none bg-transparent placeholder:text-gray-400 font-medium" />
              <button onClick={handleSearch} disabled={loading}
                className="shrink-0 h-9 w-9 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-60 shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </motion.div>

          {/* AI response */}
          {(loading || result || error) && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              className="mt-4 mx-auto max-w-[600px] bg-white rounded-2xl shadow-2xl ring-1 ring-black/8 overflow-hidden text-left">
              {error && <div className="flex items-center gap-3 px-5 py-4"><span className="text-red-500 shrink-0"><IcWarning c="w-5 h-5" /></span><p className="text-sm text-red-600 font-medium">{error}</p></div>}
              {loading && <div className="flex items-center gap-3 px-5 py-4"><div className="h-5 w-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin shrink-0" /><p className="text-sm text-gray-500 font-medium">Leads Genie AI is thinking...</p></div>}
              {result?.type === 'answer' && <>
                <div className="px-5 py-2.5 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2"><span className="text-indigo-600"><IcRobot c="w-4 h-4" /></span><p className="text-xs font-bold text-indigo-700">Leads Genie AI</p></div>
                <div className="px-5 py-4"><p className="text-sm text-gray-700 leading-relaxed">{result.answer}</p></div>
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-400">Want to see it in action?</p>
                  <Link href="/signup" className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl px-4 py-2 hover:bg-blue-700 transition-colors shrink-0">Try Leads Genie Free <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></Link>
                </div>
              </>}
              {result?.type === 'email' && <>
                <div className="px-5 py-2.5 bg-blue-50 border-b border-blue-100 flex items-center gap-2"><span className="text-blue-600"><IcSparkles c="w-4 h-4" /></span><p className="text-xs font-bold text-blue-700">Your email is ready</p></div>
                <div className="px-5 py-4 space-y-2.5">
                  <div className="flex items-start gap-2"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-14 shrink-0 mt-0.5">To</span><span className="text-xs text-gray-700 font-medium">{result.to}</span></div>
                  <div className="flex items-start gap-2"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-14 shrink-0 mt-0.5">Subject</span><span className="text-xs text-gray-900 font-semibold">{result.subject}</span></div>
                  <div className="pt-2 border-t border-gray-100 text-xs text-gray-600 leading-relaxed whitespace-pre-line">{result.body}</div>
                </div>
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-400">No credit card required</p>
                  <button onClick={() => {
                    if (result?.type === 'email') {
                      try { localStorage.setItem('prefill_template', JSON.stringify({ subject: result.subject, body: result.body })); } catch {}
                    }
                    window.location.href = '/dashboard/campaigns/new';
                  }} className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl px-4 py-2 hover:bg-blue-700 transition-colors shrink-0">Use This Template <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></button>
                </div>
              </>}
            </motion.div>
          )}

          {/* Steps */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-9 flex flex-wrap items-center justify-center gap-2 sm:gap-1">
            {[
              { n: 1, label: 'Add Sending Account', icon: <IcAtSign c="w-3.5 h-3.5" /> },
              { n: 2, label: 'Import Prospects',    icon: <IcUsers c="w-3.5 h-3.5" /> },
              { n: 3, label: 'Launch Campaign',     icon: <IcRocket c="w-3.5 h-3.5" /> },
              { n: 4, label: 'Book Meetings',       icon: <IcCalendar c="w-3.5 h-3.5" /> },
            ].map((step, i) => (
              <div key={step.n} className="flex items-center">
                <div className="flex items-center gap-2.5 rounded-full px-5 py-2.5 bg-white/12 border border-white/20 backdrop-blur-sm">
                  <span className="w-5 h-5 rounded-full border-2 border-white/50 text-white text-[10px] font-black flex items-center justify-center shrink-0">{step.n}</span>
                  <span className="text-white/70 shrink-0">{step.icon}</span>
                  <span className="text-xs sm:text-sm font-semibold text-white/90 whitespace-nowrap">{step.label}</span>
                </div>
                {i < 3 && <svg className="w-4 h-4 text-white/20 mx-1 hidden sm:block shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ------------------------------------------
          TRUSTED BY — continuous marquee, no pause
      ------------------------------------------ */}
      <section className="bg-white border-b border-gray-100 py-16 overflow-hidden">
        <div className="container text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Trusted by companies worldwide</p>
        </div>
        <div className="relative mt-10 pb-2" style={maskFade}>
          <div className="flex w-max animate-marquee">
            {[...BRANDS, ...BRANDS, ...BRANDS, ...BRANDS].map((b, i) => <BrandPill key={i} brand={b} />)}
          </div>
        </div>
      </section>

      {/* ------------------------------------------
          STATS — horizontal icon + number
      ------------------------------------------ */}
      <section className="bg-white border-b border-gray-100">
        <div className="container px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4">
            {([
              { v: '8,500+', l: 'Active Users',     sub: 'Sales teams & agencies',  icon: <IcUsers c="w-5 h-5" />,  color: '#3b82f6', bg: 'bg-blue-50'    },
              { v: '42M+',   l: 'Emails Delivered', sub: '97%+ inbox placement',    icon: <IcMail c="w-5 h-5" />,   color: '#6366f1', bg: 'bg-indigo-50'  },
              { v: '76%',    l: 'Avg Open Rate',    sub: 'vs 21% industry average', icon: <IcTrend c="w-5 h-5" />, color: '#10b981', bg: 'bg-emerald-50' },
              { v: '4.9/5',  l: 'G2 Rating',        sub: 'From 1,200+ reviews',     icon: <IcStar c="w-5 h-5" />,  color: '#f59e0b', bg: 'bg-amber-50'   },
            ] as const).map((s, i) => {
              const borderCls = [
                'border-r border-b border-gray-100 sm:border-b-0',
                'border-b border-gray-100 sm:border-b-0 sm:border-r',
                'border-r border-gray-100',
                '',
              ][i];
              return (
                <motion.div key={s.l}
                  initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
                  className={`flex items-center gap-3 py-6 px-4 sm:py-8 sm:px-6 hover:bg-gray-50/60 transition-colors group ${borderCls}`}>
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl sm:rounded-2xl ${s.bg} shrink-0 group-hover:scale-110 transition-transform duration-200`} style={{ color: s.color }}>
                    {s.icon}
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-xl sm:text-3xl font-extrabold tracking-tight leading-none" style={{ color: s.color }}>{s.v}</p>
                    <p className="text-[11px] sm:text-xs font-bold text-gray-700 mt-0.5 leading-tight">{s.l}</p>
                    <p className="text-[9px] sm:text-[10px] text-gray-400 font-medium leading-tight hidden sm:block">{s.sub}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------
          1. UNLIMITED SENDING ACCOUNTS
          Layout: text LEFT — card RIGHT
      ------------------------------------------ */}
      <section id="sending-accounts" className="bg-white py-24">
        <div className="container">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

            {/* Text */}
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}
              className="flex-none lg:w-[42%] text-center lg:text-left">
              <SectionBadge icon={<IcMail />} label="Email Accounts" />
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight leading-[1.1]">
                Add Unlimited Sending Accounts
              </h2>
              <p className="mt-4 text-gray-500 text-base sm:text-lg leading-relaxed">
                Connect Gmail, Outlook, and custom SMTP accounts — as many as you need.
                Rotate between senders automatically to stay under daily limits and
                protect your domain reputation.
              </p>
              <Link href="/signup"
                className="mt-7 inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-bold rounded-full px-8 py-3.5 hover:bg-gray-700 transition-colors shadow-sm">
                Start For Free
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </Link>
            </motion.div>

            {/* Card */}
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, delay: 0.1 }}
              className="flex-1 w-full">
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-blue-200">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-2.5">
                      <IcAtSign c="w-4 h-4 text-blue-500" />
                      <p className="text-sm font-bold text-gray-900">Email Accounts</p>
                      <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">5 active</span>
                    </div>
                    <button className="flex items-center gap-1.5 text-xs font-bold bg-blue-600 text-white rounded-xl px-3.5 py-2">+ Add Account</button>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {[
                      { email: 'alex@company.io',    provider: 'Gmail',   health: 98, status: 'Active',  sends: '142/200', ai: 0 },
                      { email: 'sarah@outreach.co',  provider: 'Outlook', health: 95, status: 'Active',  sends: '87/200',  ai: 1 },
                      { email: 'mike@growthco.com',  provider: 'Gmail',   health: 71, status: 'Warming', sends: '30/50',   ai: 2 },
                      { email: 'leads@salesteam.io', provider: 'SMTP',    health: 99, status: 'Active',  sends: '198/300', ai: 3 },
                      { email: 'outreach@scale.ai',  provider: 'Gmail',   health: 43, status: 'Warming', sends: '12/30',   ai: 4 },
                    ].map(acc => (
                      <div key={acc.email} className="flex items-center gap-4 px-5 py-3.5 hover:bg-blue-50/30 transition-colors">
                        <PersonAvatar idx={acc.ai} size={36} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{acc.email}</p>
                          <p className="text-xs text-gray-400">{acc.provider}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-14 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${acc.health}%`, background: acc.health > 80 ? '#22c55e' : acc.health > 50 ? '#f59e0b' : '#ef4444' }} />
                          </div>
                          <span className="text-xs text-gray-500 w-7 text-right font-medium">{acc.health}</span>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${acc.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{acc.status}</span>
                        <span className="text-xs text-gray-400 shrink-0 hidden sm:block font-medium">{acc.sends}</span>
                      </div>
                    ))}
                  </div>
                </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ------------------------------------------
          2. EMAIL WARMUP
          Layout: card LEFT — text RIGHT
      ------------------------------------------ */}
      <section id="warmup" className="bg-gray-50 py-24">
        <div className="container">
          <div className="flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-20">

            {/* Text */}
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}
              className="flex-none lg:w-[42%] text-center lg:text-left">
              <SectionBadge icon={<IcFire />} label="Email Warmup" />
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight leading-[1.1]">
                Land in the Inbox. Every Time.
              </h2>
              <p className="mt-4 text-gray-500 text-base sm:text-lg leading-relaxed">
                Our AI warmup network automatically builds your sender reputation by sending, opening,
                and replying to emails on your behalf — 24/7 in the background, before you launch
                a single cold email campaign.
              </p>
              <Link href="/signup"
                className="mt-7 inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-bold rounded-full px-8 py-3.5 hover:bg-gray-700 transition-colors shadow-sm">
                Start For Free
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </Link>
            </motion.div>

            {/* Card */}
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, delay: 0.1 }}
              className="flex-1 w-full">
              <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-black/8 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <div>
                    <p className="text-sm font-bold text-gray-900">Warmup Dashboard</p>
                    <p className="text-xs text-gray-400 mt-0.5">alex@company.io — Running 18 days</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-bold bg-green-100 text-green-700 rounded-full px-3 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />Warming Up
                  </span>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                      { l: 'Inbox Rate',   v: '97.3%',  color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
                      { l: 'Spam Rate',    v: '0.4%',   color: 'text-red-500',   bg: 'bg-red-50 border-red-100'     },
                      { l: 'Health Score', v: '98/100', color: 'text-blue-600',  bg: 'bg-blue-50 border-blue-100'   },
                    ].map(s => (
                      <div key={s.l} className={`rounded-2xl p-4 border text-center ${s.bg}`}>
                        <p className={`text-xl font-extrabold ${s.color}`}>{s.v}</p>
                        <p className="text-xs text-gray-500 mt-1 font-semibold">{s.l}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Inbox Score — Last 30 Days</p>
                  <div className="h-20 flex items-end gap-0.5">
                    {[42,51,58,63,60,69,72,75,78,82,80,85,83,88,86,91,89,93,90,95,92,96,94,97,95,97,96,98,97,98].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: `rgba(59,130,246,${0.18 + i * 0.028})` }} />
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                    <span>Day 1 — 42%</span>
                    <span className="text-green-600 font-bold">Today — 98% ✓</span>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ------------------------------------------
          3. CAMPAIGN BUILDER
          Layout: text LEFT — card RIGHT
      ------------------------------------------ */}
      <section id="campaigns" className="bg-white py-24">
        <div className="container">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

            {/* Text */}
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}
              className="flex-none lg:w-[42%] text-center lg:text-left">
              <SectionBadge icon={<IcRocket />} label="Campaigns" />
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight leading-[1.1]">
                Launch Campaigns That Get Replies
              </h2>
              <p className="mt-4 text-gray-500 text-base sm:text-lg leading-relaxed">
                Build multi-step email sequences with AI personalisation, smart follow-ups,
                and inbox rotation. Schedule, A/B test, pause, or scale — all from one dashboard.
              </p>
              <Link href="/signup"
                className="mt-7 inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-bold rounded-full px-8 py-3.5 hover:bg-gray-700 transition-colors shadow-sm">
                Start For Free
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </Link>
            </motion.div>

            {/* Card */}
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, delay: 0.1 }}
              className="flex-1 w-full">
              <div className="bg-white rounded-2xl shadow-sm border border-blue-200 p-5 sm:p-6">
                <div className="grid sm:grid-cols-2 gap-4 text-left">
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                      <IcRocket c="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-bold text-gray-900">Campaign: SaaS Founders Q3</p>
                    </div>
                    <div className="space-y-2">
                      {[
                        { step: 1, day: 'Day 1',  label: 'Initial Email',  open: '64%' },
                        { step: 2, day: 'Day 3',  label: 'Follow-up #1',   open: '41%' },
                        { step: 3, day: 'Day 7',  label: 'Follow-up #2',   open: '29%' },
                        { step: 4, day: 'Day 14', label: 'Break-up Email', open: '52%', reply: '18%' },
                      ].map(s => (
                        <div key={s.step} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-100 bg-gray-50 hover:bg-blue-50/50 transition-colors">
                          <span className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center shrink-0">{s.step}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-800">{s.label}</p>
                            <p className="text-[10px] text-gray-400">{s.day}</p>
                          </div>
                          <div className="text-right shrink-0 text-[10px] text-gray-400">
                            <span className="font-bold text-green-600">{s.open}</span>
                            {s.reply && <span className="ml-1 font-bold text-blue-600">{s.reply}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-3">AI Preview</p>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                        <PersonAvatar idx={0} size={24} />
                        <span className="text-xs text-gray-700 font-semibold truncate">John Doe — VP Sales, Acme Corp</span>
                      </div>
                      <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 text-xs text-gray-800 font-semibold">
                        Quick question about Acme&apos;s outbound stack
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-xs text-gray-700 leading-relaxed">
                        Hi John,<br /><br />I noticed Acme Corp just expanded into enterprise — congrats on the Series B!<br /><br />We help VP Sales teams book 30–50 meetings/month...
                      </div>
                      <button className="w-full bg-blue-600 text-white text-xs font-bold rounded-xl py-2.5 hover:bg-blue-700 transition-colors">Send Campaign</button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ------------------------------------------
          4. UNIBOX
          Layout: card LEFT — text RIGHT
      ------------------------------------------ */}
      <section id="unibox" className="bg-gray-50 py-24">
        <div className="container">
          <div className="flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-20">

            {/* Text */}
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}
              className="flex-none lg:w-[42%] text-center lg:text-left">
              <SectionBadge icon={<IcInbox />} label="Unibox" />
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight leading-[1.1]">
                Every Reply. One Smart Inbox.
              </h2>
              <p className="mt-4 text-gray-500 text-base sm:text-lg leading-relaxed">
                Stop switching between 20 different email accounts. Leads Genie&apos;s Unibox pulls every
                reply into one place — filter by campaign, label by intent, assign to teammates,
                and close deals faster.
              </p>
              <Link href="/signup"
                className="mt-7 inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-bold rounded-full px-8 py-3.5 hover:bg-gray-700 transition-colors shadow-sm">
                Start For Free
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </Link>
            </motion.div>

            {/* Card */}
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, delay: 0.1 }}
              className="flex-1 w-full">
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-blue-200">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50/70">
                    <div className="flex items-center gap-2.5">
                      <p className="text-sm font-bold text-gray-900">Unibox</p>
                      <span className="text-xs font-black bg-blue-600 text-white rounded-full px-2.5 py-0.5">8 new</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {['All','Interested','Not Now','DNC'].map((f, i) => (
                        <button key={f} className={`text-[11px] font-bold rounded-full px-2.5 py-1 ${i === 0 ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>{f}</button>
                      ))}
                    </div>
                  </div>
                  {[
                    { from: 'Sarah Chen', co: 'Stripe',  time: '2m',  preview: "Hi, this looks interesting! Can we schedule a...", tag: 'Interested', tagColor: 'bg-green-100 text-green-700',   read: false, idx: 0 },
                    { from: 'James Park', co: 'Notion',  time: '14m', preview: "Sure, let's chat. What times work for you...",    tag: 'Meeting Set',tagColor: 'bg-blue-100 text-blue-700',    read: false, idx: 1 },
                    { from: 'Lena Wolf',  co: 'Linear',  time: '1h',  preview: "We actually just signed with another vendor...",  tag: 'Not Now',    tagColor: 'bg-yellow-100 text-yellow-700', read: true,  idx: 2 },
                    { from: 'Tom Reid',   co: 'Vercel',  time: '3h',  preview: "Thanks — we're open to exploring this...",         tag: 'Interested', tagColor: 'bg-green-100 text-green-700',   read: true,  idx: 3 },
                    { from: 'Amy Tran',   co: 'Figma',   time: '5h',  preview: "Could you send over more info about pricing...",   tag: 'Needs Info', tagColor: 'bg-purple-100 text-purple-700', read: true,  idx: 4 },
                  ].map(mail => (
                    <div key={mail.from}
                      className={`flex items-center gap-3 px-5 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/80 cursor-pointer transition-colors ${!mail.read ? 'bg-blue-50/20' : ''}`}>
                      <PersonAvatar idx={mail.idx} size={38} />
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm text-gray-900 ${!mail.read ? 'font-extrabold' : 'font-semibold'}`}>{mail.from}</span>
                          <span className="text-xs text-gray-400">— {mail.co}</span>
                          {!mail.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{mail.preview}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-[10px] text-gray-400">{mail.time} ago</span>
                        <span className={`text-[10px] font-black rounded-full px-2 py-0.5 ${mail.tagColor}`}>{mail.tag}</span>
                      </div>
                    </div>
                  ))}
                </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ------------------------------------------
          5. ANALYTICS
          Layout: text LEFT — card RIGHT
      ------------------------------------------ */}
      <section id="analytics" className="bg-white py-24">
        <div className="container">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

            {/* Text */}
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}
              className="flex-none lg:w-[42%] text-center lg:text-left">
              <SectionBadge icon={<IcBarChart />} label="Analytics" />
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight leading-[1.1]">
                Know Exactly What&apos;s Working
              </h2>
              <p className="mt-4 text-gray-500 text-base sm:text-lg leading-relaxed">
                Track opens, clicks, replies, bounces, and unsubscribes in real-time. See which
                subject lines and follow-up steps drive the most meetings — then double down
                on what works.
              </p>
              <Link href="/signup"
                className="mt-7 inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-bold rounded-full px-8 py-3.5 hover:bg-gray-700 transition-colors shadow-sm">
                Start For Free
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </Link>
            </motion.div>

            {/* Card */}
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, delay: 0.1 }}
              className="flex-1 w-full bg-white rounded-2xl shadow-2xl ring-1 ring-black/8 overflow-hidden border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
                <div>
                  <p className="text-sm font-bold text-gray-900">Campaign Analytics</p>
                  <p className="text-xs text-gray-400 mt-0.5">SaaS Founders Q3 — Last 30 days</p>
                </div>
                <span className="flex items-center gap-1.5 text-xs font-bold bg-green-100 text-green-700 rounded-full px-3 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />Live
                </span>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  {[
                    { l: 'Sent',    v: '8,240', color: 'text-gray-900'   },
                    { l: 'Opened',  v: '58.3%', color: 'text-blue-600'   },
                    { l: 'Clicked', v: '14.7%', color: 'text-indigo-600' },
                    { l: 'Replied', v: '18.4%', color: 'text-green-600'  },
                  ].map(m => (
                    <div key={m.l} className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                      <p className={`text-lg font-extrabold ${m.color}`}>{m.v}</p>
                      <p className="text-xs text-gray-500 font-bold">{m.l}</p>
                    </div>
                  ))}
                </div>
                <div className="h-24 flex items-end gap-0.5 mb-4">
                  {[38,42,45,48,44,52,55,51,58,60,56,63,61,65,62,67,64,69,66,71,68,72,70,74,72,75,73,77,75,78].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: `rgba(59,130,246,${0.18 + i * 0.028})` }} />
                  ))}
                </div>
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  {[
                    { icon: <IcMailOpen c="w-3 h-3" />, event: 'Email opened',   who: 'Sarah Chen', time: '2s',  color: 'text-blue-500',   idx: 0 },
                    { icon: <IcCursor c="w-3 h-3" />,   event: 'Link clicked',   who: 'James Park', time: '47s', color: 'text-indigo-500', idx: 1 },
                    { icon: <IcChat c="w-3 h-3" />,     event: 'Reply received', who: 'Lena Wolf',  time: '3m',  color: 'text-green-500',  idx: 2 },
                  ].map(a => (
                    <div key={a.who} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <PersonAvatar idx={a.idx} size={24} />
                        <span className={`shrink-0 ${a.color}`}>{a.icon}</span>
                        <span className="text-xs font-bold text-gray-700 whitespace-nowrap">{a.event}</span>
                        <span className="text-xs text-gray-400 truncate">— {a.who}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">{a.time} ago</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ------------------------------------------
          6. AI WORKFLOWS
      ------------------------------------------ */}
      <section id="workflows" className="bg-gray-50 py-24">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}>
            <SectionBadge icon={<IcSparkles />} label="AI Workflows" />
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight leading-[1.1]">
              Automate Every Follow-Up
            </h2>
            <p className="mt-4 text-gray-500 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              Set your triggers once — Leads Genie automatically handles follow-ups, tags leads by
              intent, and routes hot prospects to your team. No missed opportunities, ever.
            </p>
            <Link href="/signup"
              className="mt-7 inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-bold rounded-full px-8 py-3.5 hover:bg-gray-700 transition-colors shadow-sm">
              Start For Free
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </Link>
          </motion.div>
          <div className="mt-14 grid sm:grid-cols-3 gap-6 max-w-[1100px] mx-auto">
            {[
              { icon: <IcMailOpen c="w-7 h-7" />, iconRing: 'border-2 border-blue-200',   iconColor: 'text-blue-600',   when: 'Lead Opens Your Email',    then: 'Auto-sends personalised follow-up in 2 days',         desc: 'The moment a prospect opens your email, Leads Genie queues a personalised follow-up automatically — no manual work, no missed timing.', result: '+24% reply rate',       resultBg: 'bg-blue-50 text-blue-700'   },
              { icon: <IcChat c="w-7 h-7" />,    iconRing: 'border-2 border-green-200',  iconColor: 'text-green-600',  when: 'Lead Replies Positively',  then: 'Tagged as Interested + routed to Unibox',             desc: "When a prospect replies with interest, Leads Genie auto-tags them, removes them from the sequence, and surfaces them in your Unibox for immediate action.", result: 'Zero missed hot leads', resultBg: 'bg-green-50 text-green-700' },
              { icon: <IcCalendar c="w-7 h-7" />, iconRing: 'border-2 border-purple-200', iconColor: 'text-purple-600', when: 'Meeting Gets Booked',       then: 'Removed from all sequences + CRM synced',             desc: 'Once a meeting is booked, Leads Genie instantly stops all outreach, syncs to your CRM, and notifies your team — zero duplicate messages.', result: 'No duplicate outreach', resultBg: 'bg-purple-50 text-purple-700' },
            ].map((wf, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.13 }}
                className="relative bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group text-left">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${wf.iconRing} ${wf.iconColor}`}>{wf.icon}</div>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${wf.iconColor}`}>TRIGGER</p>
                <h3 className="text-lg font-extrabold text-gray-900 leading-tight mb-2">{wf.when}</h3>
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                  <p className="text-xs text-gray-400 font-semibold">{wf.then}</p>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{wf.desc}</p>
                <div className={`mt-6 inline-flex items-center gap-2 text-xs font-black px-4 py-2 rounded-full ${wf.resultBg}`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  {wf.result}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------
          7. TESTIMONIALS — continuous slow marquee
      ------------------------------------------ */}
      <section className="bg-white py-24">
        <div className="container mb-12 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}>
            <SectionBadge icon={<IcStar />} label="Testimonials" />
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight leading-[1.1]">
              Real Results. Real Customers.
            </h2>
            <p className="mt-3 text-gray-400 text-base font-medium">
              Trusted by 8,500+ sales teams, agencies, and SaaS founders worldwide.
            </p>
          </motion.div>
        </div>

        {/* Full-width scroll strip with gradient fade edges */}
        <div className="relative" style={maskFade}>
          <div className="overflow-x-auto scroll-hide" style={{ cursor: 'grab', scrollSnapType: 'x mandatory' }}>
            <div className="flex gap-4 sm:gap-6" style={{ width: 'max-content', padding: '1rem 4vw 2rem' }}>
              {testimonials.map((t, i) => <TestimonialCard key={i} t={t} />)}
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-center gap-2 text-xs text-gray-400 font-medium select-none">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
          Scroll to see all reviews
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
        </div>
      </section>

      {/* ------------------------------------------
          8. FAQ ACCORDION
      ------------------------------------------ */}
      <FAQAccordion />

      <Footer />
    </div>
  );
}

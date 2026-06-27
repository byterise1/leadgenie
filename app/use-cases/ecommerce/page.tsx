import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FAQAccordion } from '@/components/FAQAccordion';
import Link from 'next/link';

export default function EcommercePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        <section className="hero-gradient pb-24 pt-20 text-center">
          <div className="container">
            <span className="inline-block text-xs font-bold bg-white/20 text-white rounded-full px-3 py-1 mb-5 uppercase tracking-widest">Use Case — E-commerce</span>
            <h1 className="text-[28px] sm:text-4xl md:text-5xl lg:text-[60px] font-extrabold text-white leading-[1.08] tracking-tight">
              Prospect Wholesale Buyers &amp; Retail Partners at Scale
            </h1>
            <p className="mt-5 text-blue-100 text-lg max-w-xl mx-auto leading-relaxed">
              Find and reach wholesale buyers, retail chains, and distribution partners with
              personalised cold email — without cold calling or trade shows.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/signup" className="bg-white text-blue-700 font-bold text-sm rounded-full px-8 py-3.5 hover:bg-blue-50 transition-colors shadow-lg">Start Free Trial</Link>
              <Link href="/contact" className="border border-white/30 text-white font-semibold text-sm rounded-full px-8 py-3.5 hover:bg-white/10 transition-colors">Talk to Sales</Link>
            </div>
          </div>
        </section>

        <section className="border-b border-gray-100">
          <div className="container px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 border-l border-t border-gray-100">
              <div className="flex items-center gap-2 sm:gap-4 py-5 sm:py-8 px-3 sm:px-6 hover:bg-gray-50/60 transition-colors border-r border-b border-gray-100">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-3xl font-extrabold tracking-tight leading-none" style={{ color: '#3b82f6' }}>3,000+</p>
                  <p className="text-xs font-bold text-gray-700 mt-0.5">E-commerce Brands</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 py-5 sm:py-8 px-3 sm:px-6 hover:bg-gray-50/60 transition-colors border-r border-b border-gray-100">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#f0fdf4', color: '#10b981' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/></svg>
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-3xl font-extrabold tracking-tight leading-none" style={{ color: '#10b981' }}>22%</p>
                  <p className="text-xs font-bold text-gray-700 mt-0.5">Avg Buyer Reply Rate</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 py-5 sm:py-8 px-3 sm:px-6 hover:bg-gray-50/60 transition-colors border-r border-b border-gray-100">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/></svg>
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-3xl font-extrabold tracking-tight leading-none" style={{ color: '#8b5cf6' }}>10×</p>
                  <p className="text-xs font-bold text-gray-700 mt-0.5">ROI vs Trade Shows</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 py-5 sm:py-8 px-3 sm:px-6 hover:bg-gray-50/60 transition-colors border-r border-b border-gray-100">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#fffbeb', color: '#f59e0b' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-3xl font-extrabold tracking-tight leading-none" style={{ color: '#f59e0b' }}>48h</p>
                  <p className="text-xs font-bold text-gray-700 mt-0.5">Setup to First Send</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container max-w-[1100px]">
            <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-14">Built for e-commerce growth teams</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"/></svg>, title:'Wholesale Buyer Outreach', desc:'Reach retail buyers, procurement managers, and category directors at major chains and independent retailers.' },
                { icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>, title:'Brand Partnership Campaigns', desc:'Automate outreach to potential brand collaborators, influencer agencies, and co-marketing partners.' },
                { icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"/></svg>, title:'Distributor Prospecting', desc:'Identify and contact distributors in your product category across any region or market.' },
                { icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>, title:'Cart Recovery Sequences', desc:'Re-engage B2B buyers who visited your wholesale portal but never completed their order.' },
                { icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>, title:'Revenue Attribution', desc:'Track which outreach campaigns drive actual purchase orders and wholesale account openings.' },
                { icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3"/></svg>, title:'Seasonal Campaign Automation', desc:'Set up automated campaigns timed to buying seasons, trade show periods, and Q4 purchasing cycles.' },
              ].map(f=>(
                <div key={f.title} className="border border-gray-100 rounded-2xl p-6 hover:shadow-sm transition-shadow flex flex-col h-full">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shrink-0">{f.icon}</div>
                  <h3 className="text-base font-bold text-gray-900">{f.title}</h3>
                  <p className="mt-2 text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-gray-50 py-20">
          <div className="container max-w-3xl text-center">
            <p className="text-xl text-gray-700 leading-relaxed italic">&ldquo;We opened 23 new wholesale accounts in 60 days using Leads Genie. Reaching retail buyers used to take months of trade shows — now we do it from our laptop with a 20% reply rate.&rdquo;</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <img src="https://i.pravatar.cc/150?img=44" alt="Tom Kim" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900">Tom Kim</p>
                <p className="text-xs text-gray-500">Head of Wholesale, Brightleaf Goods</p>
              </div>
            </div>
          </div>
        </section>

        <FAQAccordion />
      </main>
      <Footer />
    </div>
  );
}

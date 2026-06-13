import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

export default function EcommercePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        <section className="hero-gradient py-20 text-center">
          <div className="container max-w-3xl">
            <span className="inline-block text-xs font-bold bg-white/20 text-white rounded-full px-3 py-1 mb-5 uppercase tracking-widest">Use Case · E-commerce</span>
            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
              Prospect Wholesale Buyers<br />& Retail Partners at Scale
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

        <section className="py-12 border-b border-gray-100">
          <div className="container">
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100">
              <div className="flex items-center gap-4 py-8 px-6 hover:bg-gray-50/60 transition-colors">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                </div>
                <div>
                  <p className="text-2xl font-extrabold tracking-tight leading-none" style={{ color: '#3b82f6' }}>3,000+</p>
                  <p className="text-xs font-semibold text-gray-500 mt-1 leading-snug">E-commerce Brands</p>
                </div>
              </div>
              <div className="flex items-center gap-4 py-8 px-6 hover:bg-gray-50/60 transition-colors">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#f0fdf4', color: '#10b981' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/></svg>
                </div>
                <div>
                  <p className="text-2xl font-extrabold tracking-tight leading-none" style={{ color: '#10b981' }}>22%</p>
                  <p className="text-xs font-semibold text-gray-500 mt-1 leading-snug">Avg Buyer Reply Rate</p>
                </div>
              </div>
              <div className="flex items-center gap-4 py-8 px-6 hover:bg-gray-50/60 transition-colors">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/></svg>
                </div>
                <div>
                  <p className="text-2xl font-extrabold tracking-tight leading-none" style={{ color: '#8b5cf6' }}>10×</p>
                  <p className="text-xs font-semibold text-gray-500 mt-1 leading-snug">ROI vs Trade Shows</p>
                </div>
              </div>
              <div className="flex items-center gap-4 py-8 px-6 hover:bg-gray-50/60 transition-colors">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#fffbeb', color: '#f59e0b' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <div>
                  <p className="text-2xl font-extrabold tracking-tight leading-none" style={{ color: '#f59e0b' }}>48h</p>
                  <p className="text-xs font-semibold text-gray-500 mt-1 leading-snug">Setup to First Send</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container max-w-5xl">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-14">Built for e-commerce growth teams</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon:'🛒', title:'Wholesale Buyer Outreach',    desc:'Reach retail buyers, procurement managers, and category directors at major chains and independent retailers.' },
                { icon:'🤝', title:'Brand Partnership Campaigns', desc:'Automate outreach to potential brand collaborators, influencer agencies, and co-marketing partners.' },
                { icon:'🏪', title:'Distributor Prospecting',     desc:'Identify and contact distributors in your product category across any region or market.' },
                { icon:'📧', title:'Cart Recovery Sequences',     desc:'Re-engage B2B buyers who visited your wholesale portal but never completed their order.' },
                { icon:'📊', title:'Revenue Attribution',         desc:'Track which outreach campaigns drive actual purchase orders and wholesale account openings.' },
                { icon:'🔄', title:'Seasonal Campaign Automation',desc:'Set up automated campaigns timed to buying seasons, trade show periods, and Q4 purchasing cycles.' },
              ].map(f=>(
                <div key={f.title} className="border border-gray-200 rounded-2xl p-6 hover:shadow-sm transition-shadow">
                  <span className="text-3xl">{f.icon}</span>
                  <h3 className="mt-3 text-base font-bold text-gray-900">{f.title}</h3>
                  <p className="mt-2 text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-gray-50 py-20">
          <div className="container max-w-3xl text-center">
            <p className="text-xl text-gray-700 leading-relaxed italic">&ldquo;We opened 23 new wholesale accounts in 60 days using Lead Genie. Reaching retail buyers used to take months of trade shows — now we do it from our laptop with a 20% reply rate.&rdquo;</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <img src="https://i.pravatar.cc/150?img=44" alt="Tom Kim" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900">Tom Kim</p>
                <p className="text-xs text-gray-500">Head of Wholesale, Brightleaf Goods</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 text-center">
          <div className="container max-w-2xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Start reaching buyers today</h2>
            <p className="text-gray-500 text-base mb-8">14-day free trial. No credit card required.</p>
            <Link href="/signup" className="inline-flex items-center bg-gray-900 text-white font-bold text-sm rounded-full px-8 py-4 hover:bg-gray-700 transition-colors">
              Start Free Trial →
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

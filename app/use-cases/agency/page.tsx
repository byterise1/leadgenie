import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

export default function AgencyPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="hero-gradient py-20 text-center">
          <div className="container max-w-3xl">
            <span className="inline-block text-xs font-bold bg-white/20 text-white rounded-full px-3 py-1 mb-5 uppercase tracking-widest">Use Case · Agency</span>
            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
              Run Cold Email Campaigns<br />for All Your Clients
            </h1>
            <p className="mt-5 text-blue-100 text-lg max-w-xl mx-auto leading-relaxed">
              Manage unlimited client campaigns from one dashboard. Separate workspaces, dedicated
              sending domains, and white-label reporting — built for agencies that scale.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/signup" className="bg-white text-blue-700 font-bold text-sm rounded-full px-8 py-3.5 hover:bg-blue-50 transition-colors shadow-lg">Start Free Trial</Link>
              <Link href="/contact" className="border border-white/30 text-white font-semibold text-sm rounded-full px-8 py-3.5 hover:bg-white/10 transition-colors">Talk to Sales</Link>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-12 border-b border-gray-100">
          <div className="container">
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100">
              <div className="flex items-center gap-4 py-8 px-6 hover:bg-gray-50/60 transition-colors">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                </div>
                <div>
                  <p className="text-2xl font-extrabold tracking-tight leading-none" style={{ color: '#3b82f6' }}>500+</p>
                  <p className="text-xs font-semibold text-gray-500 mt-1 leading-snug">Agencies Trust Lead Genie</p>
                </div>
              </div>
              <div className="flex items-center gap-4 py-8 px-6 hover:bg-gray-50/60 transition-colors">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#f0fdf4', color: '#10b981' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/></svg>
                </div>
                <div>
                  <p className="text-2xl font-extrabold tracking-tight leading-none" style={{ color: '#10b981' }}>20%+</p>
                  <p className="text-xs font-semibold text-gray-500 mt-1 leading-snug">Avg Client Reply Rate</p>
                </div>
              </div>
              <div className="flex items-center gap-4 py-8 px-6 hover:bg-gray-50/60 transition-colors">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                </div>
                <div>
                  <p className="text-2xl font-extrabold tracking-tight leading-none" style={{ color: '#8b5cf6' }}>Unlimited</p>
                  <p className="text-xs font-semibold text-gray-500 mt-1 leading-snug">Client Workspaces</p>
                </div>
              </div>
              <div className="flex items-center gap-4 py-8 px-6 hover:bg-gray-50/60 transition-colors">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#fffbeb', color: '#f59e0b' }}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/></svg>
                </div>
                <div>
                  <p className="text-2xl font-extrabold tracking-tight leading-none" style={{ color: '#f59e0b' }}>4.9/5</p>
                  <p className="text-xs font-semibold text-gray-500 mt-1 leading-snug">Agency Rating on G2</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20">
          <div className="container max-w-5xl">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-14">Everything agencies need to scale cold email</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon:'🏢', title:'Client Workspaces',       desc:'Separate campaign dashboards, contacts, and analytics for every client. No data mixing.' },
                { icon:'📧', title:'Unlimited Sending Domains',desc:'Add dedicated sending domains for each client. Warmup runs automatically in the background.' },
                { icon:'📊', title:'White-label Reporting',   desc:'Send clients branded performance reports with open rates, reply rates, and meetings booked.' },
                { icon:'👥', title:'Team Collaboration',      desc:'Assign team members to specific client accounts with role-based access control.' },
                { icon:'🔄', title:'Campaign Templates',      desc:'Build a library of proven campaign sequences and re-use them across clients instantly.' },
                { icon:'📥', title:'Unified Inbox',           desc:'Manage replies for all clients from one Unibox. Filter by client, campaign, or intent.' },
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

        {/* Testimonial */}
        <section className="bg-gray-50 py-20">
          <div className="container max-w-3xl text-center">
            <p className="text-xl text-gray-700 leading-relaxed italic">&ldquo;Lead Genie is the backbone of our agency. We manage 40+ client campaigns from one dashboard, and our average client sees 20%+ reply rates within the first month. Nothing else comes close.&rdquo;</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <img src="https://i.pravatar.cc/150?img=47" alt="Mike Ellis" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900">Mike Ellis</p>
                <p className="text-xs text-gray-500">Co-Founder, Kale Acquisition</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 text-center">
          <div className="container max-w-2xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Start managing client campaigns today</h2>
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

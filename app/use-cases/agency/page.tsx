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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
              {[{v:'500+',l:'Agencies Trust LeadGenie'},{v:'20%+',l:'Avg Client Reply Rate'},{v:'Unlimited',l:'Client Workspaces'},{v:'4.9/5',l:'Agency Rating on G2'}].map(s=>(
                <div key={s.l}><p className="text-3xl font-extrabold text-gray-900">{s.v}</p><p className="mt-1.5 text-sm text-gray-500">{s.l}</p></div>
              ))}
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
            <p className="text-xl text-gray-700 leading-relaxed italic">&ldquo;LeadGenie is the backbone of our agency. We manage 40+ client campaigns from one dashboard, and our average client sees 20%+ reply rates within the first month. Nothing else comes close.&rdquo;</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">ME</div>
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

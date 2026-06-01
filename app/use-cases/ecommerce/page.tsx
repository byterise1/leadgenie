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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
              {[{v:'3,000+',l:'E-commerce Brands'},{v:'22%',l:'Avg Buyer Reply Rate'},{v:'10×',l:'ROI vs Trade Shows'},{v:'48h',l:'Setup to First Send'}].map(s=>(
                <div key={s.l}><p className="text-3xl font-extrabold text-gray-900">{s.v}</p><p className="mt-1.5 text-sm text-gray-500">{s.l}</p></div>
              ))}
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
            <p className="text-xl text-gray-700 leading-relaxed italic">&ldquo;We opened 23 new wholesale accounts in 60 days using LeadGenie. Reaching retail buyers used to take months of trade shows — now we do it from our laptop with a 20% reply rate.&rdquo;</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm">TK</div>
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

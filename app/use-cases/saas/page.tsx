import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

export default function SaaSPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        <section className="hero-gradient py-20 text-center">
          <div className="container max-w-3xl">
            <span className="inline-block text-xs font-bold bg-white/20 text-white rounded-full px-3 py-1 mb-5 uppercase tracking-widest">Use Case · SaaS</span>
            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
              Drive SaaS Signups &amp;<br />Demos With Cold Email
            </h1>
            <p className="mt-5 text-blue-100 text-lg max-w-xl mx-auto leading-relaxed">
              Reach your ideal users before they find your competitors. LeadGenie helps SaaS
              companies build a predictable outbound pipeline at any stage.
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
              {[{v:'2,000+',l:'SaaS Companies'},{v:'61%',l:'Avg Open Rate'},{v:'10×',l:'ROI on Outbound'},{v:'14 days',l:'To First Meetings'}].map(s=>(
                <div key={s.l}><p className="text-3xl font-extrabold text-gray-900">{s.v}</p><p className="mt-1.5 text-sm text-gray-500">{s.l}</p></div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container max-w-5xl">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-14">Outbound that works at every growth stage</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon:'🚀', title:'Early-stage Traction',    desc:'Find your first 100 customers fast. Target exact personas at companies that fit your ICP.' },
                { icon:'📈', title:'Demo Booking at Scale',   desc:'Automate demo request follow-ups and book calls directly into your team\'s calendar.' },
                { icon:'🔁', title:'Expansion Outreach',      desc:'Re-engage churned users or upsell existing customers with personalised campaigns.' },
                { icon:'🎯', title:'Competitor Targeting',    desc:'Reach customers of competing tools at the moment they\'re most likely to switch.' },
                { icon:'✉️', title:'Trial-to-Paid Campaigns', desc:'Follow up with free trial users who haven\'t converted with targeted cold email sequences.' },
                { icon:'📊', title:'Attribution Tracking',    desc:'See which campaigns lead to signups, demos, and closed deals — not just opens and clicks.' },
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
            <p className="text-xl text-gray-700 leading-relaxed italic">&ldquo;Our open rates jumped from 28% to 61% after switching to LeadGenie. The AI personalisation is genuinely impressive — it sounds human on every email.&rdquo;</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm">AB</div>
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900">Alex Baldovin</p>
                <p className="text-xs text-gray-500">CEO, Authbound</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 text-center">
          <div className="container max-w-2xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Start driving SaaS growth today</h2>
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

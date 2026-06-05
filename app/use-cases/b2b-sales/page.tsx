import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

export default function B2BSalesPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        <section className="hero-gradient py-20 text-center">
          <div className="container max-w-3xl">
            <span className="inline-block text-xs font-bold bg-white/20 text-white rounded-full px-3 py-1 mb-5 uppercase tracking-widest">Use Case · B2B Sales</span>
            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
              Fill Your Pipeline With<br />Qualified Meetings
            </h1>
            <p className="mt-5 text-blue-100 text-lg max-w-xl mx-auto leading-relaxed">
              Stop relying on inbound alone. LeadGenie automates your outbound so your sales team
              spends time closing — not prospecting.
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
              {[{v:'47',l:'Avg Meetings Booked / Month'},{v:'18%',l:'Avg Reply Rate'},{v:'3×',l:'Faster Than Manual Prospecting'},{v:'$0',l:'Extra SDR Cost'}].map(s=>(
                <div key={s.l}><p className="text-3xl font-extrabold text-gray-900">{s.v}</p><p className="mt-1.5 text-sm text-gray-500">{s.l}</p></div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container max-w-5xl">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-14">Your full outbound stack, in one place</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon:'🎯', title:'ICP Targeting',            desc:'Build prospect lists by job title, company size, industry, revenue, and 50+ other filters.' },
                { icon:'✉️', title:'AI Personalisation',       desc:'AI writes a personalised first line for every prospect using their LinkedIn and company data.' },
                { icon:'🔄', title:'Automated Follow-ups',     desc:'Set it and forget it. LeadGenie sends follow-ups at the right time and stops when someone replies.' },
                { icon:'📥', title:'Unified Inbox',            desc:'All replies from all accounts in one place. Label them Interested, Not Now, or Do Not Contact.' },
                { icon:'📊', title:'Pipeline Reporting',       desc:'Track open, click, reply, and meeting rates. See exactly which campaigns drive real pipeline.' },
                { icon:'🔗', title:'CRM Sync',                 desc:'Automatically push interested replies and booked meetings to HubSpot or Salesforce.' },
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
            <p className="text-xl text-gray-700 leading-relaxed italic">&ldquo;We booked 47 qualified meetings in our first month. The campaign builder is incredibly intuitive — I had our first 5-step sequence running in under 20 minutes.&rdquo;</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <img src="https://i.pravatar.cc/150?img=68" alt="Briken Bufi" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900">Briken Bufi</p>
                <p className="text-xs text-gray-500">CEO & Co-Founder, Aella Creative Force</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 text-center">
          <div className="container max-w-2xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Start filling your pipeline today</h2>
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

import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

export default function ConsultingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        <section className="hero-gradient py-20 text-center">
          <div className="container max-w-3xl">
            <span className="inline-block text-xs font-bold bg-white/20 text-white rounded-full px-3 py-1 mb-5 uppercase tracking-widest">Use Case · Consulting</span>
            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
              Fill Your Calendar With<br />Qualified Discovery Calls
            </h1>
            <p className="mt-5 text-blue-100 text-lg max-w-xl mx-auto leading-relaxed">
              Consultants and advisory firms use LeadGenie to automate outreach to their ideal
              clients — so they spend less time prospecting and more time delivering results.
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
              {[{v:'1,200+',l:'Consulting Firms'},{v:'28%',l:'Avg Discovery Call Rate'},{v:'5×',l:'More Leads vs Referrals Only'},{v:'2 hrs',l:'Saved on Prospecting Daily'}].map(s=>(
                <div key={s.l}><p className="text-3xl font-extrabold text-gray-900">{s.v}</p><p className="mt-1.5 text-sm text-gray-500">{s.l}</p></div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container max-w-5xl">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-14">Stop relying only on referrals</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon:'📅', title:'Discovery Call Booking',      desc:'Automate outreach to decision-makers and link directly to your Calendly. Prospects book calls without manual back-and-forth.' },
                { icon:'🎯', title:'Niche Targeting',              desc:'Reach CEOs, CFOs, and VPs at companies in your specific industry or revenue range with pinpoint precision.' },
                { icon:'✉️', title:'Authority-building Outreach',  desc:'Share insights, research, or frameworks in your cold emails to position yourself as an expert before the first call.' },
                { icon:'🔄', title:'Long-cycle Follow-ups',        desc:'Nurture cold prospects with multi-month sequences. Stay top-of-mind until they\'re ready to buy.' },
                { icon:'📊', title:'Proposal Pipeline Tracking',   desc:'Track which outreach leads to discovery calls, proposals sent, and contracts signed.' },
                { icon:'🤖', title:'AI-personalised First Lines',  desc:'LeadGenie AI references each prospect\'s recent work, press mentions, or LinkedIn activity in every opening line.' },
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
            <p className="text-xl text-gray-700 leading-relaxed italic">&ldquo;I used to spend 2 hours a day on LinkedIn looking for leads. Now LeadGenie does it automatically and I get 8–12 discovery calls booked every month on autopilot. My pipeline has never been healthier.&rdquo;</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <div className="h-10 w-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">DM</div>
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900">David Marsh</p>
                <p className="text-xs text-gray-500">Principal, Marsh Strategy Group</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 text-center">
          <div className="container max-w-2xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Start booking discovery calls today</h2>
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

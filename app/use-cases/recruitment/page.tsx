import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

export default function RecruitmentPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        <section className="hero-gradient py-20 text-center">
          <div className="container max-w-3xl">
            <span className="inline-block text-xs font-bold bg-white/20 text-white rounded-full px-3 py-1 mb-5 uppercase tracking-widest">Use Case · Recruitment</span>
            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
              Reach Passive Candidates<br />Before Anyone Else
            </h1>
            <p className="mt-5 text-blue-100 text-lg max-w-xl mx-auto leading-relaxed">
              The best candidates aren't applying. LeadGenie helps recruiters run personalised
              outreach at scale to fill roles faster without relying on job boards.
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
              {[{v:'3×',l:'More Candidates Reached'},{v:'25%',l:'Avg Response Rate'},{v:'50%',l:'Faster Time-to-Hire'},{v:'10×',l:'ROI vs Job Boards'}].map(s=>(
                <div key={s.l}><p className="text-3xl font-extrabold text-gray-900">{s.v}</p><p className="mt-1.5 text-sm text-gray-500">{s.l}</p></div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container max-w-5xl">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-14">Built for modern recruiting teams</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon:'🎯', title:'Passive Candidate Targeting',  desc:'Find candidates by role, seniority, company, tech stack, and location — even if they\'re not actively looking.' },
                { icon:'✉️', title:'Personalised Outreach at Scale', desc:'AI writes personalised emails for every candidate based on their experience and background.' },
                { icon:'🔄', title:'Multi-step Follow-ups',         desc:'Automatically follow up 2–3 times with candidates who don\'t reply. Set delays and stop on response.' },
                { icon:'📥', title:'Unified Inbox',                 desc:'Manage all candidate replies from every sending account in one clean inbox.' },
                { icon:'📊', title:'Sourcing Analytics',            desc:'Track response rates by role, location, seniority level, and message template.' },
                { icon:'🔗', title:'ATS Integration',               desc:'Push interested candidates directly into your ATS with one click via Zapier or API.' },
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
            <p className="text-xl text-gray-700 leading-relaxed italic">&ldquo;We used to spend hours on LinkedIn finding candidates. Now LeadGenie does it automatically and we spend our time on actual interviews. Our placement rate is up 40%.&rdquo;</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">SR</div>
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900">Sarah Reynolds</p>
                <p className="text-xs text-gray-500">Head of Talent, Growthbound Recruiting</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 text-center">
          <div className="container max-w-2xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Start sourcing passive candidates today</h2>
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

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
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100">
              <div className="flex items-center gap-4 py-8 px-6 hover:bg-gray-50/60 transition-colors">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                </div>
                <div>
                  <p className="text-2xl font-extrabold tracking-tight leading-none" style={{ color: '#3b82f6' }}>3×</p>
                  <p className="text-xs font-semibold text-gray-500 mt-1 leading-snug">More Candidates Reached</p>
                </div>
              </div>
              <div className="flex items-center gap-4 py-8 px-6 hover:bg-gray-50/60 transition-colors">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#f0fdf4', color: '#10b981' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/></svg>
                </div>
                <div>
                  <p className="text-2xl font-extrabold tracking-tight leading-none" style={{ color: '#10b981' }}>25%</p>
                  <p className="text-xs font-semibold text-gray-500 mt-1 leading-snug">Avg Response Rate</p>
                </div>
              </div>
              <div className="flex items-center gap-4 py-8 px-6 hover:bg-gray-50/60 transition-colors">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <div>
                  <p className="text-2xl font-extrabold tracking-tight leading-none" style={{ color: '#8b5cf6' }}>50%</p>
                  <p className="text-xs font-semibold text-gray-500 mt-1 leading-snug">Faster Time-to-Hire</p>
                </div>
              </div>
              <div className="flex items-center gap-4 py-8 px-6 hover:bg-gray-50/60 transition-colors">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#fffbeb', color: '#f59e0b' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/></svg>
                </div>
                <div>
                  <p className="text-2xl font-extrabold tracking-tight leading-none" style={{ color: '#f59e0b' }}>10×</p>
                  <p className="text-xs font-semibold text-gray-500 mt-1 leading-snug">ROI vs Job Boards</p>
                </div>
              </div>
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
              <img src="https://i.pravatar.cc/150?img=5" alt="Sarah Reynolds" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
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

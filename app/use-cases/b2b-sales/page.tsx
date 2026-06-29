import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FAQAccordion } from '@/components/FAQAccordion';
import Link from 'next/link';

const features = [
  {
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>,
    title: 'ICP Targeting', desc: 'Build prospect lists by job title, company size, industry, revenue, and 50+ other filters.',
  },
  {
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>,
    title: 'AI Personalisation', desc: 'AI writes a personalised first line for every prospect using their LinkedIn and company data.',
  },
  {
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3"/></svg>,
    title: 'Automated Follow-ups', desc: 'Set it and forget it. Leads Genie sends follow-ups at the right time and stops when someone replies.',
  },
  {
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z"/></svg>,
    title: 'Unified Inbox', desc: 'All replies from all accounts in one place. Label them Interested, Not Now, or Do Not Contact.',
  },
  {
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>,
    title: 'Pipeline Reporting', desc: 'Track open, click, reply, and meeting rates. See exactly which campaigns drive real pipeline.',
  },
  {
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"/></svg>,
    title: 'CRM Sync', desc: 'Automatically push interested replies and booked meetings to HubSpot or Salesforce.',
  },
];

export default function B2BSalesPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 dark:text-white">
      <Navbar />
      <main>
        <section className="hero-gradient pb-24 pt-20 text-center">
          <div className="container">
            <span className="inline-block text-xs font-bold bg-white/20 text-white rounded-full px-3 py-1 mb-5 uppercase tracking-widest">Use Case — B2B Sales</span>
            <h1 className="text-[28px] sm:text-4xl md:text-5xl lg:text-[60px] font-extrabold text-white leading-[1.08] tracking-tight">
              Fill Your Pipeline With Qualified Meetings
            </h1>
            <p className="mt-5 text-blue-100 text-lg max-w-xl mx-auto leading-relaxed">
              Stop relying on inbound alone. Leads Genie automates your outbound so your sales team
              spends time closing — not prospecting.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/signup" className="bg-white text-blue-700 font-bold text-sm rounded-full px-8 py-3.5 hover:bg-blue-50 transition-colors shadow-lg">Start Free Trial</Link>
              <Link href="/contact" className="border border-white/30 text-white font-semibold text-sm rounded-full px-8 py-3.5 hover:bg-white/10 transition-colors">Talk to Sales</Link>
            </div>
          </div>
        </section>

        <section className="border-b border-gray-100 dark:border-gray-800">
          <div className="container px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 border-l border-t border-gray-100 dark:border-gray-800">
              {[
                { v: '47', l: 'Avg Meetings / Month', color: '#3b82f6', bg: '#eff6ff', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg> },
                { v: '18%', l: 'Avg Reply Rate', color: '#10b981', bg: '#f0fdf4', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/></svg> },
                { v: '3×', l: 'Faster Than Manual', color: '#8b5cf6', bg: '#f5f3ff', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/></svg> },
                { v: '$0', l: 'Extra SDR Cost', color: '#059669', bg: '#ecfdf5', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
              ].map(s => (
                <div key={s.l} className="flex items-center gap-2 sm:gap-4 py-5 sm:py-8 px-3 sm:px-6 hover:bg-gray-50/60 transition-colors border-r border-b border-gray-100 dark:border-gray-800">
                  <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-3xl font-extrabold tracking-tight leading-none" style={{ color: s.color }}>{s.v}</p>
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-200 mt-0.5 leading-tight">{s.l}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container max-w-[1100px]">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white text-center mb-14">Your full outbound stack, in one place</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map(f => (
                <div key={f.title} className="border border-gray-100 dark:border-gray-800 rounded-2xl p-6 hover:shadow-sm transition-shadow flex flex-col h-full">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 shrink-0">{f.icon}</div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">{f.title}</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-gray-50 dark:bg-gray-800 py-20">
          <div className="container max-w-3xl text-center">
            <p className="text-xl text-gray-700 dark:text-gray-200 leading-relaxed italic">&ldquo;We booked 47 qualified meetings in our first month. The campaign builder is incredibly intuitive — I had our first 5-step sequence running in under 20 minutes.&rdquo;</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <img src="https://i.pravatar.cc/150?img=68" alt="Briken Bufi" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900 dark:text-white">Briken Bufi</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-500">CEO & Co-Founder, Aella Creative Force</p>
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

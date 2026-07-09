import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FAQAccordion } from '@/components/FAQAccordion';
import Link from 'next/link';

export const metadata = {
  title: 'About Us — Leads Genie',
  description: 'Learn about the team behind Leads Genie — built by outbound sales practitioners to help businesses book more meetings through smarter cold email outreach.',
};

const aboutFaqs = [
  { q: 'Who built Leads Genie?', a: 'Leads Genie was built by a team of outbound sales practitioners who were frustrated with tools that promised deliverability but underdelivered. We built the platform we always wanted and opened it to the world.' },
  { q: 'When was Leads Genie founded?', a: 'Founded in 2022, Leads Genie has grown to serve thousands of sales teams, agencies, and founders across the globe.' },
  { q: 'Is Leads Genie compliant with email regulations?', a: 'Yes. We enforce CAN-SPAM and GDPR compliance on every account with mandatory unsubscribe links, opt-out tracking, and suppression lists.' },
  { q: 'Do you have a partner or affiliate program?', a: 'Yes — reach out to partners@leadsgenie.site to learn about our referral and reseller programs.' },
  { q: 'How do I get support?', a: 'Use the Help Center inside your dashboard for the fastest response. You can also email help@leadsgenie.site for account-specific queries.' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 dark:text-white">
      <Navbar />
      <main>
        <section className="hero-gradient pb-24 pt-20 text-center">
          <div className="container">
            <span className="inline-block text-xs font-bold bg-white/20 text-white rounded-full px-3 py-1 mb-5 uppercase tracking-widest">Company</span>
            <h1 className="text-[28px] sm:text-4xl md:text-5xl lg:text-[60px] font-extrabold text-white leading-[1.08] tracking-tight">
              Built for cold email teams who want real results
            </h1>
            <p className="mt-6 text-blue-100 text-lg leading-relaxed max-w-2xl mx-auto">
              Leads Genie was built by a team of outbound sales practitioners who were frustrated
              with tools that promised deliverability but couldn&apos;t deliver. We built the platform
              we always wanted — and opened it up to the world.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup" className="bg-white text-blue-700 text-sm font-bold rounded-full px-8 py-3.5 hover:bg-blue-50 transition-colors shadow-lg w-full sm:w-auto text-center">
                Start For Free
              </Link>
              <Link href="/contact" className="border border-white/30 text-white text-sm font-semibold rounded-full px-8 py-3.5 hover:bg-white/10 transition-colors w-full sm:w-auto text-center">
                Contact Us
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container max-w-4xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center mb-16">
              {[
                { v: '2022',   l: 'Founded'          },
                { v: '8,500+', l: 'Active users'     },
                { v: '42M+',   l: 'Emails delivered' },
              ].map(s => (
                <div key={s.l}>
                  <p className="text-4xl font-extrabold text-gray-900 dark:text-white">{s.v}</p>
                  <p className="mt-2 text-gray-500 dark:text-gray-500 font-medium">{s.l}</p>
                </div>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {[
                { title: 'Our Mission', desc: 'To make professional cold email outreach accessible to every business — from solo founders to enterprise sales teams — with tools that actually improve deliverability and drive real pipeline.' },
                { title: 'Our Values',  desc: 'We believe in ethical outreach. We help businesses reach the right people with the right message. We actively fight spam, maintain strict acceptable use policies, and cooperate with email providers to keep the ecosystem healthy.' },
              ].map(item => (
                <div key={item.title} className="border border-gray-100 dark:border-gray-800 rounded-2xl p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{item.title}</h2>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <FAQAccordion faqs={aboutFaqs} />
      </main>
      <Footer />
    </div>
  );
}

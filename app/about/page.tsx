import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FAQAccordion } from '@/components/FAQAccordion';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        <section className="hero-gradient py-20 text-center">
          <div className="container">
            <span className="inline-block text-xs font-bold bg-white/20 text-white rounded-full px-3 py-1 mb-5 uppercase tracking-widest">Company</span>
            <h1 className="text-4xl sm:text-5xl lg:text-[60px] font-extrabold text-white leading-[1.08] tracking-tight">
              Built for cold email teams<br />who want real results
            </h1>
            <p className="mt-6 text-blue-100 text-lg leading-relaxed max-w-2xl mx-auto">
              Leads Genie was built by a team of outbound sales practitioners who were frustrated
              with tools that promised deliverability but couldn&apos;t deliver. We built the platform
              we always wanted — and opened it up to the world.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <Link href="/signup" className="bg-white text-blue-700 text-sm font-bold rounded-full px-8 py-3.5 hover:bg-blue-50 transition-colors shadow-lg">
                Start For Free
              </Link>
              <Link href="/contact" className="border border-white/30 text-white text-sm font-semibold rounded-full px-8 py-3.5 hover:bg-white/10 transition-colors">
                Contact Us
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container max-w-4xl">
            <div className="grid sm:grid-cols-3 gap-8 text-center mb-16">
              {[
                { v: '2022',    l: 'Founded'         },
                { v: '30,000+', l: 'Active users'    },
                { v: '500M+',   l: 'Emails delivered' },
              ].map(s => (
                <div key={s.l}>
                  <p className="text-4xl font-extrabold text-gray-900">{s.v}</p>
                  <p className="mt-2 text-gray-500 font-medium">{s.l}</p>
                </div>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {[
                { title: 'Our Mission', desc: 'To make professional cold email outreach accessible to every business — from solo founders to enterprise sales teams — with tools that actually improve deliverability and drive real pipeline.' },
                { title: 'Our Values',  desc: 'We believe in ethical outreach. We help businesses reach the right people with the right message. We actively fight spam, maintain strict acceptable use policies, and cooperate with email providers to keep the ecosystem healthy.' },
              ].map(item => (
                <div key={item.title} className="border border-gray-100 rounded-2xl p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h2>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <FAQAccordion />
      </main>
      <Footer />
    </div>
  );
}

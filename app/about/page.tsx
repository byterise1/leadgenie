import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        <section className="border-b border-gray-100 py-20 text-center">
          <div className="container max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Company</p>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
              Built for cold email teams<br />who want real results
            </h1>
            <p className="mt-6 text-gray-500 text-lg leading-relaxed max-w-2xl mx-auto">
              Lead Genie was built by a team of outbound sales practitioners who were frustrated
              with tools that promised deliverability but couldn&apos;t deliver. We built the platform
              we always wanted — and opened it up to the world.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <Link href="/signup" className="bg-gray-900 text-white text-sm font-semibold rounded-full px-7 py-3 hover:bg-gray-700 transition-colors">
                Start For Free
              </Link>
              <Link href="/contact" className="border border-gray-200 text-gray-700 text-sm font-semibold rounded-full px-7 py-3 hover:bg-gray-50 transition-colors">
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
                <div key={item.title} className="border border-gray-200 rounded-2xl p-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h2>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

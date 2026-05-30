import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const cookies = [
  {
    label: 'Essential cookies',
    description: 'Required to keep you signed in, secure, and able to navigate the AstraFlow platform.',
  },
  {
    label: 'Analytics cookies',
    description: 'Help us understand how teams use the platform so we can improve performance and product decisions.',
  },
  {
    label: 'Preference cookies',
    description: 'Remember your display settings, language preferences, and interface choices for a seamless experience.',
  },
];

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <Navbar />
      <main className="container space-y-14 py-20">
        <section className="space-y-4 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-900">Cookie policy</p>
          <h1 className="text-5xl font-semibold tracking-tight text-slate-950">Only the cookies your business needs for a premium experience.</h1>
          <p className="mx-auto max-w-3xl text-base leading-8 text-slate-600">
            AstraFlow uses cookies to make the platform secure, responsive, and highly personalized without unnecessary tracking.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {cookies.map((cookie) => (
            <article key={cookie.label} className="rounded-[32px] border border-slate-200 bg-slate-100 p-8 shadow-soft">
              <h2 className="text-xl font-semibold text-slate-950">{cookie.label}</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">{cookie.description}</p>
            </article>
          ))}
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-10 shadow-soft">
          <h2 className="text-3xl font-semibold text-slate-950">Manage preferences</h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            Users can opt out of analytics and preference cookies at any time while continued use of essential cookies is required for platform security and session management.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

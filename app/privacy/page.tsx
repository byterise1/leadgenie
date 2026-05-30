import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const sections = [
  {
    title: 'Data integrity and secure storage',
    content: 'We minimize data collection to what is essential for your experience and process it using modern encryption, access controls, and secure infrastructure.',
  },
  {
    title: 'AI models and customer signals',
    content: 'AstraFlow uses anonymized interaction metadata to power lead scoring, campaign recommendations, and email optimization without storing unnecessary personal data.',
  },
  {
    title: 'Cookies and tracking',
    content: 'We use functional cookies to keep your session secure and analytics cookies to identify product opportunities. You can manage your preferences on the Cookies page.',
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <Navbar />
      <main className="container space-y-14 py-20">
        <section className="space-y-4 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-900">Privacy policy</p>
          <h1 className="text-5xl font-semibold tracking-tight text-slate-950">We built privacy into every interaction and product layer.</h1>
          <p className="mx-auto max-w-3xl text-base leading-8 text-slate-600">
            AstraFlow is designed to protect customer data, maintain compliance with global privacy frameworks, and offer transparency for every business process.
          </p>
        </section>

        <section className="grid gap-10 lg:grid-cols-3">
          <article className="rounded-[32px] border border-slate-200 bg-slate-100 p-8">
            <h2 className="text-2xl font-semibold text-slate-950">Principles</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">We believe in data minimization, purpose limitation, and secure automation for revenue teams that value trust.</p>
          </article>
          {sections.map((section) => (
            <article key={section.title} className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-soft">
              <h3 className="text-xl font-semibold text-slate-950">{section.title}</h3>
              <p className="mt-4 text-sm leading-7 text-slate-600">{section.content}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-8 lg:grid-cols-[0.6fr_1fr]">
          <div className="rounded-[32px] border border-slate-200 bg-slate-950 p-10 text-white shadow-glow">
            <h2 className="text-3xl font-semibold">Your control center</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Manage permissions, export your account data, and view the privacy settings that keep outreach campaigns aligned with corporate policies.
            </p>
          </div>
          <div className="space-y-6 rounded-[32px] border border-slate-200 bg-white p-10 shadow-soft">
            {['Account data requests', 'Email and lead consent', 'Security monitoring'].map((item) => (
              <div key={item} className="rounded-[28px] bg-slate-100 p-6">
                <h3 className="text-lg font-semibold text-slate-950">{item}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{`AstraFlow provides clear controls and logs for ${item.toLowerCase()}.`}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

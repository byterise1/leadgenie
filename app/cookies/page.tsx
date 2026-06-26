import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const cookieTypes = [
  {
    name: 'Strictly Necessary Cookies',
    required: true,
    desc: 'These cookies are essential for the Leads Genie platform to function. They enable core features such as user authentication, session management, and security. You cannot opt out of these cookies.',
    examples: ['Session token', 'CSRF protection', 'Load balancer affinity'],
  },
  {
    name: 'Analytics Cookies',
    required: false,
    desc: 'We use analytics cookies to understand how users interact with Leads Genie â€” which features are most used, where users drop off, and how to improve the product. Data is aggregated and anonymised.',
    examples: ['Page views', 'Feature usage', 'Session duration', 'Funnel analysis'],
  },
  {
    name: 'Functional Cookies',
    required: false,
    desc: 'These cookies remember your preferences and settings to provide a more personalised experience â€” such as your timezone, notification preferences, and UI layout choices.',
    examples: ['UI preferences', 'Language settings', 'Dashboard layout'],
  },
  {
    name: 'Marketing Cookies',
    required: false,
    desc: 'Marketing cookies help us measure the effectiveness of our advertising campaigns and show relevant ads. These are only set if you have given explicit consent.',
    examples: ['Ad click attribution', 'Retargeting', 'Conversion tracking'],
  },
];

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        {/* Header */}
        <section className="border-b border-gray-100 py-16 text-center">
          <div className="container max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Legal</p>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">Cookie Policy</h1>
            <p className="mt-4 text-gray-500 text-base">
              Last updated: June 1, 2026
            </p>
            <p className="mt-4 text-gray-600 text-base leading-relaxed max-w-2xl mx-auto">
              This Cookie Policy explains how Leads Genie uses cookies and similar tracking
              technologies when you visit our website or use our platform.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-16">
          <div className="container max-w-3xl space-y-12">

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">What Are Cookies?</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                Cookies are small text files placed on your device by websites you visit.
                They are widely used to make websites work efficiently and to provide information
                to site owners. Cookies can be "session" cookies (deleted when you close your
                browser) or "persistent" cookies (remain on your device for a set period).
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Cookies We Use</h2>
              <div className="space-y-5">
                {cookieTypes.map(ct => (
                  <div key={ct.name} className="border border-gray-200 rounded-2xl p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <h3 className="text-base font-bold text-gray-900">{ct.name}</h3>
                      <span className={`text-xs font-bold rounded-full px-2.5 py-1 shrink-0 ${
                        ct.required
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {ct.required ? 'Required' : 'Optional'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed mb-3">{ct.desc}</p>
                    <div className="flex flex-wrap gap-2">
                      {ct.examples.map(ex => (
                        <span key={ex} className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-gray-500">{ex}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Third-Party Cookies</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                Some cookies are placed by third-party services we use. These include:
              </p>
              <div className="space-y-3">
                {[
                  { name: 'Stripe',          purpose: 'Payment processing and fraud prevention' },
                  { name: 'Intercom',         purpose: 'Customer support chat widget' },
                  { name: 'Google Analytics', purpose: 'Website traffic analysis (anonymised)' },
                  { name: 'Cloudflare',       purpose: 'Security, DDoS protection, and performance' },
                ].map(tp => (
                  <div key={tp.name} className="flex items-center gap-3 text-sm">
                    <span className="font-semibold text-gray-900 w-36 shrink-0">{tp.name}</span>
                    <span className="text-gray-500">{tp.purpose}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Managing Your Cookie Preferences</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                You can control cookies in the following ways:
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">â€¢</span><span><strong>Cookie banner:</strong> When you first visit Leads Genie, you can accept or reject optional cookies via our consent banner.</span></li>
                <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">â€¢</span><span><strong>Browser settings:</strong> Most browsers allow you to block or delete cookies. See your browser&apos;s help documentation for instructions.</span></li>
                <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">â€¢</span><span><strong>Google Analytics opt-out:</strong> Install the Google Analytics Opt-out Browser Add-on at tools.google.com/dlpage/gaoptout.</span></li>
                <li className="flex items-start gap-2"><span className="text-blue-500 mt-1">â€¢</span><span><strong>Account settings:</strong> Logged-in users can manage preferences in Settings â€” Privacy.</span></li>
              </ul>
              <p className="text-sm text-gray-500 mt-4">
                Note: Blocking strictly necessary cookies will prevent the platform from functioning correctly.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Updates to This Policy</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                We may update this Cookie Policy when we add new features or third-party services.
                The &quot;Last updated&quot; date at the top of this page reflects the most recent version.
                We encourage you to review this policy periodically.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Contact</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                If you have questions about our use of cookies, contact us at{' '}
                <a href="mailto:privacy@leadsgenie.io" className="text-blue-600 hover:underline">privacy@leadsgenie.io</a>.
              </p>
            </div>

          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

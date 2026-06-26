import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

export default function AntiSpamPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        <section className="border-b border-gray-100 py-16 text-center">
          <div className="container max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Legal</p>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">Anti-Spam Policy</h1>
            <p className="mt-4 text-gray-500 text-base">Last updated: June 1, 2026</p>
            <p className="mt-4 text-gray-600 text-base leading-relaxed max-w-2xl mx-auto">
              Leads Genie is a tool for professional outreach. We have zero tolerance for spam.
              This policy explains what is and isn&apos;t allowed on our platform.
            </p>
          </div>
        </section>
        <section className="py-16">
          <div className="container max-w-3xl space-y-10">
            {[
              { title: 'What Is Prohibited', content: `The following uses of Leads Genie are strictly prohibited and will result in immediate account termination:

• Sending unsolicited bulk email (spam) to recipients who have not opted in
• Purchasing or using scraped/harvested email lists
• Sending emails with false or misleading "From" names or subject lines
• Disguising the origin of emails (header spoofing)
• Continuing to email recipients who have opted out or unsubscribed
• Using Leads Genie for phishing, malware distribution, or fraud
• Violating CAN-SPAM, GDPR, CASL, or any applicable anti-spam law` },
              { title: 'What Is Permitted', content: `Leads Genie is designed for legitimate business outreach, including:

• Cold emailing prospects who fit your ideal customer profile for a relevant business offer
• Following up on previous conversations or warm leads
• Outreach to contacts you have a legitimate business reason to contact
• Emailing existing customers about relevant products or updates (with opt-out mechanism)

All emails sent through Leads Genie must include a clear, functional unsubscribe mechanism. Opt-out requests must be honoured within 10 business days.` },
              { title: 'Our Enforcement', content: 'We actively monitor for spam-related activity including high bounce rates, spam complaint rates, and unsubscribe patterns. Accounts that exceed our thresholds are automatically flagged and reviewed. Accounts in violation of this policy are suspended without refund.' },
              { title: 'Reporting Spam', content: 'If you believe a Leads Genie customer is sending spam, please report it to abuse@leadgenie.io with a copy of the email including full headers. We investigate all reports and take swift action against violators.' },
              { title: 'Legal Compliance', content: 'Users are solely responsible for ensuring their campaigns comply with all applicable laws, including CAN-SPAM (US), CASL (Canada), GDPR (EU/UK), and any other jurisdiction-specific regulations. When in doubt, consult legal counsel before launching a campaign.' },
            ].map(s => (
              <div key={s.title}>
                <h2 className="text-xl font-bold text-gray-900 mb-3">{s.title}</h2>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{s.content}</p>
              </div>
            ))}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
              <p className="text-sm font-semibold text-blue-900 mb-2">Questions about compliance?</p>
              <p className="text-sm text-blue-700 leading-relaxed">
                Our team is happy to review your use case and confirm it meets our policies.{' '}
                <Link href="/contact" className="underline font-semibold">Contact us</Link> or email compliance@leadgenie.io.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

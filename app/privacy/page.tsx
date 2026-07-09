import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { LegalContent } from '@/components/LegalContent';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 dark:text-white">
      <Navbar />
      <main>
        {/* Header */}
        <section className="border-b border-gray-100 dark:border-gray-800 py-16 text-center">
          <div className="container max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Legal</p>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white leading-tight">Privacy Policy</h1>
            <p className="mt-4 text-gray-500 dark:text-gray-500 text-base leading-relaxed">
              Last updated: June 1, 2026 — Effective: June 1, 2026
            </p>
            <p className="mt-4 text-gray-600 dark:text-gray-300 text-base leading-relaxed max-w-2xl mx-auto">
              At Leads Genie, we take your privacy seriously. This policy explains what data we
              collect, how we use it, and the controls you have over your information.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-16">
          <div className="container max-w-3xl">
            <div className="space-y-12">

              {[
                {
                  title: '1. Information We Collect',
                  content: `We collect information you provide directly to us when you create an account, subscribe to a plan, or contact our support team. This includes:

• Account information: name, email address, company name, and password
• Billing information: credit card details processed securely via Stripe (we never store card numbers)
• Campaign data: email addresses you upload as prospects, email templates, and campaign settings
• Usage data: how you interact with the Leads Genie platform, features used, and session data
• Communication data: support tickets and emails you send to our team

We also automatically collect technical data such as IP address, browser type, device information, and cookies when you use our platform.`,
                },
                {
                  title: '2. How We Use Your Information',
                  content: `We use the information we collect to:

• Provide, operate, and improve the Leads Genie platform
• Process your payments and manage your subscription
• Send transactional emails (receipts, password resets, account alerts)
• Send product updates and newsletters (you may unsubscribe at any time)
• Respond to support requests and provide customer service
• Detect, prevent, and address fraud, abuse, and security issues
• Comply with legal obligations and enforce our Terms of Service

We do not sell your personal data to third parties. We do not use your prospect lists for our own marketing purposes.`,
                },
                {
                  title: '3. Your Email Campaigns & Prospect Data',
                  content: `When you upload prospect lists and run email campaigns through Leads Genie, you are the data controller for that contact data. You are responsible for ensuring you have a lawful basis to contact those prospects and that your outreach complies with applicable laws (CAN-SPAM, GDPR, CASL, etc.).

Leads Genie acts as a data processor for your prospect data. We process this data solely to deliver your campaigns and provide the service. We do not access, read, or use your prospect data for any other purpose.

We strongly require that all users comply with anti-spam laws. Sending unsolicited bulk email is strictly prohibited and will result in immediate account suspension.`,
                },
                {
                  title: '4. Data Sharing & Third Parties',
                  content: `We share your information only in the following limited circumstances:

• Service providers: We use trusted third parties to help operate our platform (e.g., Stripe for payments, AWS for hosting, Postmark for transactional email). These partners are contractually bound to protect your data.
• Integrations: If you connect third-party tools (HubSpot, Salesforce, Zapier, etc.), data is shared with those services per your instructions.
• Legal requirements: We may disclose data if required by law, court order, or to protect the rights and safety of Leads Genie and its users.
• Business transfers: In the event of a merger or acquisition, your data may be transferred as part of that transaction.

We never sell personal data to advertisers or data brokers.`,
                },
                {
                  title: '5. Data Security',
                  content: `We implement industry-standard security measures to protect your data:

• All data is encrypted in transit (TLS 1.2+) and at rest (AES-256)
• Passwords are hashed using bcrypt and never stored in plain text
• Access to production systems is restricted to authorised personnel only
• We conduct regular security audits and penetration testing
• Two-factor authentication (2FA) is available and recommended for all accounts

Despite these measures, no system is 100% secure. If you suspect unauthorised access to your account, contact security@leadsgenie.site immediately.`,
                },
                {
                  title: '6. Your Rights',
                  content: `Depending on your location, you may have the following rights regarding your personal data:

• Access: Request a copy of the personal data we hold about you
• Correction: Request that we correct inaccurate or incomplete data
• Deletion: Request that we delete your personal data ("right to be forgotten")
• Portability: Request your data in a machine-readable format
• Objection: Object to processing of your data for certain purposes
• Restriction: Request that we limit how we process your data

To exercise any of these rights, email privacy@leadsgenie.site. We will respond within 30 days. EU/UK residents may also lodge a complaint with their local data protection authority.`,
                },
                {
                  title: '7. Cookies',
                  content: `We use cookies and similar tracking technologies to operate the platform and understand usage. See our Cookie Policy for full details. You can manage cookie preferences through your browser settings or our cookie consent banner.`,
                },
                {
                  title: '8. Data Retention',
                  content: `We retain your account data for as long as your account is active. If you cancel your subscription, we retain your data for 90 days to allow for reactivation, after which it is permanently deleted. Billing records are retained for 7 years as required by law.

You may request immediate deletion of your account and associated data at any time by emailing privacy@leadsgenie.site.`,
                },
                {
                  title: '9. International Transfers',
                  content: `Leads Genie is headquartered in the United States. If you are located in the EU, UK, or another region with data transfer restrictions, your data may be transferred to and processed in the United States. We rely on Standard Contractual Clauses (SCCs) approved by the European Commission for such transfers.`,
                },
                {
                  title: '10. Changes to This Policy',
                  content: `We may update this Privacy Policy from time to time. We will notify you of material changes via email or a prominent notice on the platform at least 14 days before the change takes effect. Your continued use of Leads Genie after the effective date constitutes acceptance of the updated policy.`,
                },
                {
                  title: '11. Contact Us',
                  content: `If you have questions about this Privacy Policy or how we handle your data, please contact:

Leads Genie, Inc.
Email: privacy@leadsgenie.site
Support: help@leadsgenie.site

For EU/UK data protection enquiries:
Data Protection Officer: dpo@leadsgenie.site`,
                },
              ].map(section => (
                <div key={section.title}>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{section.title}</h2>
                  <LegalContent content={section.content} />
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

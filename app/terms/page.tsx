import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        {/* Header */}
        <section className="border-b border-gray-100 py-16 text-center">
          <div className="container max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Legal</p>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">Terms of Service</h1>
            <p className="mt-4 text-gray-500 text-base">
              Last updated: June 1, 2026 · Effective: June 1, 2026
            </p>
            <p className="mt-4 text-gray-600 text-base leading-relaxed max-w-2xl mx-auto">
              Please read these Terms carefully before using LeadGenie. By accessing or using
              our platform, you agree to be bound by these Terms.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-16">
          <div className="container max-w-3xl">
            <div className="space-y-12">

              {[
                {
                  title: '1. Acceptance of Terms',
                  content: `By creating a LeadGenie account or using any part of our service, you agree to these Terms of Service and our Privacy Policy. If you are using LeadGenie on behalf of a company or organisation, you represent that you have authority to bind that entity to these Terms.

If you do not agree to these Terms, do not use the LeadGenie platform.`,
                },
                {
                  title: '2. Description of Service',
                  content: `LeadGenie is a cloud-based cold email outreach platform that provides tools for:

• Connecting and managing email sending accounts (Gmail, Outlook, SMTP)
• Warming up email domains to improve deliverability
• Building and launching multi-step email campaigns
• Managing prospect lists and contact data
• Tracking email opens, clicks, and replies
• Managing replies through a unified inbox (Unibox)
• Analytics and campaign performance reporting

We reserve the right to modify, suspend, or discontinue any part of the service at any time with reasonable notice.`,
                },
                {
                  title: '3. Account Registration',
                  content: `To use LeadGenie, you must create an account with a valid email address and password. You are responsible for:

• Maintaining the confidentiality of your account credentials
• All activity that occurs under your account
• Notifying us immediately at security@leadgenie.io of any unauthorised access

You must be at least 18 years old to create an account. Accounts are non-transferable without our written consent.`,
                },
                {
                  title: '4. Acceptable Use Policy',
                  content: `LeadGenie is a legitimate outreach tool for professional business communication. By using our platform, you agree NOT to:

• Send spam, unsolicited bulk email, or any communication that violates CAN-SPAM, GDPR, CASL, or other applicable anti-spam laws
• Use purchased, scraped, or harvested email lists without recipients' consent
• Send emails that are false, misleading, or deceptive
• Use LeadGenie for phishing, malware distribution, or any illegal activity
• Impersonate any person or organisation
• Send unsolicited commercial emails to recipients who have opted out
• Exceed sending limits in ways intended to circumvent our rate limiting

Violation of this Acceptable Use Policy will result in immediate account suspension and potential legal action. We cooperate with law enforcement authorities.

You are solely responsible for ensuring your use of LeadGenie complies with all applicable laws in your jurisdiction.`,
                },
                {
                  title: '5. Subscriptions & Payment',
                  content: `LeadGenie offers monthly and annual subscription plans. By subscribing, you authorise us to charge your payment method on a recurring basis.

• Payments are processed securely by Stripe
• Prices are listed on our Pricing page and exclude applicable taxes
• Annual plans are billed upfront for the full year
• We may update pricing with 30 days' notice to existing subscribers

If a payment fails, we will retry and notify you. Accounts with failed payments may be downgraded or suspended after a grace period.`,
                },
                {
                  title: '6. Cancellation & Refunds',
                  content: `You may cancel your subscription at any time from your account dashboard. Cancellation takes effect at the end of your current billing period — you retain access until then.

Refund policy:
• Monthly plans: No refunds for partial months
• Annual plans: Refunds available within 14 days of purchase if you have not sent more than 1,000 emails
• All sales are final after the refund window

To request a refund or for billing disputes, contact billing@leadgenie.io.`,
                },
                {
                  title: '7. Intellectual Property',
                  content: `LeadGenie owns all rights to the platform, including software, UI design, trademarks, and documentation. You may not copy, modify, distribute, or create derivative works without our written permission.

Your data belongs to you. You own your prospect lists, email templates, and campaign content. By uploading data to LeadGenie, you grant us a limited licence to process it solely to provide the service.`,
                },
                {
                  title: '8. Limitation of Liability',
                  content: `TO THE MAXIMUM EXTENT PERMITTED BY LAW:

LeadGenie is provided "as is" without warranties of any kind. We do not guarantee that the service will be uninterrupted, error-free, or that emails will be delivered.

IN NO EVENT SHALL LEADGENIE BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS OR DATA, ARISING FROM YOUR USE OF THE PLATFORM.

OUR TOTAL LIABILITY TO YOU FOR ANY CLAIMS ARISING FROM THESE TERMS SHALL NOT EXCEED THE AMOUNT YOU PAID TO LEADGENIE IN THE 12 MONTHS PRECEDING THE CLAIM.`,
                },
                {
                  title: '9. Indemnification',
                  content: `You agree to indemnify and hold harmless LeadGenie, its directors, employees, and agents from any claims, damages, or expenses (including legal fees) arising from:

• Your use of the platform in violation of these Terms
• Your violation of any applicable law or third-party rights
• Any content you upload or transmit through the platform
• Your email campaigns and communications to prospects`,
                },
                {
                  title: '10. Termination',
                  content: `We may suspend or terminate your account immediately if we determine that you have violated these Terms, particularly the Acceptable Use Policy. You may terminate your account at any time from your settings.

Upon termination, your data will be retained for 90 days and then permanently deleted, except where retention is required by law.`,
                },
                {
                  title: '11. Governing Law',
                  content: `These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law provisions. Any disputes shall be resolved in the state or federal courts located in Delaware.

For users in the European Union, nothing in these Terms affects your statutory consumer rights.`,
                },
                {
                  title: '12. Changes to Terms',
                  content: `We may update these Terms from time to time. We will notify you of material changes at least 14 days before they take effect via email or in-platform notification. Your continued use after the effective date constitutes acceptance.`,
                },
                {
                  title: '13. Contact',
                  content: `For questions about these Terms, contact:

LeadGenie, Inc.
Email: legal@leadgenie.io
Support: help@leadgenie.io`,
                },
              ].map(section => (
                <div key={section.title}>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">{section.title}</h2>
                  <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{section.content}</div>
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

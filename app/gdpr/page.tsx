import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function GDPRPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        <section className="border-b border-gray-100 py-16 text-center">
          <div className="container max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Legal</p>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">GDPR Compliance</h1>
            <p className="mt-4 text-gray-500 text-base">Last updated: June 1, 2026</p>
            <p className="mt-4 text-gray-600 text-base leading-relaxed max-w-2xl mx-auto">
              Leads Genie is committed to full compliance with the General Data Protection Regulation (GDPR).
              This page explains our obligations, your rights, and how we handle EU personal data.
            </p>
          </div>
        </section>
        <section className="py-16">
          <div className="container max-w-3xl space-y-10">
            {[
              { title: 'Our Role Under GDPR', content: 'Leads Genie acts as both a data controller (for data about our users) and a data processor (for prospect data uploaded by customers). As a processor, we sign Data Processing Agreements (DPAs) with customers on request and process data only per their documented instructions.' },
              { title: 'Lawful Basis for Processing', content: 'We process user account data on the basis of contractual necessity. For marketing communications, we rely on legitimate interest or consent. We do not rely on consent for essential platform functions.' },
              { title: 'Data Subject Rights', content: 'EU residents have the right to access, rectify, erase, restrict, or port their personal data. To exercise these rights, email dpo@leadgenie.io. We respond within 30 days. You may also lodge a complaint with your national supervisory authority.' },
              { title: 'Data Transfers Outside the EU', content: 'Leads Genie is headquartered in the United States. We transfer EU personal data to the US under Standard Contractual Clauses (SCCs) as approved by the European Commission. Our DPA includes all necessary SCCs.' },
              { title: 'Data Processing Agreement', content: 'If you are a business customer subject to GDPR and need a DPA, email legal@leadgenie.io. We provide DPAs at no charge and typically return a signed copy within 3 business days.' },
              { title: 'Contact Our DPO', content: 'Data Protection Officer: dpo@leadgenie.io\nLeads Genie, Inc.\nEmail: legal@leadgenie.io' },
            ].map(s => (
              <div key={s.title}>
                <h2 className="text-xl font-bold text-gray-900 mb-3">{s.title}</h2>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{s.content}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

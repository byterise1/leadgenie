// A personal webmail domain has no domain-level trust infrastructure of its
// own (no SPF/DKIM/DMARC tied to a business identity, no accumulated domain
// reputation) — real A/B testing showed this is a structural deliverability
// problem, not something warmup maturity or content tuning can fix. Used by
// the (non-blocking, opt-in) Deliverability Safety Check — see
// lib/deliverability-check.ts.
const PERSONAL_WEBMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
]);

export function isPersonalWebmailDomain(domain: string | null | undefined): boolean {
  if (!domain) return false;
  return PERSONAL_WEBMAIL_DOMAINS.has(domain.trim().toLowerCase());
}

export function domainFromEmail(email: string | null | undefined): string | null {
  const domain = email?.split('@')[1]?.trim().toLowerCase();
  return domain || null;
}

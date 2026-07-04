import { resolveTxt } from 'dns/promises';

export type AuthStatus = 'pass' | 'fail' | 'unknown';

function domainFromEmail(email: string): string {
  return email.split('@')[1]?.toLowerCase().trim() || '';
}

async function txtRecords(hostname: string): Promise<string[]> {
  try {
    const records = await resolveTxt(hostname);
    return records.map(r => r.join(''));
  } catch {
    return []; // NXDOMAIN / no records / lookup failure — treated as "none found", not an error
  }
}

async function checkSpf(domain: string): Promise<AuthStatus> {
  const records = await txtRecords(domain);
  if (records.length === 0) return 'unknown';
  return records.some(r => r.toLowerCase().startsWith('v=spf1')) ? 'pass' : 'fail';
}

async function checkDmarc(domain: string): Promise<AuthStatus> {
  const records = await txtRecords(`_dmarc.${domain}`);
  if (records.length === 0) return 'unknown';
  return records.some(r => r.toLowerCase().startsWith('v=dmarc1')) ? 'pass' : 'fail';
}

// DKIM has no fixed DNS location — the selector is chosen by whoever configured it.
// We can only check the common ones. A miss here means "not found under common
// selectors", not "definitely no DKIM" — reported as 'unknown', never 'fail'.
const COMMON_DKIM_SELECTORS = ['google', 'default', 'selector1', 'selector2', 'k1', 's1', 'dkim', 'mail'];

async function checkDkim(domain: string): Promise<AuthStatus> {
  for (const selector of COMMON_DKIM_SELECTORS) {
    const records = await txtRecords(`${selector}._domainkey.${domain}`);
    if (records.some(r => r.toLowerCase().includes('v=dkim1') || r.toLowerCase().includes('p='))) {
      return 'pass';
    }
  }
  return 'unknown';
}

export async function checkDomainAuth(email: string): Promise<{ spf: AuthStatus; dkim: AuthStatus; dmarc: AuthStatus }> {
  const domain = domainFromEmail(email);
  if (!domain) return { spf: 'unknown', dkim: 'unknown', dmarc: 'unknown' };

  const [spf, dkim, dmarc] = await Promise.all([
    checkSpf(domain),
    checkDkim(domain),
    checkDmarc(domain),
  ]);

  return { spf, dkim, dmarc };
}

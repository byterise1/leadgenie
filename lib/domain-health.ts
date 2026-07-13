import { resolveTxt, resolveMx } from 'dns/promises';

export type AuthStatus = 'pass' | 'fail' | 'unknown';

export function domainFromEmail(email: string): string {
  return email.split('@')[1]?.toLowerCase().trim() || '';
}

// Node's dns/promises has no built-in per-call timeout — relies entirely on
// the OS resolver's own timeout, which can be far longer than expected (or
// effectively unbounded) for certain hostnames/network conditions. A real
// production hang was traced to exactly this class of call stalling an
// entire warmup cycle indefinitely. Every DNS call here is explicitly
// time-boxed so one bad lookup can only ever cost a few seconds.
const DNS_TIMEOUT_MS = 8000;
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(Object.assign(new Error('DNS lookup timed out'), { code: 'ETIMEOUT' })), ms)),
  ]);
}

async function txtRecords(hostname: string): Promise<string[]> {
  try {
    const records = await withTimeout(resolveTxt(hostname), DNS_TIMEOUT_MS);
    return records.map(r => r.join(''));
  } catch {
    return []; // NXDOMAIN / no records / lookup failure / timeout — treated as "none found", not an error
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

// A domain with zero MX records genuinely can't receive mail at all — a real,
// rare, worth-surfacing state (distinct from SPF/DKIM/DMARC, which are about
// sender authentication, not receivability). 'fail' only when the domain
// resolves but has no MX records; 'unknown' on lookup failure/timeout/NXDOMAIN,
// same fail-soft convention as the other checks here.
async function checkMx(domain: string): Promise<AuthStatus> {
  try {
    const records = await withTimeout(resolveMx(domain), DNS_TIMEOUT_MS);
    return records && records.length > 0 ? 'pass' : 'fail';
  } catch {
    return 'unknown';
  }
}

export async function checkDomainAuth(email: string): Promise<{ spf: AuthStatus; dkim: AuthStatus; dmarc: AuthStatus; mx: AuthStatus }> {
  const domain = domainFromEmail(email);
  if (!domain) return { spf: 'unknown', dkim: 'unknown', dmarc: 'unknown', mx: 'unknown' };

  const [spf, dkim, dmarc, mx] = await Promise.all([
    checkSpf(domain),
    checkDkim(domain),
    checkDmarc(domain),
    checkMx(domain),
  ]);

  return { spf, dkim, dmarc, mx };
}

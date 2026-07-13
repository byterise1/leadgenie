// Free DNSBL blacklist checking — same pattern as lib/domain-health.ts
// (plain dns/promises lookups, no API key, fails soft). Public DNSBL zones
// are meant for real-time mail-filtering lookups, not scheduled bulk
// monitoring — heavy automated querying risks the querying IP getting
// rate-limited. To stay within free/fair use, the caller (instrumentation.ts)
// piggybacks this on the same 7-day cadence already gating SPF/DKIM/DMARC,
// deduped by unique domain rather than per mailbox.

import { resolve4 } from 'dns/promises';
import { domainFromEmail } from './domain-health';

export type BlacklistStatus = 'clean' | 'listed' | 'unknown';

// Node's dns/promises has no built-in per-call timeout — it relies on the
// OS resolver's own timeout, which can be much longer than expected (or
// effectively unbounded) for certain hostnames/network conditions. A real
// production hang was traced to exactly this: one slow/unresponsive DNS
// lookup here stalled the entire warmup cycle indefinitely (BullMQ showed
// the job stuck "active" forever, blocking every later job behind it).
// Every DNS call in this file is now explicitly time-boxed so a single bad
// lookup can only ever cost a few seconds, never the whole cycle.
const DNS_TIMEOUT_MS = 8000;
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(Object.assign(new Error('DNS lookup timed out'), { code: 'ETIMEOUT' })), ms)),
  ]);
}

// Domain-based zones — meaningful for any account type, since the domain
// itself (used in From/links) can be listed independently of any provider's
// IP reputation.
const DOMAIN_ZONES = ['dbl.spamhaus.org', 'multi.surbl.org'] as const;

// IP-based zones — only checked for accounts with their own custom mail
// infra (imap/smtp with a real smtp_host). gmail-oauth/gmail-app ride
// Google's shared IP pool; an IP-based hit there would just be noise about
// Google's reputation, not the user's, and would misattribute blame.
const IP_ZONES = ['zen.spamhaus.org', 'b.barracudacentral.org', 'bl.spamcop.net'] as const;

// The zone most authoritative for "this is actively harmful, pause now" —
// used by the caller when deciding whether a listing should trigger an
// immediate pause vs just a health-score deduction.
export const AUTHORITATIVE_PAUSE_ZONE = 'dbl.spamhaus.org';

type ZoneResult = 'hit' | 'miss' | 'error';

async function queryZone(hostname: string): Promise<ZoneResult> {
  try {
    const records = await withTimeout(resolve4(hostname), DNS_TIMEOUT_MS);
    return records.length > 0 ? 'hit' : 'miss';
  } catch (err: any) {
    // NXDOMAIN/no-data is the DEFINITIVE "not listed" response for a DNSBL
    // lookup — anything else (timeout, refused, network error) is a genuine
    // failure to check, not evidence of being clean.
    if (err?.code === 'ENOTFOUND' || err?.code === 'ENODATA') return 'miss';
    return 'error';
  }
}

function reverseIpOctets(ip: string): string | null {
  const parts = ip.split('.');
  if (parts.length !== 4 || parts.some(p => !/^\d{1,3}$/.test(p))) return null;
  return parts.reverse().join('.');
}

async function resolveFirstIp(host: string): Promise<string | null> {
  try {
    const addrs = await withTimeout(resolve4(host), DNS_TIMEOUT_MS);
    return addrs[0] || null;
  } catch {
    return null;
  }
}

export async function checkBlacklists(opts: {
  email: string;
  accountType: string;
  smtpHost?: string | null;
}): Promise<{ status: BlacklistStatus; details: Record<string, boolean> }> {
  const domain = domainFromEmail(opts.email);
  if (!domain) return { status: 'unknown', details: {} };

  const jobs: Promise<[string, ZoneResult]>[] = DOMAIN_ZONES.map(async zone => {
    const result = await queryZone(`${domain}.${zone}`);
    return [zone, result] as [string, ZoneResult];
  });

  const isCustomInfra = (opts.accountType === 'imap' || opts.accountType === 'smtp') && !!opts.smtpHost;
  if (isCustomInfra) {
    const ip = await resolveFirstIp(opts.smtpHost!);
    const reversed = ip ? reverseIpOctets(ip) : null;
    if (reversed) {
      for (const zone of IP_ZONES) {
        jobs.push((async () => {
          const result = await queryZone(`${reversed}.${zone}`);
          return [zone, result] as [string, ZoneResult];
        })());
      }
    }
  }

  const results = await Promise.all(jobs);
  const details: Record<string, boolean> = {};
  let anyHit = false;
  let anyResolved = false;

  for (const [zone, result] of results) {
    if (result === 'error') continue; // couldn't check this zone — omit from details, don't guess
    details[zone] = result === 'hit';
    anyResolved = true;
    if (result === 'hit') anyHit = true;
  }

  if (!anyResolved) return { status: 'unknown', details: {} };
  return { status: anyHit ? 'listed' : 'clean', details };
}

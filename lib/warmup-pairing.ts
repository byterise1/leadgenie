// Warmup Phase 2 — dual-source network pairing (admin pool + opt-in shared user
// network), domain/provider/region-diverse and fairness-weighted partner
// selection. Pure functions only, no I/O — instrumentation.ts owns fetching
// candidates/history and calling these; this module is what the synthetic
// verification script exercises directly.

import type { Provider } from './warmup-health';

export type PoolSource = 'admin' | 'shared';

export type PairingCandidate = {
  id: string;
  domain: string | null;
  provider: Provider;
  source: PoolSource;
  trustScore?: number; // 0-100, from lib/warmup-trust.ts — how good a network CITIZEN this candidate is, not its own health
  userId?: string; // owning account's user_id — same-owner pairs are heavily deprioritized (see SAME_OWNER_PENALTY)
};

export type PairingHistoryEntry = { lastSentAt: string | null; sendCount: number };

// Common country-code TLDs, bucketed into a coarse "region" so pairing can
// prefer geographic diversity without any external geo-IP lookup (which
// would be a new network dependency / potential paid-tier concern). This is
// a lightweight heuristic — good enough to avoid an obviously same-region
// robotic pattern, not real timezone detection. Generic TLDs (.com, .site,
// .shop, .net, .org, .io, etc.) and anything not recognized bucket as
// 'unknown' and get no diversity bonus/penalty either way.
const CCTLD_REGIONS: Record<string, string> = {
  ae: 'me', sa: 'me', qa: 'me', kw: 'me', bh: 'me', om: 'me',
  uk: 'eu', de: 'eu', fr: 'eu', nl: 'eu', es: 'eu', it: 'eu', se: 'eu', no: 'eu', dk: 'eu', pl: 'eu', ch: 'eu', at: 'eu', ie: 'eu', pt: 'eu', be: 'eu',
  us: 'na', ca: 'na', mx: 'na',
  in: 'sa', pk: 'sa', bd: 'sa', lk: 'sa',
  au: 'oc', nz: 'oc',
  jp: 'as', cn: 'as', kr: 'as', sg: 'as', hk: 'as', tw: 'as', my: 'as', th: 'as', vn: 'as', ph: 'as', id: 'as',
  br: 'sam', ar: 'sam', cl: 'sam', co: 'sam',
  za: 'af', ng: 'af', ke: 'af', eg: 'af',
  ru: 'ru',
};

export function regionBucket(domain: string | null | undefined): string {
  if (!domain) return 'unknown';
  const parts = domain.toLowerCase().split('.');
  const tld = parts[parts.length - 1];
  return CCTLD_REGIONS[tld] || 'unknown';
}

// Target share of pairings that should draw from the shared user network vs
// the admin pool, scaling with how large the shared network actually is.
// Tuned against the three reference points the design was built around:
// ~10 accounts -> mostly admin pool (~90/10), ~100 -> roughly even mix
// (~50/50), ~500+ -> mostly shared network (~80/20, floor at 20% admin so
// the admin pool always stays a real backup, never fully retired).
const BALANCE_MIDPOINT = 100;
const MIN_SHARED_SHARE = 0.1;
const MAX_SHARED_SHARE = 0.8;

export function computeNetworkBalance(sharedNetworkSize: number, adminPoolSize: number): { sharedShare: number; adminShare: number } {
  if (sharedNetworkSize <= 0) return { sharedShare: 0, adminShare: 1 };
  if (adminPoolSize <= 0) return { sharedShare: 1, adminShare: 0 };
  const raw = sharedNetworkSize / (sharedNetworkSize + BALANCE_MIDPOINT);
  const sharedShare = Math.max(MIN_SHARED_SHARE, Math.min(MAX_SHARED_SHARE, raw));
  return { sharedShare, adminShare: 1 - sharedShare };
}

const DOMAIN_DIVERSITY_BOOST = 3;
const PROVIDER_DIVERSITY_BOOST = 1.5;
const REGION_DIVERSITY_BOOST = 1.3;
// Two mailboxes owned by the same real user shouldn't repeatedly ping each
// other — that's a much weaker deliverability signal than a genuinely
// independent recipient, and at real scale (e.g. one user connecting 50+
// mailboxes across several of their own domains) domain-diversity boosting
// would otherwise actively ENCOURAGE same-owner pairing, since different
// domains look "diverse" even when they're all one person's infrastructure.
// A strong multiplicative penalty, not a hard filter — a same-owner pair can
// still win if it's genuinely the only option left (matches how every other
// weight here degrades gracefully instead of excluding outright).
const SAME_OWNER_PENALTY = 0.12;
// Recency weight approaches 1 as a pair's last send recedes past this window,
// but never drops all the way to 0 — a just-paired partner is heavily
// deprioritized, not literally impossible (matters when the pool is small).
const RECENCY_HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000;

function recencyWeight(lastSentAt: string | null): number {
  if (!lastSentAt) return 2; // never paired before — max boost
  const ageMs = Date.now() - new Date(lastSentAt).getTime();
  if (ageMs <= 0) return 0.05;
  return Math.max(0.05, 1 - Math.exp(-ageMs / RECENCY_HALF_LIFE_MS));
}

function frequencyWeight(sendCount: number): number {
  return 1 / (1 + Math.max(0, sendCount));
}

export type ScoredCandidate = { candidate: PairingCandidate; weight: number };

export function scorePartnerCandidates(
  from: PairingCandidate,
  candidates: PairingCandidate[],
  pairingHistory: Map<string, PairingHistoryEntry>,
  networkBalance: { sharedShare: number; adminShare: number },
): ScoredCandidate[] {
  const fromRegion = regionBucket(from.domain);
  return candidates
    .filter(c => c.id !== from.id)
    .map(c => {
      const domainW = from.domain && c.domain && c.domain !== from.domain ? DOMAIN_DIVERSITY_BOOST : 1;
      const providerW = c.provider !== from.provider ? PROVIDER_DIVERSITY_BOOST : 1;
      const toRegion = regionBucket(c.domain);
      const regionW = fromRegion !== 'unknown' && toRegion !== 'unknown' && fromRegion !== toRegion ? REGION_DIVERSITY_BOOST : 1;
      const hist = pairingHistory.get(c.id);
      const recW = recencyWeight(hist?.lastSentAt ?? null);
      const freqW = frequencyWeight(hist?.sendCount ?? 0);
      const sourceW = Math.max(0.0001, c.source === 'shared' ? networkBalance.sharedShare : networkBalance.adminShare);
      // Trust weight — soft preference for candidates that are good network
      // citizens (lib/warmup-trust.ts), not a hard filter: genuinely bad
      // partners (paused/isolated/blacklisted) are already excluded from the
      // candidate list entirely by the caller before this function ever
      // sees them, so this only has to break ties among otherwise-eligible
      // candidates. Untested/unknown trust (undefined) is neutral.
      const trustW = c.trustScore === undefined ? 1 : Math.max(0.2, c.trustScore / 100);
      const ownerW = from.userId && c.userId && c.userId === from.userId ? SAME_OWNER_PENALTY : 1;
      const weight = domainW * providerW * regionW * recW * freqW * sourceW * trustW * ownerW;
      return { candidate: c, weight };
    });
}

// Weighted-random (not pure argmax) — an always-pick-the-best rule would
// create a rigid, detectable rotation pattern (and risks two mutually
// least-recent accounts ping-ponging every cycle). Weighted random keeps
// selection organic while still strongly biasing toward diversity/fairness.
export function pickWarmupPartner(
  from: PairingCandidate,
  candidates: PairingCandidate[],
  pairingHistory: Map<string, PairingHistoryEntry>,
  networkBalance: { sharedShare: number; adminShare: number },
  rand: () => number = Math.random,
): PairingCandidate | null {
  const scored = scorePartnerCandidates(from, candidates, pairingHistory, networkBalance);
  if (scored.length === 0) return null;
  const totalWeight = scored.reduce((sum, s) => sum + s.weight, 0);
  if (!(totalWeight > 0)) return scored[Math.floor(rand() * scored.length)].candidate;
  let r = rand() * totalWeight;
  for (const { candidate, weight } of scored) {
    r -= weight;
    if (r <= 0) return candidate;
  }
  return scored[scored.length - 1].candidate;
}

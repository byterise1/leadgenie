// Zero-cost deliverability intelligence — all derived from data this app
// already computes (health factors, domain auth, blacklist status). No LLM
// call: needs to be deterministic and unit-testable, and must not add a new
// network-call failure mode inside an unattended worker running every 6h
// across 50+ accounts.

import type { HealthFactors } from './warmup-health';
import type { AuthStatus } from './domain-health';
import type { BlacklistStatus } from './blacklist-check';

export type DeliverabilityLabel = 'High' | 'Medium' | 'Low';

// "Your inbox probability is High/Medium/Low" instead of a raw number —
// blacklisted or broken SPF/DMARC force an override to Low regardless of
// the numeric score, since those are real problems, not "medium" ones.
export function predictDeliverability(opts: {
  score: number;
  blacklistStatus: BlacklistStatus;
  domainAuth: { spf: AuthStatus; dkim: AuthStatus; dmarc: AuthStatus };
}): DeliverabilityLabel {
  const { score, blacklistStatus, domainAuth } = opts;
  if (blacklistStatus === 'listed') return 'Low';
  if (domainAuth.spf === 'fail' || domainAuth.dmarc === 'fail') return 'Low';
  if (score >= 75) return 'High';
  if (score >= 45) return 'Medium';
  return 'Low';
}

export type DiagnosisResult = { findings: string[]; recommendations: string[] };

export function diagnose(opts: {
  score: number;
  factors: HealthFactors;
  warmupDay: number;
  warmupTarget: number;
  blacklistStatus: BlacklistStatus;
  blacklistDetails?: Record<string, boolean>;
  domainAuth: { spf: AuthStatus; dkim: AuthStatus; dmarc: AuthStatus; mx: AuthStatus };
  isPaused: boolean;
  pauseReason?: string | null;
}): DiagnosisResult {
  const { score, factors, warmupDay, warmupTarget, blacklistStatus, blacklistDetails, domainAuth, isPaused, pauseReason } = opts;
  const findings: string[] = [];
  const recommendations: string[] = [];

  if (blacklistStatus === 'listed') {
    const zones = Object.entries(blacklistDetails ?? {}).filter(([, hit]) => hit).map(([zone]) => zone);
    findings.push(`❌ Listed on ${zones.length ? zones.join(', ') : 'a blacklist'}`);
    recommendations.push('Request delisting and pause sending until resolved');
  }
  if (domainAuth.spf === 'fail') { findings.push('❌ SPF broken'); recommendations.push('Fix SPF'); }
  else if (domainAuth.spf === 'unknown') findings.push('⚠ SPF not detected');
  if (domainAuth.dkim !== 'pass') { findings.push('❌ DKIM missing'); recommendations.push('Fix DKIM'); }
  if (domainAuth.dmarc === 'fail') { findings.push('❌ DMARC broken'); recommendations.push('Fix DMARC'); }
  else if (domainAuth.dmarc === 'unknown') findings.push('⚠ DMARC not detected');
  if (domainAuth.mx === 'fail') { findings.push('❌ MX broken — domain cannot receive mail'); recommendations.push('Fix MX records'); }

  if (factors.bounceRate !== null && factors.bounceRate > 5) {
    findings.push('❌ Bounce rate high');
    recommendations.push('Reduce sending');
  }
  if (factors.spamRate !== null && factors.spamRate > 15) {
    findings.push('❌ Spam rate elevated');
    recommendations.push('Reduce campaign volume');
  }
  if (factors.replyRate !== null && factors.replyRate < 5 && (factors.inboxRate ?? 0) > 0) {
    findings.push('⚠ Few replies');
    recommendations.push('Wait before scaling');
  }
  if (isPaused) {
    findings.push(`❌ Warmup paused${pauseReason ? `: ${pauseReason}` : ''}`);
    recommendations.push('Reconnect mailbox');
  }

  if (score < 70 && warmupDay < warmupTarget) {
    const daysLeft = Math.max(1, warmupTarget - warmupDay);
    recommendations.push(`Continue warmup ${daysLeft} more day${daysLeft !== 1 ? 's' : ''}`);
  }
  if (score < 35) recommendations.unshift('Increase warmup');
  if (score >= 85 && warmupDay >= warmupTarget) recommendations.push('Increase daily limit tomorrow');

  if (findings.length === 0) findings.push('✅ No issues detected');

  return { findings, recommendations: [...new Set(recommendations)] };
}

// Fleet benchmark — pure stats over already-fetched health scores. Caller
// does the DB query (keeps this module I/O-free and easy to unit test).
export function computeFleetBenchmark(myScore: number, fleetScores: number[]): {
  fleetAverage: number;
  percentile: number; // 0-100, higher = better than more of the fleet
  tier: 'top10' | 'bottom20' | null;
} {
  if (fleetScores.length === 0) return { fleetAverage: myScore, percentile: 50, tier: null };
  const fleetAverage = Math.round(fleetScores.reduce((s, v) => s + v, 0) / fleetScores.length);
  const below = fleetScores.filter(s => s < myScore).length;
  const percentile = Math.round((below / fleetScores.length) * 100);
  const tier = percentile >= 90 ? 'top10' : percentile <= 20 ? 'bottom20' : null;
  return { fleetAverage, percentile, tier };
}

// Per-domain rollup — same pure-stats pattern, caller supplies the accounts
// already grouped/fetched for one domain.
export function computeDomainRollup(accounts: { healthScore: number; blacklistStatus: BlacklistStatus; dailyCap: number }[]): {
  avgHealth: number;
  mailboxCount: number;
  blacklistStatus: BlacklistStatus; // worst-case across the domain's mailboxes
  dailyCapacity: number;
} {
  if (accounts.length === 0) return { avgHealth: 0, mailboxCount: 0, blacklistStatus: 'unknown', dailyCapacity: 0 };
  const avgHealth = Math.round(accounts.reduce((s, a) => s + a.healthScore, 0) / accounts.length);
  const blacklistStatus: BlacklistStatus = accounts.some(a => a.blacklistStatus === 'listed')
    ? 'listed'
    : accounts.some(a => a.blacklistStatus === 'unknown') ? 'unknown' : 'clean';
  const dailyCapacity = accounts.reduce((s, a) => s + a.dailyCap, 0);
  return { avgHealth, mailboxCount: accounts.length, blacklistStatus, dailyCapacity };
}

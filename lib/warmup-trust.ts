// Shared Network Trust Score, Automatic Abuse Detection, Reputation
// Protection — Phase 2/3 follow-up. Distinct from lib/warmup-health.ts:
// health_score measures an account's OWN deliverability; trust_score
// measures how good a NETWORK CITIZEN it is (does pairing with it actually
// help the sender, or is it an unreliable/abusive partner). Same pure-
// function, no-I/O style as warmup-health.ts — caller (instrumentation.ts)
// fetches the inputs, these functions just score them.

export type TrustInputs = {
  accountAgeDays: number;
  healthScore: number;
  pingsReceived7d: number;    // how many warmup pings this account received as a recipient
  opensAsRecipient7d: number; // how many of those it actually engaged with (opened/replied)
  unreachableCount7d: number; // how many times the engage-worker couldn't connect to check it
  abuseFlagCount: number;
  isBlacklisted: boolean;
};

export function computeTrustScore(inputs: TrustInputs): number {
  const { accountAgeDays, healthScore, pingsReceived7d, opensAsRecipient7d, unreachableCount7d, abuseFlagCount, isBlacklisted } = inputs;

  // Baseline — a brand new account isn't automatically fully trusted, same
  // "everyone starts unproven" philosophy as computeHealthScore.
  let score = 20;

  // Tenure — up to +15, caps at 60 days in the network.
  score += Math.min(15, (Math.max(0, accountAgeDays) / 60) * 15);

  // Own health contributes — up to +25 (a trustworthy partner is itself healthy).
  score += (Math.max(0, Math.min(100, healthScore)) / 100) * 25;

  // Reliability as a RECIPIENT — up to +30, confidence-scaled by sample size
  // (same sample-size-confidence pattern as inbox-rate in computeHealthScore).
  // Neutral half-credit (+15) until this account has actually been tested as
  // a recipient at all — an untested account shouldn't be penalized OR
  // rewarded for something that hasn't happened yet.
  const RECIPIENT_CONFIDENCE_PINGS = 5;
  if (pingsReceived7d > 0) {
    const confidence = Math.min(1, pingsReceived7d / RECIPIENT_CONFIDENCE_PINGS);
    const engagementRate = Math.min(1, opensAsRecipient7d / pingsReceived7d);
    score += engagementRate * 30 * confidence;
  } else {
    score += 15;
  }

  // Unreachable as a recipient — heavy penalty, up to -30. A mailbox other
  // accounts can't even connect to isn't a useful (or fair) network partner.
  if (pingsReceived7d > 0) {
    score -= Math.min(1, unreachableCount7d / pingsReceived7d) * 30;
  }

  // Abuse flags — -10 each, capped at -30.
  score -= Math.min(30, abuseFlagCount * 10);

  // Blacklisted — flat heavy penalty, on top of everything else.
  if (isBlacklisted) score -= 30;

  return Math.round(Math.max(0, Math.min(100, score)));
}

export type AbuseFinding = { flagged: boolean; reasons: string[] };

export function detectAbuse(inputs: {
  pingsReceived7d: number;
  unreachableCount7d: number;
  opensAsRecipient7d: number;
  sentToday: number;
  computedDailyCap: number;
}): AbuseFinding {
  const { pingsReceived7d, unreachableCount7d, opensAsRecipient7d, sentToday, computedDailyCap } = inputs;
  const reasons: string[] = [];

  // Unreachable more than half the time on a meaningful sample — mailbox is
  // likely broken/inaccessible, silently degrading other senders' signal
  // without them ever knowing why their engagement rate looks bad.
  if (pingsReceived7d >= 3 && unreachableCount7d / pingsReceived7d > 0.5) {
    reasons.push('Unreachable as a recipient more than half the time — mailbox may be broken or inaccessible');
  }

  // Received meaningful volume but never engaged at all — likely a dead or
  // unmonitored mailbox riding on the network without contributing to it.
  if (pingsReceived7d >= 8 && opensAsRecipient7d === 0) {
    reasons.push('Received warmup pings but never engaged — mailbox may be dead or unmonitored');
  }

  // Sent well above its own computed safe cap — integrity check against
  // direct DB tampering or a future bug, not something normal operation
  // should ever trigger (the send loop is already bounded by this cap).
  if (computedDailyCap > 0 && sentToday > computedDailyCap * 1.5) {
    reasons.push(`Sent ${sentToday} today, well above its computed safe cap of ${computedDailyCap}`);
  }

  return { flagged: reasons.length > 0, reasons };
}

export function shouldIsolateFromNetwork(opts: {
  trustScore: number;
  healthScore: number;
  isBlacklisted: boolean;
  abuseFlagCount: number;
}): { isolate: boolean; reason: string | null } {
  const { trustScore, healthScore, isBlacklisted, abuseFlagCount } = opts;
  if (isBlacklisted) return { isolate: true, reason: 'Domain is blacklisted — isolated to protect other network members.' };
  if (trustScore < 25) return { isolate: true, reason: `Trust score dropped to ${trustScore} — isolated until it recovers.` };
  if (healthScore < 20) return { isolate: true, reason: `Health score critically low (${healthScore}) — isolated to protect network reputation.` };
  if (abuseFlagCount >= 3) return { isolate: true, reason: `${abuseFlagCount} abuse flags — isolated pending review.` };
  return { isolate: false, reason: null };
}

export function canRejoinNetwork(opts: {
  trustScore: number;
  healthScore: number;
  isBlacklisted: boolean;
  isolatedAt: string | null;
  minWaitMs?: number;
}): boolean {
  const { trustScore, healthScore, isBlacklisted, isolatedAt, minWaitMs = 48 * 60 * 60 * 1000 } = opts;
  if (!isolatedAt) return false;
  if (isBlacklisted) return false; // never auto-rejoin while still actually blacklisted
  if (Date.now() - new Date(isolatedAt).getTime() < minWaitMs) return false;
  return trustScore >= 40 && healthScore >= 35;
}

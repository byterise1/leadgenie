// Warmup health/scoring engine — Phase 1.
//
// IMPORTANT HONESTY NOTE: there is no way to know a mailbox's *true* inbox
// placement without seed mailboxes at each ISP (that's Phase 3, not built).
// This engine scores using the best signals we actually have access to:
// warmup-ping spam/rescue detection, real bounces from campaign sends,
// reply/open engagement, and DNS-based SPF/DKIM/DMARC checks. Provider caps
// below are conservative, commonly-cited safe ceilings — not official
// published Google/Microsoft rate limits (neither vendor publishes exact
// numbers, and they change over time).

export type Provider = 'gmail' | 'outlook' | 'smtp';

export function detectProvider(account: { type: string; smtp_host?: string | null }): Provider {
  if (account.type === 'gmail-oauth' || account.type === 'gmail-app') return 'gmail';
  const host = (account.smtp_host || '').toLowerCase();
  if (host.includes('outlook') || host.includes('office365') || host.includes('microsoft')) return 'outlook';
  return 'smtp';
}

export const PROVIDER_CAPS: Record<Provider, { newAccountCap: number; matureCap: number; rampSpeed: number }> = {
  gmail: { newAccountCap: 15, matureCap: 40, rampSpeed: 1.0 },
  outlook: { newAccountCap: 10, matureCap: 30, rampSpeed: 0.85 },
  smtp: { newAccountCap: 20, matureCap: 100, rampSpeed: 1.15 },
};

export type EventCounts = {
  sent7d: number;
  spam7d: number;
  bounce7d: number;
  reply7d: number;
  open7d: number;
  authError7d: number;
};

export type DomainAuth = { spf: string; dkim: string; dmarc: string };

export type HealthFactors = {
  inboxRate: number | null;   // 0-100, % of warmup pings that stayed out of spam
  spamRate: number | null;    // 0-100
  bounceRate: number | null;  // 0-100, one decimal
  replyRate: number | null;   // 0-100, one decimal
  authScore: number;          // 0/5/10/15 — SPF+DKIM+DMARC pass count * 5
  consistency: number;        // 0-10
};

export type HealthResult = { score: number; factors: HealthFactors };

export function computeHealthScore(opts: {
  events: EventCounts;
  domainAuth: DomainAuth;
  consecutiveStableDays: number;
  warmupDay: number;
  hasAuthErrorNow: boolean;
}): HealthResult {
  const { events, domainAuth, consecutiveStableDays, warmupDay, hasAuthErrorNow } = opts;
  const sent = Math.max(0, events.sent7d);

  const spamRate = sent > 0 ? events.spam7d / sent : null;
  const bounceRate = sent > 0 ? events.bounce7d / sent : null;
  const replyRate = sent > 0 ? events.reply7d / sent : null;
  const inboxRate = sent > 0 ? Math.max(0, 1 - events.spam7d / sent) : null;

  // Baseline: everyone starts unproven. Small credit just for warmup age (up to +20 by ~day 13).
  let score = 30 + Math.min(20, warmupDay * 1.5);

  // Inbox placement — the single biggest factor (up to +30).
  score += inboxRate !== null ? inboxRate * 30 : 10;

  // Bounce rate — heaviest penalty (up to -40). This is what makes the score able to fall.
  if (bounceRate !== null) score -= Math.min(40, bounceRate * 400);

  // Reply rate — real engagement signal (up to +15).
  if (replyRate !== null) score += Math.min(15, replyRate * 150);

  // Domain authentication — SPF/DKIM/DMARC each worth 5 (up to +15).
  const authPass = [domainAuth.spf, domainAuth.dkim, domainAuth.dmarc].filter(s => s === 'pass').length;
  const authScore = authPass * 5;
  score += authScore;

  // Warmup consistency — ran without big gaps recently (up to +10).
  const consistency = Math.min(10, consecutiveStableDays * 2);
  score += consistency;

  // An auth failure THIS cycle means the mailbox literally couldn't send — severe.
  if (hasAuthErrorNow) score -= 30;

  score = Math.round(Math.max(0, Math.min(100, score)));

  return {
    score,
    factors: {
      inboxRate: inboxRate !== null ? Math.round(inboxRate * 100) : null,
      spamRate: spamRate !== null ? Math.round(spamRate * 100) : null,
      bounceRate: bounceRate !== null ? Math.round(bounceRate * 1000) / 10 : null,
      replyRate: replyRate !== null ? Math.round(replyRate * 1000) / 10 : null,
      authScore,
      consistency,
    },
  };
}

const BASE_RAMP = [0, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40];

function baseRampTarget(day: number): number {
  if (day <= 0) return 2;
  if (day >= BASE_RAMP.length) return 40;
  return BASE_RAMP[day];
}

// Adaptive warmup-ping volume: ramps on health, not just the calendar.
export function dailySendCap(opts: {
  provider: Provider;
  warmupDay: number;
  health: number;
  domainAuthAllPass: boolean;
}): number {
  const { provider, warmupDay, health, domainAuthAllPass } = opts;
  const caps = PROVIDER_CAPS[provider];
  const rampSpeed = domainAuthAllPass ? caps.rampSpeed : caps.rampSpeed * 0.6;

  let target = Math.round(baseRampTarget(warmupDay) * rampSpeed);
  target = Math.min(target, caps.matureCap);

  if (health < 35) return Math.min(target, 1);
  if (health < 50) return Math.max(1, Math.round(target * 0.3));
  if (health < 70) return Math.max(1, Math.round(target * 0.6));
  return Math.max(target, warmupDay <= 0 ? 1 : 0);
}

// Safe REAL campaign volume for this account — always more conservative than warmup-ping volume.
export function campaignDailyCap(opts: {
  provider: Provider;
  warmupDay: number;
  health: number;
  warmupComplete: boolean;
}): number {
  const { provider, warmupDay, health, warmupComplete } = opts;
  const caps = PROVIDER_CAPS[provider];
  if (health < 35) return 0;
  if (!warmupComplete) {
    const pct = Math.min(1, warmupDay / 14);
    return Math.max(0, Math.round(caps.newAccountCap * pct * (health / 100)));
  }
  return Math.round(caps.matureCap * Math.max(0.5, health / 100));
}

export function shouldPause(events: EventCounts, hasAuthErrorNow: boolean): { pause: boolean; reason: string | null } {
  if (hasAuthErrorNow) return { pause: true, reason: 'Authentication failed — mailbox credentials need attention.' };
  const sent = events.sent7d;
  if (sent >= 5) {
    const bounceRate = events.bounce7d / sent;
    const spamRate = events.spam7d / sent;
    if (bounceRate > 0.05) {
      return { pause: true, reason: `Bounce rate hit ${Math.round(bounceRate * 100)}% over the last week — paused to protect sender reputation.` };
    }
    if (spamRate > 0.3) {
      return { pause: true, reason: `${Math.round(spamRate * 100)}% of warmup emails landed in spam this week — paused to recover reputation.` };
    }
  }
  return { pause: false, reason: null };
}

export function canRecover(events3d: { sent: number; bounce: number; spam: number }, pausedAt: string | null, minWaitMs = 48 * 60 * 60 * 1000): boolean {
  if (!pausedAt) return false;
  if (Date.now() - new Date(pausedAt).getTime() < minWaitMs) return false;
  if (events3d.sent === 0) return true;
  const bounceRate = events3d.bounce / events3d.sent;
  const spamRate = events3d.spam / events3d.sent;
  return bounceRate <= 0.02 && spamRate <= 0.15;
}

export function isWarmupComplete(recentHealthScores: number[], warmupDay: number, minDays = 14, minStableRuns = 5, minHealth = 90): boolean {
  if (warmupDay < minDays) return false;
  if (recentHealthScores.length < minStableRuns) return false;
  return recentHealthScores.slice(-minStableRuns).every(s => s >= minHealth);
}

export function isWeekendUTC(d: Date = new Date()): boolean {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

// Weekends are lighter, not fully dark — real people still check email occasionally.
export const WEEKEND_MULTIPLIER = 0.35;

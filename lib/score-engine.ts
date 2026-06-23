// Email scoring engine — professional 8-status model

export type ProviderType = 'gmail' | 'outlook' | 'yahoo' | 'icloud' | 'protonmail' | 'business' | 'other';

// Full status model — never just valid/invalid
export type EmailDecision =
  | 'safe'        // 80-100  — high confidence, send freely
  | 'likely_safe' // 65-79   — good signal, minor uncertainty
  | 'risky'       // 50-64   — uncertain, user should include/exclude
  | 'unsafe'      // 0-49    — low confidence, do not send
  | 'catchall'    // domain accepts everything — cannot verify specific mailbox
  | 'unknown'     // provider blocked probe OR consumer 550 (unreliable)
  | 'invalid'     // hard failure — business 550, no MX, bad domain
  | 'suppressed'; // previously bounced or unsubscribed — never contact

export type SmtpCode = 'valid' | 'invalid' | 'unknown' | 'catchall' | 'valid_major' | 'skipped';
export type PreFail = 'syntax' | 'disposable' | 'typo' | 'role' | null;

export interface EmailResult {
  email: string;
  score: number;
  decision: EmailDecision;
  provider: ProviderType;
  reasons: string[];
  smtp: SmtpCode;
  is_bounce: boolean;
  is_unsub: boolean;
  is_dupe_this_list: boolean;
  dupe_lists: string[];
  pre_fail: PreFail;
  typo_suggestion?: string;
}

export interface JobSummary {
  total: number;
  safe: number;
  likely_safe: number;
  risky: number;
  unsafe: number;
  catchall: number;
  unknown_count: number;
  invalid: number;
  suppressed: number;
  importable: number; // safe + likely_safe + risky + catchall + unknown
  pre_failed: number;
  file_dupes: number;
  in_this_list: number;
  cross_list: number;
}

const CONSUMER_DOMAINS: Record<string, ProviderType> = {
  'gmail.com': 'gmail', 'googlemail.com': 'gmail',
  'outlook.com': 'outlook', 'hotmail.com': 'outlook', 'hotmail.co.uk': 'outlook',
  'live.com': 'outlook', 'live.co.uk': 'outlook', 'msn.com': 'outlook',
  'yahoo.com': 'yahoo', 'yahoo.co.uk': 'yahoo', 'yahoo.fr': 'yahoo',
  'yahoo.es': 'yahoo', 'yahoo.de': 'yahoo', 'ymail.com': 'yahoo',
  'icloud.com': 'icloud', 'me.com': 'icloud', 'mac.com': 'icloud',
  'protonmail.com': 'protonmail', 'protonmail.ch': 'protonmail', 'proton.me': 'protonmail',
  'aol.com': 'other', 'mail.com': 'other', 'zoho.com': 'other',
};

const CONSUMER_PROVIDERS: ProviderType[] = ['gmail', 'outlook', 'yahoo', 'icloud', 'protonmail'];

export function detectProvider(domain: string): ProviderType {
  return CONSUMER_DOMAINS[domain.toLowerCase()] ?? 'business';
}

// Importable decisions — used by execute route and UI toggle
export const IMPORTABLE_DECISIONS: EmailDecision[] = ['safe', 'likely_safe', 'risky', 'catchall', 'unknown'];
export const BLOCKED_DECISIONS: EmailDecision[] = ['unsafe', 'invalid', 'suppressed'];

export function scoreEmail(params: {
  smtp: SmtpCode;
  provider: ProviderType;
  prevBounced: boolean;
  isUnsub: boolean;
  isRoleBased: boolean;
}): { score: number; decision: EmailDecision; reasons: string[] } {
  const { smtp, provider, prevBounced, isUnsub, isRoleBased } = params;
  const isConsumer = CONSUMER_PROVIDERS.includes(provider);

  // Suppression — hard override, score 0
  if (prevBounced) return { score: 0, decision: 'suppressed', reasons: ['Previously hard-bounced in campaign'] };
  if (isUnsub)    return { score: 0, decision: 'suppressed', reasons: ['Unsubscribed — cannot contact'] };

  // Hard invalid — only trust 550 from business domains
  // Consumer providers (Gmail, Yahoo etc.) return false 550s for rate-limiting/IP reputation
  if (smtp === 'invalid' && !isConsumer) {
    return { score: 0, decision: 'invalid', reasons: ['SMTP 550: mailbox confirmed does not exist'] };
  }

  // Catch-all — own status, score reflects uncertainty
  if (smtp === 'catchall') {
    return { score: 40, decision: 'catchall', reasons: ['Domain accepts all addresses — cannot verify specific mailbox'] };
  }

  // Unknown — timeout, blocked probe, OR consumer 550 (unreliable signal)
  if (smtp === 'unknown' || (smtp === 'invalid' && isConsumer)) {
    const reason = (smtp === 'invalid' && isConsumer)
      ? `${provider.charAt(0).toUpperCase() + provider.slice(1)} returned 550 — consumer providers return false 550s, treated as unknown`
      : 'SMTP unreachable: provider blocked or timed out';
    return { score: 40, decision: 'unknown', reasons: [reason] };
  }

  // ── Scored path ─────────────────────────────────────────────────────────────
  let score = 0;
  const reasons: string[] = [];

  // MX valid — guaranteed at this point (no MX = hard invalid before scoring)
  score += 20;
  reasons.push('Valid MX records (+20)');

  // Not disposable — guaranteed (pre-filtered before scoring)
  score += 10;
  reasons.push('Not a disposable domain (+10)');

  // No bounce history
  if (!prevBounced) {
    score += 10;
    reasons.push('No bounce history (+10)');
  }

  // SMTP signal
  if (smtp === 'valid') {
    score += 30;
    reasons.push('SMTP verified: mailbox confirmed (+30)');
  } else if (smtp === 'valid_major') {
    score += 20;
    reasons.push('MX confirmed, inbox probe blocked by provider (+20)');
  }
  // smtp === 'skipped' → no SMTP bonus

  // Provider trust
  if (provider === 'business') {
    score += 10;
    reasons.push('Business domain (+10)');
  }
  // Consumer providers get no bonus (can't probe reliably)

  // Role-based penalty — only truly non-human prefixes remain in this set
  if (isRoleBased) {
    score -= 10;
    reasons.push('Automated/role-based address (-10)');
  }

  score = Math.max(0, Math.min(100, score));

  let decision: EmailDecision;
  if (score >= 80)      decision = 'safe';
  else if (score >= 65) decision = 'likely_safe';
  else if (score >= 50) decision = 'risky';
  else                  decision = 'unsafe';

  return { score, decision, reasons };
}

// ── UI helpers ───────────────────────────────────────────────────────────────

export function decisionLabel(d: EmailDecision): string {
  const map: Record<EmailDecision, string> = {
    safe: 'Safe', likely_safe: 'Likely Safe', risky: 'Risky', unsafe: 'Unsafe',
    catchall: 'Catch-All', unknown: 'Unknown', invalid: 'Invalid', suppressed: 'Suppressed',
  };
  return map[d] ?? d;
}

export function decisionColor(d: EmailDecision) {
  if (d === 'safe')        return { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' };
  if (d === 'likely_safe') return { bg: 'bg-teal-100',    text: 'text-teal-700',    dot: 'bg-teal-500' };
  if (d === 'risky')       return { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-400' };
  if (d === 'catchall')    return { bg: 'bg-purple-100',  text: 'text-purple-700',  dot: 'bg-purple-400' };
  if (d === 'unknown')     return { bg: 'bg-gray-100',    text: 'text-gray-600',    dot: 'bg-gray-400' };
  if (d === 'suppressed')  return { bg: 'bg-orange-100',  text: 'text-orange-700',  dot: 'bg-orange-400' };
  // unsafe, invalid
  return { bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-500' };
}

export function scoreBarColor(score: number) {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 65) return 'bg-teal-500';
  if (score >= 50) return 'bg-amber-400';
  return 'bg-red-400';
}

export function buildSummary(results: EmailResult[], extra: {
  pre_failed: number; file_dupes: number; in_this_list: number; cross_list: number; total: number;
}): JobSummary {
  return {
    total: extra.total,
    safe:         results.filter(r => r.decision === 'safe').length,
    likely_safe:  results.filter(r => r.decision === 'likely_safe').length,
    risky:        results.filter(r => r.decision === 'risky').length,
    unsafe:       results.filter(r => r.decision === 'unsafe').length,
    catchall:     results.filter(r => r.decision === 'catchall').length,
    unknown_count:results.filter(r => r.decision === 'unknown').length,
    invalid:      results.filter(r => r.decision === 'invalid').length,
    suppressed:   results.filter(r => r.decision === 'suppressed').length,
    importable:   results.filter(r => IMPORTABLE_DECISIONS.includes(r.decision)).length,
    pre_failed: extra.pre_failed,
    file_dupes: extra.file_dupes,
    in_this_list: extra.in_this_list,
    cross_list: extra.cross_list,
  };
}

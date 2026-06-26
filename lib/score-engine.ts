// Email scoring engine — professional 8-status model

export type ProviderType = 'gmail' | 'outlook' | 'yahoo' | 'icloud' | 'protonmail' | 'business' | 'other';

// 6-status model — clean and unambiguous
export type EmailDecision =
  | 'safe'        // 80-100  — SMTP confirmed, high confidence
  | 'likely_safe' // 65-79   — major provider or strong signals
  | 'risky'       // all uncertain: catch-all, unknown probe, or scored 50-64
  | 'invalid'     // hard failure — business 550, no MX, bad syntax, disposable
  | 'suppressed'  // previously bounced or unsubscribed — never contact
  | 'unsafe';     // scored 0-49 — very low confidence (edge case)

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
  risky: number;      // catch-all + unknown probe + scored-risky all counted here
  invalid: number;
  suppressed: number;
  unsafe: number;
  importable: number; // safe + likely_safe + risky
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

// safe + likely_safe always import; risky is toggled; rest are blocked
export const IMPORTABLE_DECISIONS: EmailDecision[] = ['safe', 'likely_safe', 'risky'];
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

  // Hard invalid — 550 from any domain is treated as confirmed non-existent
  if (smtp === 'invalid') {
    return { score: 0, decision: 'invalid', reasons: ['SMTP 550: mailbox does not exist'] };
  }

  // Catch-all — cannot verify specific mailbox → Risky
  if (smtp === 'catchall') {
    return { score: 45, decision: 'risky', reasons: ['Catch-All domain: accepts all addresses — specific mailbox unverifiable'] };
  }

  // Unknown — timeout or blocked probe → Risky
  if (smtp === 'unknown') {
    return { score: 45, decision: 'risky', reasons: ['SMTP probe blocked or timed out — could not verify mailbox'] };
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
  // Major consumer providers — MX confirmed, provider globally recognised
  if (smtp === 'valid_major' && CONSUMER_PROVIDERS.includes(provider)) {
    score += 10;
    reasons.push('Recognised major email provider (+10)');
  }

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
    safe: 'Safe', likely_safe: 'Likely Safe', risky: 'Risky',
    invalid: 'Invalid', suppressed: 'Suppressed', unsafe: 'Unsafe',
  };
  return map[d] ?? d;
}

export function decisionColor(d: EmailDecision) {
  if (d === 'safe')        return { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' };
  if (d === 'likely_safe') return { bg: 'bg-teal-100',    text: 'text-teal-700',    dot: 'bg-teal-500' };
  if (d === 'risky')       return { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-400' };
  if (d === 'suppressed')  return { bg: 'bg-orange-100',  text: 'text-orange-700',  dot: 'bg-orange-400' };
  // invalid, unsafe
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
    total:       extra.total,
    safe:        results.filter(r => r.decision === 'safe').length,
    likely_safe: results.filter(r => r.decision === 'likely_safe').length,
    risky:       results.filter(r => r.decision === 'risky').length,
    invalid:     results.filter(r => r.decision === 'invalid').length,
    suppressed:  results.filter(r => r.decision === 'suppressed').length,
    unsafe:      results.filter(r => r.decision === 'unsafe').length,
    importable:  results.filter(r => IMPORTABLE_DECISIONS.includes(r.decision)).length,
    pre_failed:  extra.pre_failed,
    file_dupes:  extra.file_dupes,
    in_this_list: extra.in_this_list,
    cross_list:   extra.cross_list,
  };
}

// Email scoring engine: 0-100 score → safe / caution / block decision

export type ProviderType = 'gmail' | 'outlook' | 'yahoo' | 'icloud' | 'protonmail' | 'business' | 'other';
export type EmailDecision = 'safe' | 'caution' | 'block';
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
  caution: number;
  block: number;
  pre_failed: number;
  file_dupes: number;
  in_this_list: number;
  cross_list: number;
}

// Known consumer email domains → provider type
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

export function scoreEmail(params: {
  smtp: SmtpCode;
  provider: ProviderType;
  prevBounced: boolean;
  isUnsub: boolean;
  isRoleBased: boolean;
}): { score: number; decision: EmailDecision; reasons: string[] } {
  const { smtp, provider, prevBounced, isUnsub, isRoleBased } = params;
  const reasons: string[] = [];

  // Hard blocks — score 0 regardless
  if (prevBounced) return { score: 0, decision: 'block', reasons: ['Previously hard-bounced in campaign history'] };
  if (isUnsub) return { score: 0, decision: 'block', reasons: ['Unsubscribed — cannot contact'] };
  if (smtp === 'invalid') return { score: 0, decision: 'block', reasons: ['SMTP 550: mailbox confirmed does not exist'] };

  let score = 50; // base

  // SMTP signal
  if (smtp === 'valid') {
    score += 30;
    reasons.push('SMTP verified: mailbox confirmed (+30)');
  } else if (smtp === 'valid_major') {
    score += 10;
    reasons.push('MX confirmed, inbox probe blocked by provider (+10)');
  } else if (smtp === 'catchall') {
    score -= 15;
    reasons.push('Catch-all domain: accepts all addresses (-15)');
  } else if (smtp === 'unknown' || smtp === 'skipped') {
    reasons.push('SMTP unreachable: no response from server (0)');
  }

  // Provider trust
  if (CONSUMER_PROVIDERS.includes(provider)) {
    score -= 10;
    const n = provider[0].toUpperCase() + provider.slice(1);
    reasons.push(`${n} consumer address: inbox confidence lower (-10)`);
  } else if (provider === 'business') {
    score += 15;
    reasons.push('Business domain: higher deliverability trust (+15)');
  }

  // Role-based penalty
  if (isRoleBased) {
    score -= 10;
    reasons.push('Role-based address (info@, admin@…) (-10)');
  }

  score = Math.max(0, Math.min(100, score));
  const decision: EmailDecision = score >= 80 ? 'safe' : score >= 50 ? 'caution' : 'block';
  return { score, decision, reasons };
}

export function decisionColor(d: EmailDecision) {
  if (d === 'safe') return { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' };
  if (d === 'caution') return { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-400' };
  return { bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-500' };
}

export function scoreBarColor(score: number) {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-400';
  return 'bg-red-400';
}

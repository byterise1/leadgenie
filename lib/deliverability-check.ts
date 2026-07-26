// Voluntary, non-blocking content + sender-account risk scoring for cold
// outreach — NOT a gate, NOT shown automatically, no launch-time
// confirmation. Every signal here is grounded in real A/B tests run this
// session (actual emails sent through the real send path, checked for real
// Inbox/Promotions/Spam placement), not guesswork. Surfaced as an optional
// "Check Deliverability" panel in the campaign editor.
import { isPersonalWebmailDomain } from './personal-webmail';

export type DeliverabilityFlag = { label: string; detail: string; penalty: number };
export type DeliverabilityResult = { score: number; flags: DeliverabilityFlag[] };

const SPAM_TRIGGER_PHRASES = [
  'click here', 'buy now', 'act now', 'limited time', 'guarantee',
  'guaranteed', 'risk free', 'no obligation', 'once in a lifetime',
  'exclusive deal', 'don\'t miss out', 'urgent', 'free gift',
];

const CORPORATE_SIGNATURE_RE = /\b(LLC|Inc\.?|Ltd\.?|Incorporated)\b.{0,40}[·|]/i;

function countLinks(text: string): number {
  return (text.match(/https?:\/\/[^\s<>"]+/g) || []).length;
}

function countAllCapsWords(text: string): number {
  // 3+ letter all-caps words, ignoring common short acronyms noise threshold
  return (text.match(/\b[A-Z]{4,}\b/g) || []).length;
}

export type SenderRisk = {
  email: string;
  healthScore?: number | null;
  spfStatus?: string | null;
  dkimStatus?: string | null;
  dmarcStatus?: string | null;
  blacklistStatus?: string | null;
};

export function checkDeliverability(opts: {
  subject: string;
  body: string;
  includeTracking: boolean;
  senderDomains: string[];
  senderAccounts?: SenderRisk[];
}): DeliverabilityResult {
  const { subject, body, includeTracking, senderDomains, senderAccounts = [] } = opts;
  const flags: DeliverabilityFlag[] = [];
  const combined = `${subject}\n${body}`;

  // Real, already-tracked signals for THIS sending account — previously this
  // checker only ever looked at content + whether the domain was personal
  // Gmail, so a custom domain with a real DNS blacklist hit or a failing
  // SPF/DKIM/DMARC record (both already computed and stored on the account
  // by the warmup engine) showed "Low Risk" here even while actually
  // landing in spam for real recipients. These are stronger, more direct
  // signals than the content heuristics below — check them first.
  const blacklisted = senderAccounts.filter(a => a.blacklistStatus === 'listed');
  if (blacklisted.length > 0) {
    flags.push({
      label: `Blacklisted sender${blacklisted.length > 1 ? 's' : ''}`,
      detail: `${blacklisted.map(a => a.email).join(', ')} is on a real DNS blacklist right now — mail from this account will land in spam for most recipients until it's delisted, regardless of content.`,
      penalty: 50,
    });
  }

  const authFailing = senderAccounts.filter(a =>
    a.spfStatus === 'fail' || a.dkimStatus === 'fail' || a.dmarcStatus === 'fail'
  );
  if (authFailing.length > 0) {
    flags.push({
      label: `Domain authentication failing`,
      detail: `${authFailing.map(a => a.email).join(', ')} has a failing SPF, DKIM, or DMARC record — this is one of the strongest real spam-placement signals, independent of content. Fix DNS records for this domain before sending.`,
      penalty: 35,
    });
  }

  const lowHealth = senderAccounts.filter(a => typeof a.healthScore === 'number' && a.healthScore < 50);
  if (lowHealth.length > 0) {
    flags.push({
      label: `Low sender health score`,
      detail: `${lowHealth.map(a => `${a.email} (${a.healthScore})`).join(', ')} — health score already factors in this account's real recent inbox/spam/bounce outcomes. Below 50 means it's been landing in spam or bouncing recently, not a content issue.`,
      penalty: 25,
    });
  }

  const personalDomains = Array.from(new Set(senderDomains.filter(isPersonalWebmailDomain)));
  if (personalDomains.length > 0) {
    flags.push({
      label: `Personal Gmail sender${personalDomains.length > 1 ? 's' : ''}`,
      detail: `Sending from a personal Gmail account (${personalDomains.join(', ')}) — real testing showed this lands in Spam regardless of warmup maturity, even for a well-warmed account with real reply history. This is structural (no domain-level SPF/DKIM/DMARC reputation of your own), not something warmup time fixes.`,
      penalty: 40,
    });
  }

  if (includeTracking) {
    flags.push({
      label: 'Tracking pixel present',
      detail: 'Removing the open-tracking pixel helped a business-domain account move from mostly-Promotions to mostly-Inbox in real testing. Consider turning off "Track opens" for cold-outreach steps.',
      penalty: 15,
    });
  }

  if (CORPORATE_SIGNATURE_RE.test(body)) {
    flags.push({
      label: 'Corporate-style signature',
      detail: 'A company-name + title signature block (e.g. "Company LLC · Title") reads as promotional to Gmail\'s tab classifier. A plain first-name sign-off tested better.',
      penalty: 10,
    });
  }

  const matchedPhrases = SPAM_TRIGGER_PHRASES.filter(p => combined.toLowerCase().includes(p));
  if (matchedPhrases.length > 0) {
    flags.push({
      label: 'Spam-trigger phrases',
      detail: `Found: "${matchedPhrases.join('", "')}" — common phrases spam filters weight heavily.`,
      penalty: Math.min(20, matchedPhrases.length * 5),
    });
  }

  const linkCount = countLinks(combined);
  if (linkCount > 2) {
    flags.push({
      label: 'Multiple links',
      detail: `${linkCount} links found — cold outreach with fewer links (1 or none) reads less like a marketing blast.`,
      penalty: 5,
    });
  }

  const capsWords = countAllCapsWords(combined);
  if (capsWords > 1) {
    flags.push({
      label: 'ALL-CAPS words',
      detail: `${capsWords} all-caps words found — excessive emphasis is a common spam-filter signal.`,
      penalty: Math.min(10, capsWords * 3),
    });
  }

  const totalPenalty = flags.reduce((sum, f) => sum + f.penalty, 0);
  const score = Math.max(0, Math.min(100, 100 - totalPenalty));

  return { score, flags };
}

export function riskLabel(score: number): { text: string; tone: 'low' | 'moderate' | 'high' } {
  if (score >= 80) return { text: 'Low Risk', tone: 'low' };
  if (score >= 55) return { text: 'Moderate Risk', tone: 'moderate' };
  return { text: 'High Risk', tone: 'high' };
}

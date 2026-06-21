// Full professional email validation library
// Checks: syntax → typos → disposable → role-based → (SMTP probe handled separately)

export type EmailPreCheck = 'valid' | 'invalid_syntax' | 'domain_typo' | 'disposable' | 'role_based';

export interface PreCheckResult {
  status: EmailPreCheck;
  suggestion?: string; // for domain_typo: the corrected email
}

// ── 1. Typo map — common misspellings of major domains ───────────────────────
const DOMAIN_TYPOS: Record<string, string> = {
  // Gmail
  'gnail.com': 'gmail.com',   'gmai.com': 'gmail.com',    'gamil.com': 'gmail.com',
  'gmaill.com': 'gmail.com',  'gmail.cm': 'gmail.com',    'gmail.co': 'gmail.com',
  'gmail.cmo': 'gmail.com',   'gmail.con': 'gmail.com',   'gmail.ocm': 'gmail.com',
  'gmail.om': 'gmail.com',    'gmal.com': 'gmail.com',    'gimail.com': 'gmail.com',
  'gemail.com': 'gmail.com',  'gmali.com': 'gmail.com',   'gmaio.com': 'gmail.com',
  'gmaim.com': 'gmail.com',   'gmaik.com': 'gmail.com',   'gmil.com': 'gmail.com',
  'gmaail.com': 'gmail.com',  'graill.com': 'gmail.com',  'gmaills.com': 'gmail.com',
  // Hotmail
  'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmaill.com': 'hotmail.com',
  'hotmail.cm': 'hotmail.com',  'hotmail.co': 'hotmail.com', 'hotmail.con': 'hotmail.com',
  'hotmail.cmo': 'hotmail.com', 'homail.com': 'hotmail.com', 'hitmail.com': 'hotmail.com',
  'hotmaul.com': 'hotmail.com', 'hotamil.com': 'hotmail.com','hotmall.com': 'hotmail.com',
  'hotmails.com': 'hotmail.com','hotmaol.com': 'hotmail.com','htomail.com': 'hotmail.com',
  // Outlook
  'outlok.com': 'outlook.com',   'outloook.com': 'outlook.com', 'outlool.com': 'outlook.com',
  'outlock.com': 'outlook.com',  'outllook.com': 'outlook.com', 'outloo.com': 'outlook.com',
  'outlookk.com': 'outlook.com', 'ooutlook.com': 'outlook.com', 'outlook.co': 'outlook.com',
  'outlook.cm': 'outlook.com',   'outlook.con': 'outlook.com',  'outlouk.com': 'outlook.com',
  'iutlook.com': 'outlook.com',  'outlookl.com': 'outlook.com',
  // Yahoo
  'yaho.com': 'yahoo.com',   'yahooo.com': 'yahoo.com', 'yahoo.co': 'yahoo.com',
  'yahoo.cm': 'yahoo.com',   'yhoo.com': 'yahoo.com',   'yaoo.com': 'yahoo.com',
  'yhaoo.com': 'yahoo.com',  'yaaho.com': 'yahoo.com',  'yahoo.cmo': 'yahoo.com',
  'yahoo.con': 'yahoo.com',  'ahoo.com': 'yahoo.com',   'yahomail.com': 'yahoo.com',
  // AOL
  'aol.ocm': 'aol.com', 'aol.cmo': 'aol.com', 'aol.om': 'aol.com',
  'ail.com': 'aol.com', 'aol.con': 'aol.com', 'aoil.com': 'aol.com',
  // iCloud / Apple
  'iclould.com': 'icloud.com', 'icolud.com': 'icloud.com', 'icould.com': 'icloud.com',
  'icloud.co': 'icloud.com',   'icloud.con': 'icloud.com',
  // ProtonMail
  'protonmal.com': 'protonmail.com', 'protanmail.com': 'protonmail.com',
  // Zoho
  'zohomail.com': 'zoho.com',
};

// Common TLD typos (applied AFTER domain check)
const TLD_TYPOS: [string, string][] = [
  ['.con', '.com'], ['.cmo', '.com'], ['.ocm', '.com'], ['.cpm', '.com'],
  ['.xom', '.com'], ['.vom', '.com'], ['.com,', '.com'], ['.comm', '.com'],
  ['.ner', '.net'], ['.nte', '.net'], ['.ogr', '.org'], ['.ogg', '.org'],
];

// ── 2. Disposable / temporary email domains ───────────────────────────────────
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','tempmail.com','throwaway.email',
  'yopmail.com','yopmail.fr','sharklasers.com','spam4.me','trashmail.com',
  'trashmail.net','trashmail.at','trashmail.io','trashmail.me','trashmail.org',
  'trashmail.xyz','trashmailer.com','trash-mail.at','dispostable.com',
  'mailnull.com','spamgourmet.com','spamgourmet.net','spamgourmet.org',
  'postinbox.com','getairmail.com','filzmail.com','spamfree24.org',
  'mailme24.com','spaml.com','e4ward.com','mailnew.com','mailscrap.com',
  'sneakemail.com','pookmail.com','discard.email','fakeinbox.com',
  'mailnesia.com','maildrop.cc','spamevader.com','temp-mail.org',
  'tempr.email','mailtemp.net','binkmail.com','spamavert.com',
  'tempemail.net','disposableaddress.com','crazymailing.com',
  'spamherelots.com','spamhereplease.com','spamgap.com','tempmail.de',
  'wegwerfadresse.de','emailondeck.com','trash-mail.at','mailexpire.com',
  'mailmoat.com','spambog.com','anonbox.net','anonymbox.com',
  'temporaryinbox.com','spamex.com','mt2014.com','mt2015.com',
  'gishpuppy.com','throwam.com','antispam24.de','deadaddress.com',
  'mailme.ir','sofimail.com','temporarymail.com','fakemail.net',
  'mailinator.net','mailinator.org','guerrillamail.net','guerrillamail.org',
  'guerrillamail.de','guerrillamail.biz','guerrillamail.info','grr.la',
  'jetable.fr.nf','jetable.com','jetable.de','jetable.eu','jetable.net',
  'jetable.org','10minutemail.com','10minutemail.net','10minutemail.org',
  'my10minutemail.com','10minutemail.co.za','minutemail.com',
  'guerrillamailblock.com','spam.la','spamoff.de','netmails.net',
  'netmails.com','discardmail.com','discardmail.de','hatespam.org',
  'incognitomail.net','inoutmail.de','inoutmail.eu','inoutmail.info',
  'inoutmail.net','keepmymail.com','kurzepost.de','lortemail.dk',
  'mailboxy.fun','mailcat.biz','mailcatch.com','maileimer.de',
  'mailfs.com','mailguard.me','mailhazard.com','mailinater.com',
  'mailismagic.com','mailmetrash.com','mailmoat.com','mailnull.com',
  'mailseal.de','mailslapping.com','mailspam.xyz','mailtemp.eu',
  'mailtome.de','mailtothis.com','mailtrash.net','mailzilla.com',
  'mailzilla.org','meltmail.com','msa.minsmail.com','mytempemail.com',
  'mytempmail.com','naspam.com','nefmail.com','nobulk.com','nnot.net',
  'nospam.ze.tc','nospam4.us','nospamfor.us','nospammail.net',
  'nospamthanks.info','notmailinator.com','nowmymail.com','objectmail.com',
  'obobbo.com','odaymail.com','one-time.email','oneoffemail.com',
  'oneoffmail.com','onewaymail.com','owlpic.com','ozyl.de',
  'paplease.com','pepbot.com','pjjkp.com','pop3.xyz','postpro.net',
  'privacy.net','proxymail.eu','prtnx.com','punkass.com',
  'rcpt.at','reallymymail.com','receivemail.com','recycleclean.com',
  'regbypass.com','removable.email','rppkn.com','rtrtr.com',
  's0ny.net','safe-mail.net','safetymail.info','safetypost.de',
  'sandelf.de','sharedmailbox.org','shieldemail.com','shiftmail.com',
  'sibmail.com','slopsbox.com','slowslow.de','snakemail.com',
  'sogetthis.com','sopaspot.com','spam.care','spam.org.tr','spam.su',
  'spambob.com','spambob.net','spambob.org','spambox.info',
  'spambox.us','spamcannon.com','spamcannon.net','spamcero.com',
  'spamcon.org','spamcowboy.com','spamcowboy.net','spamcowboy.org',
  'spamday.com','spamfree.eu','spamfree24.de','spamfree24.eu',
  'spamfree24.info','spamfree24.net','spamhole.com','spamify.com',
  'spaminator.de','spamkill.info','spaml.com','spaml.de','spamlot.net',
  'spammotel.com','spammm.com','spamslicer.com','spamspot.com',
  'spamthis.co.uk','spamthisplease.com','spamtrail.com','spikio.com',
  'suremail.info','tafmail.com','tech-mail.net','temp-mail.com',
  'temp-mail.net','temp-mail.ru','tempail.com','tempalias.com',
  'tempe-mail.com','tempemail.biz','tempemail.co.za','tempemail.com',
  'tempemail.us','tempinbox.co.uk','tempinbox.com','temporaryemail.net',
  'temporaryemail.us','temporaryforwarding.com','tempsky.com','tempthe.net',
  'thisisnotmyrealemail.com','throwawaymail.com','tilien.com',
  'tittbit.in','tmailinator.com','toomail.biz','topranklist.de',
  'tradermail.info','trash-amil.com','trashcanmail.com',
  'trashemails.de','trashinbox.net','tryalert.com','tualias.com',
  'turual.com','tyldd.com','uroid.com','valemail.net',
  'veryrealemail.com','wmail.cf','wegwerf-email.de','wegwerf-email.net',
  'wegwerfmail.de','wegwerfmail.info','wegwerfmail.net','wegwerfmail.org',
  'whyspam.me','xagloo.com','xemaps.com','xents.com','xmaily.com',
  'xoxox.cc','xyzfree.net','yapped.net','yep.it','ypmail.webarnak.fr.eu.org',
  'z1p.biz','zehnminutenmail.de','zetmail.com','zippymail.info',
  'zoemail.com','zoemail.net','zoemail.org','zomg.info',
  'mailnull.com','throwam.com','maildrop.cc','anonaddy.com',
  'simplelogin.io','spamgourmet.com','spamfree24.org',
]);

// ── 3. Role-based email prefixes (shared inboxes, low reply rate) ─────────────
const ROLE_PREFIXES = new Set([
  'info','admin','support','contact','sales','hello','help','team',
  'office','noreply','no-reply','donotreply','do-not-reply','postmaster',
  'abuse','billing','legal','press','media','marketing','hr','jobs',
  'careers','privacy','security','webmaster','service','services','mail',
  'email','feedback','newsletter','enquiries','enquiry','inquiries',
  'inquiry','customerservice','customer.service','customer-service',
  'helpdesk','general','accounts','finance','invoices','reception',
  'hq','headquarters','directory','list','lists','bounce','bounces',
  'mailer','mailer-daemon','daemon','robot','automated','automailer',
]);

// ── Main validator ────────────────────────────────────────────────────────────

export function preCheckEmail(rawEmail: string): PreCheckResult {
  const email = rawEmail.trim().toLowerCase();

  // 1. Syntax check (basic regex)
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { status: 'invalid_syntax' };
  }

  const atIdx = email.indexOf('@');
  const local = email.slice(0, atIdx);
  const domain = email.slice(atIdx + 1);

  // 2. Known domain typos
  if (DOMAIN_TYPOS[domain]) {
    return { status: 'domain_typo', suggestion: `${local}@${DOMAIN_TYPOS[domain]}` };
  }

  // 3. TLD typos (e.g. .con, .cmo)
  for (const [bad, good] of TLD_TYPOS) {
    if (domain.endsWith(bad)) {
      const fixed = domain.slice(0, -bad.length) + good;
      return { status: 'domain_typo', suggestion: `${local}@${fixed}` };
    }
  }

  // 4. Disposable/temp email domain
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { status: 'disposable' };
  }

  // 5. Role-based prefix
  if (ROLE_PREFIXES.has(local)) {
    return { status: 'role_based' };
  }

  return { status: 'valid' };
}

// Batch pre-check: returns map of email → PreCheckResult
export function batchPreCheck(emails: string[]): Map<string, PreCheckResult> {
  const results = new Map<string, PreCheckResult>();
  for (const email of emails) {
    results.set(email, preCheckEmail(email));
  }
  return results;
}

import * as dns from 'dns/promises';
import * as net from 'net';
import { SocksClient } from 'socks';

export type SmtpResult = 'valid' | 'valid_major' | 'invalid' | 'unknown' | 'catchall';

// Providers that block all RCPT TO probes — cannot determine individual mailbox validity.
// NOTE: Google/Gmail removed — Hetzner IP gets real 250/550 responses from gmail-smtp-in.l.google.com
const MAJOR_MX_PATTERNS = [
  'outlook.com', 'hotmail.com',         // Outlook / Office 365
  'protection.outlook.com',            // Microsoft 365
  'yahoodns.net', 'yahoo.com',          // Yahoo
  'icloud.com', 'me.com',               // Apple iCloud
  'protonmail.ch', 'proton.me',         // ProtonMail
  'zoho.com',                           // Zoho Mail
  'mailgun.org', 'sendgrid.net',        // Transactional providers
  'amazonses.com',                      // AWS SES
];

function isMajorProvider(mxHost: string): boolean {
  const h = mxHost.toLowerCase();
  return MAJOR_MX_PATTERNS.some(p => h.endsWith(p) || h.includes('.' + p));
}

function getProxy(): { host: string; port: number } | null {
  const raw = process.env.SMTP_PROXY;
  if (raw) {
    try {
      const u = new URL(raw);
      return { host: u.hostname, port: Number(u.port) || 1080 };
    } catch { /* fall through to hardcoded */ }
  }
  // Hetzner CX23 SOCKS5 — hardcoded fallback so port 25 works on Railway without env var
  return { host: '157.180.121.10', port: 443 };
}

// SMTP conversation with catch-all detection:
// Step 0: wait for 220 greeting
// Step 1: EHLO → wait for 250
// Step 2: MAIL FROM → wait for 250
// Step 3: RCPT TO with fake address (catch-all probe) → if 250 = catch-all
// Step 4: RCPT TO with real address → 250=valid, 452=invalid(full), 5xx=invalid(no mailbox)
function doSmtpConversation(
  socket: net.Socket,
  email: string,
  domain: string,
  connectTo?: { host: string; port: number },
): Promise<SmtpResult> {
  // Random fake address to detect catch-all domains
  const fakeRcpt = `_probe_${Math.random().toString(36).slice(2, 8)}@${domain}`;

  return new Promise<SmtpResult>((resolve) => {
    let settled = false;
    const done = (r: SmtpResult) => {
      if (settled) return;
      settled = true;
      try { socket.destroy(); } catch {}
      resolve(r);
    };

    let buf = '';
    let step = 0;

    socket.setTimeout(10000);
    socket.once('timeout', () => done('unknown'));
    socket.once('error', () => done('unknown'));

    socket.on('data', (chunk) => {
      buf += chunk.toString();
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        const t = line.trim();
        if (!t || t[3] === '-') continue; // skip SMTP multi-line continuation
        const code = parseInt(t.slice(0, 3));

        if (step === 0 && code === 220) {
          // Server greeting received
          socket.write('EHLO leadgenie.app\r\n'); step = 1;

        } else if (step === 1 && code === 250) {
          // EHLO accepted — start transaction
          socket.write('MAIL FROM:<probe@leadgenie.app>\r\n'); step = 2;

        } else if (step === 2 && code === 250) {
          // MAIL FROM accepted — probe with fake address first (catch-all detection)
          socket.write(`RCPT TO:<${fakeRcpt}>\r\n`); step = 3;

        } else if (step === 3) {
          if (code === 250 || code === 251) {
            // is_catchall: server accepted a completely fake address → accepts everything
            // Cannot confirm specific mailbox exists → let caller decide (caution, not blocked)
            socket.write('QUIT\r\n');
            done('catchall');
          } else {
            // Server rejected fake address → NOT a catch-all; check the real email
            socket.write(`RCPT TO:<${email}>\r\n`); step = 4;
          }

        } else if (step === 4) {
          socket.write('QUIT\r\n');
          if (code === 250 || code === 251) {
            // mailbox_exists — confirmed valid
            done('valid');
          } else if (code === 452) {
            // mailbox_full — will hard bounce for cold email, treat as invalid
            done('invalid');
          } else if (code >= 500) {
            // mailbox_does_not_exist (550, 551, 553, 554) — confirmed invalid
            done('invalid');
          } else {
            // is_greylisting (451) or inconclusive (other 4xx) — unknown, use caution
            done('unknown');
          }

        } else if (code >= 500 && step < 3) {
          // Server rejected EHLO or MAIL FROM entirely (misconfigured or blocking us)
          done('unknown');
        }
      }
    });

    if (connectTo) socket.connect(connectTo.port, connectTo.host);
  });
}

export async function smtpCheck(email: string): Promise<SmtpResult> {
  const domain = email.split('@')[1];
  if (!domain) return 'invalid';
  try {
    // mxserver_does_not_exist / domain_does_not_exist — DNS checks
    const mxRecords = await Promise.race([
      dns.resolveMx(domain),
      new Promise<never>((_, r) => setTimeout(() => r(new Error('timeout')), 5000)),
    ]) as Awaited<ReturnType<typeof dns.resolveMx>>;
    if (!mxRecords?.length) return 'invalid'; // mxserver_does_not_exist

    const mxHost = mxRecords.sort((a, b) => a.priority - b.priority)[0].exchange;

    // Major providers block all RCPT TO probes — skip probe, trust MX record → valid_major
    if (isMajorProvider(mxHost)) return 'valid_major';

    const proxy = getProxy();

    if (proxy) {
      // Route through Hetzner SOCKS5 proxy (bypasses Railway's port 25 outbound block)
      let socket: net.Socket;
      try {
        const conn = await (Promise.race([
          SocksClient.createConnection({
            proxy: { host: proxy.host, port: proxy.port, type: 5 },
            command: 'connect',
            destination: { host: mxHost, port: 25 },
          }),
          new Promise<never>((_, r) => setTimeout(() => r(new Error('timeout')), 10000)),
        ]) as Promise<Awaited<ReturnType<typeof SocksClient.createConnection>>>);
        socket = conn.socket;
      } catch {
        return 'unknown';
      }
      return doSmtpConversation(socket, email, domain);
    }

    // Local dev: direct TCP connection
    return doSmtpConversation(new net.Socket(), email, domain, { host: mxHost, port: 25 });
  } catch (err: unknown) {
    // DNS errors that confirm the domain/MX doesn't exist → hard invalid
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOTFOUND' || code === 'ENODATA' || code === 'ENOENT' || code === 'ESERVFAIL') {
      return 'invalid'; // domain_does_not_exist
    }
    return 'unknown'; // network error, timeout, etc.
  }
}

export async function batchSmtp(emails: string[], concurrency = 8): Promise<Map<string, SmtpResult>> {
  const results = new Map<string, SmtpResult>();
  const domainCache = new Map<string, SmtpResult>();

  for (let i = 0; i < emails.length; i += concurrency) {
    const batch = emails.slice(i, i + concurrency);
    await Promise.all(batch.map(async (email) => {
      const domain = email.split('@')[1];
      if (domainCache.has(domain)) {
        results.set(email, domainCache.get(domain)!);
        return;
      }
      const result = await smtpCheck(email);
      results.set(email, result);
      // Cache structural domain-level results — same for every address on that domain
      if (result === 'invalid' || result === 'catchall' || result === 'valid_major') domainCache.set(domain, result);
    }));
  }
  return results;
}

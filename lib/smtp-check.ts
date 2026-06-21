import * as dns from 'dns/promises';
import * as net from 'net';
import { SocksClient } from 'socks';

export type SmtpResult = 'valid' | 'invalid' | 'unknown';

// If the MX host belongs to a major provider, RCPT TO probes are always blocked.
// These providers are legitimate — treat 'unknown' probe results as 'valid'.
const MAJOR_MX_PATTERNS = [
  'google.com', 'googlemail.com',          // Gmail + Google Workspace
  'outlook.com', 'hotmail.com',            // Outlook / Office 365
  'protection.outlook.com',               // Microsoft 365
  'yahoodns.net', 'yahoo.com',             // Yahoo
  'icloud.com', 'me.com',                  // Apple iCloud
  'protonmail.ch', 'proton.me',            // ProtonMail
  'zoho.com',                              // Zoho Mail
  'mailgun.org', 'sendgrid.net',           // Transactional but common in B2B
  'amazonses.com',                         // AWS SES
];

function isMajorProvider(mxHost: string): boolean {
  const h = mxHost.toLowerCase();
  return MAJOR_MX_PATTERNS.some(p => h.endsWith(p) || h.includes('.' + p));
}

function getProxy(): { host: string; port: number } | null {
  const raw = process.env.SMTP_PROXY;
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return { host: u.hostname, port: Number(u.port) || 1080 };
  } catch { return null; }
}

// Runs the SMTP conversation on an already-created socket.
// Pass connectTo to have it dial first (direct path); omit if socket is already connected (SOCKS5 path).
function doSmtpConversation(
  socket: net.Socket,
  email: string,
  connectTo?: { host: string; port: number },
): Promise<SmtpResult> {
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

    socket.setTimeout(8000);
    socket.once('timeout', () => done('unknown'));
    socket.once('error', () => done('unknown'));

    socket.on('data', (chunk) => {
      buf += chunk.toString();
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        const t = line.trim();
        if (!t || t[3] === '-') continue; // skip SMTP continuation lines
        const code = parseInt(t.slice(0, 3));
        if (step === 0 && code === 220) {
          socket.write('EHLO leadgenie.app\r\n'); step = 1;
        } else if (step === 1 && code === 250) {
          socket.write('MAIL FROM:<verify@leadgenie.app>\r\n'); step = 2;
        } else if (step === 2 && code === 250) {
          socket.write(`RCPT TO:<${email}>\r\n`); step = 3;
        } else if (step === 3) {
          socket.write('QUIT\r\n');
          if (code === 250 || code === 251) done('valid');
          else if (code >= 500) done('invalid');
          else done('unknown');
        } else if (code >= 500 && step < 3) {
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
    const mxRecords = await Promise.race([
      dns.resolveMx(domain),
      new Promise<never>((_, r) => setTimeout(() => r(new Error('timeout')), 5000)),
    ]) as Awaited<ReturnType<typeof dns.resolveMx>>;
    if (!mxRecords?.length) return 'invalid';
    const mxHost = mxRecords.sort((a, b) => a.priority - b.priority)[0].exchange;

    // Major providers block all RCPT TO probes — skip the probe and trust the MX record
    if (isMajorProvider(mxHost)) return 'valid';

    const proxy = getProxy();

    if (proxy) {
      // Route through Hetzner SOCKS5 proxy — same as email sending, bypasses Railway port 25 block
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
      return doSmtpConversation(socket, email); // already connected — don't pass connectTo
    }

    // Local dev: direct TCP connection
    return doSmtpConversation(new net.Socket(), email, { host: mxHost, port: 25 });
  } catch {
    return 'unknown';
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
      if (result === 'invalid') domainCache.set(domain, 'invalid');
    }));
  }
  return results;
}

import nodemailer from 'nodemailer';
import dns from 'dns';
import https from 'https';

// Node.js 18+ defaults to verbatim IPv6-first DNS. Railway has no IPv6 outbound.
dns.setDefaultResultOrder('ipv4first');

export type EmailAccount = {
  id?: string;
  type: string;
  email: string;
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_user?: string | null;
  smtp_pass?: string | null;
};

type SendOptions = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};

// ─── Token cache ──────────────────────────────────────────────────────────────

const _tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function fetchAccessToken(refreshToken: string): Promise<{ token: string; expiresIn: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const data = await res.json();
    if (!data.access_token) {
      throw new Error(`OAuth2 token refresh failed: ${data.error_description || data.error || 'unknown error'}`);
    }
    return { token: data.access_token, expiresIn: data.expires_in ?? 3600 };
  } finally {
    clearTimeout(timer);
  }
}

export async function getAccessToken(account: EmailAccount): Promise<string> {
  // Include first 20 chars of refresh token so cache auto-invalidates on reconnect
  const cacheKey = `${account.id || account.email}:${(account.smtp_pass || '').slice(0, 20)}`;
  const cached = _tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) return cached.token;
  const { token, expiresIn } = await fetchAccessToken(account.smtp_pass!);
  _tokenCache.set(cacheKey, { token, expiresAt: Date.now() + expiresIn * 1000 });
  return token;
}

// ─── Gmail REST API sender (bypasses SMTP entirely) ───────────────────────────
// Railway runs on GCP; Google blocks GCP→smtp.gmail.com to prevent spam.
// The Gmail REST API uses HTTPS (port 443) which is never blocked.

// Use Node.js https module directly — bypasses Next.js fetch wrapper and undici quirks
function httpsPost(
  hostname: string,
  path: string,
  body: string | Buffer,
  headers: Record<string, string | number>,
  timeoutMs = 30000,
): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  return new Promise((resolve, reject) => {
    const bodyBuf = typeof body === 'string' ? Buffer.from(body, 'utf8') : body;
    const req = https.request(
      {
        hostname,
        port: 443,
        path,
        method: 'POST',
        headers: { ...headers, 'Content-Length': bodyBuf.length },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const responseBody = Buffer.concat(chunks).toString('utf8');
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers as Record<string, string>,
            body: responseBody,
          });
        });
      }
    );
    req.on('timeout', () => { req.destroy(); reject(new Error('Gmail API request timed out')); });
    req.on('error', reject);
    req.write(bodyBuf);
    req.end();
  });
}

async function sendViaGmailApi(account: EmailAccount, opts: SendOptions): Promise<{ threadId?: string }> {
  const accessToken = await getAccessToken(account);

  const boundary = `----=_Part_${Date.now()}`;
  const subject = opts.subject.match(/[^\x00-\x7F]/)
    ? `=?UTF-8?B?${Buffer.from(opts.subject).toString('base64')}?=`
    : opts.subject;

  const rawMessage = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    opts.text || '',
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    opts.html || '',
    ``,
    `--${boundary}--`,
  ].join('\r\n');

  const result = await httpsPost(
    'gmail.googleapis.com',
    '/upload/gmail/v1/users/me/messages/send?uploadType=media',
    rawMessage,
    {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'message/rfc822',
    },
  );

  if (result.status < 200 || result.status >= 300) {
    let body: any = {};
    try { body = JSON.parse(result.body); } catch { /* non-JSON */ }
    const apiMsg = body?.error?.message || `HTTP ${result.status}`;
    const code = result.status === 401 || result.status === 403 ? 535
      : result.status >= 400 && result.status < 500 ? 550
      : result.status;
    const err = new Error(`Gmail send failed (${result.status}): ${apiMsg}`);
    (err as any).responseCode = code;
    throw err;
  }

  try {
    const body = JSON.parse(result.body) as { id: string; threadId: string };
    return { threadId: body.threadId };
  } catch {
    return {};
  }
}

// ─── SMTP transport (gmail-app, imap, smtp) ────────────────────────────────

// requireTLS: true is critical on Railway — forces STARTTLS upgrade or hard-fails.
// Without it, nodemailer can silently skip TLS and Gmail rejects the auth.
//
// SMTP_PROXY_HOST: optional TCP passthrough proxy (e.g. Hetzner VPS running scripts/smtp-proxy.js)
// Routes non-Gmail SMTP through a non-GCP IP so providers like Titan don't block the connection.
function createSmtpTransport(account: EmailAccount) {
  if (account.type === 'gmail-app') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      pool: true,
      maxConnections: 1,
      maxMessages: 100,
      family: 4,
      connectionTimeout: 25000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
      auth: { user: account.smtp_user!, pass: account.smtp_pass!.replace(/\s+/g, '') },
    } as any);
  }

  // For imap/smtp accounts: route through TCP proxy if configured
  const proxyHost = process.env.SMTP_PROXY_HOST;
  const directPort = account.smtp_port ?? 587;
  // Proxy listens on 2587 (→587) and 2465 (→465)
  const proxyPort = proxyHost
    ? (directPort === 465 ? 2465 : 2587)
    : directPort;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return nodemailer.createTransport({
    host: proxyHost || account.smtp_host!,
    port: proxyPort,
    secure: directPort === 465,  // SSL on 465, STARTTLS on 587 — same protocol regardless of proxy
    requireTLS: directPort !== 465,
    pool: true,
    maxConnections: 1,
    maxMessages: 100,
    family: 4,
    connectionTimeout: 25000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    auth: { user: account.smtp_user!, pass: account.smtp_pass! },
  } as any);
}

// ─── Transporter cache — reuse pooled connections, evict on any send error ───
const _transportCache = new Map<string, ReturnType<typeof nodemailer.createTransport>>();

function getTransport(account: EmailAccount) {
  const key = account.id || account.email;
  if (!_transportCache.has(key)) {
    _transportCache.set(key, createSmtpTransport(account));
  }
  return _transportCache.get(key)!;
}

function evictTransport(account: EmailAccount) {
  const key = account.id || account.email;
  const t = _transportCache.get(key);
  if (t) {
    try { (t as any).close(); } catch { /* ignore */ }
    _transportCache.delete(key);
  }
}

// ─── Unified send (used by worker and test route) ─────────────────────────────

export async function sendEmail(account: EmailAccount, opts: SendOptions): Promise<{ threadId?: string }> {
  if (account.type === 'gmail-oauth') {
    return sendViaGmailApi(account, opts);
  }
  const transport = getTransport(account);
  try {
    const info = await transport.sendMail(opts);
    return { threadId: (info as any).messageId || undefined };
  } catch (err) {
    // Evict wedged connection — next send rebuilds fresh
    evictTransport(account);
    throw err;
  }
}

// ─── Legacy exports kept for backward compat ─────────────────────────────────

export async function createTransportAsync(account: EmailAccount) {
  if (account.type === 'gmail-oauth') {
    // For gmail-oauth the caller should use sendEmail() instead.
    // This shim returns a fake transport so old call sites still work.
    return {
      sendMail: async (opts: any) => sendViaGmailApi(account, { from: opts.from, to: opts.to, subject: opts.subject, text: opts.text || '', html: opts.html || '' }),
    };
  }
  return createSmtpTransport(account);
}

export { createSmtpTransport as createTransport };

// ─── Template variable replacement ────────────────────────────────────────────

export function replaceVars(text: string, lead: Record<string, string | null>): string {
  return text
    .replace(/\{\{first_name\}\}/g, lead.first_name || '')
    .replace(/\{\{last_name\}\}/g, lead.last_name || '')
    .replace(/\{\{company\}\}/g, lead.company || '')
    .replace(/\{\{title\}\}/g, lead.title || '')
    .replace(/\{\{email\}\}/g, lead.email || '')
    .replace(/\{\{website\}\}/g, lead.website || '');
}

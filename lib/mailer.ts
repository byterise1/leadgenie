import nodemailer from 'nodemailer';
import dns from 'dns';

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

async function sendViaGmailApi(account: EmailAccount, opts: SendOptions): Promise<void> {
  const accessToken = await getAccessToken(account);

  const boundary = `----=_Part_${Date.now()}`;
  const subjectEncoded = `=?UTF-8?B?${Buffer.from(opts.subject).toString('base64')}?=`;
  const raw = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${subjectEncoded}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    opts.text,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    opts.html,
    ``,
    `--${boundary}--`,
  ].join('\r\n');

  const encoded = Buffer.from(raw)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/send', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encoded }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = (body as any)?.error?.message || res.statusText;
      // Map HTTP status to SMTP-like responseCode so the worker can detect auth errors
      const code = res.status === 401 ? 535 : res.status >= 400 && res.status < 500 ? 550 : res.status;
      const err = new Error(`Gmail API ${res.status}: ${msg}`);
      (err as any).responseCode = code;
      throw err;
    }
  } finally {
    clearTimeout(timer);
  }
}

// ─── SMTP transport (gmail-app, imap, smtp) ────────────────────────────────

function createSmtpTransport(account: EmailAccount) {
  if (account.type === 'gmail-app') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      family: 4,
      connectionTimeout: 20000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
      auth: { user: account.smtp_user!, pass: account.smtp_pass! },
    } as any);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return nodemailer.createTransport({
    host: account.smtp_host!,
    port: account.smtp_port ?? 587,
    secure: account.smtp_port === 465,
    family: 4,
    connectionTimeout: 20000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    auth: { user: account.smtp_user!, pass: account.smtp_pass! },
  } as any);
}

// ─── Unified send (used by worker and test route) ─────────────────────────────

export async function sendEmail(account: EmailAccount, opts: SendOptions): Promise<void> {
  if (account.type === 'gmail-oauth') {
    // Use Gmail REST API — SMTP is blocked on Railway/GCP for Gmail
    await sendViaGmailApi(account, opts);
    return;
  }
  const transport = createSmtpTransport(account);
  await transport.sendMail(opts);
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

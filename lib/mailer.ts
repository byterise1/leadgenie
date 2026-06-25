import nodemailer from 'nodemailer';
import dns from 'dns';
import { resolve4 } from 'dns/promises';
import https from 'https';
import net from 'net';
import tls from 'tls';
import { SocksClient } from 'socks';

// Railway/GCP: Node.js ignores dns.setDefaultResultOrder — resolve IPv4 explicitly
dns.setDefaultResultOrder('ipv4first');

async function randomIPv4(hostname: string): Promise<string> {
  try {
    const addrs = await resolve4(hostname);
    if (!addrs.length) return hostname;
    return addrs[Math.floor(Math.random() * addrs.length)];
  } catch {
    return hostname;
  }
}

// ─── SOCKS5 proxy socket (routes through Hetzner to bypass Railway/GCP blocks) ─
// SMTP_PROXY env var format: socks5://HOST:PORT (e.g. socks5://65.21.10.50:1080)
// When set, all SMTP connections tunnel through the proxy server instead of
// connecting directly (which fails on Railway due to GCP IP bans + port blocks).

async function createSocksSocket(targetHost: string, targetPort: number): Promise<net.Socket> {
  const proxyUrl = new URL(process.env.SMTP_PROXY!);
  const { socket } = await SocksClient.createConnection({
    proxy: {
      host: proxyUrl.hostname,
      port: Number(proxyUrl.port) || 1080,
      type: 5,
    },
    command: 'connect',
    destination: { host: targetHost, port: targetPort },
    timeout: 20000,
  });
  return socket;
}

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
  messageId?: string;      // explicit Message-ID header (set on step 0, stored, reused in In-Reply-To)
  inReplyTo?: string;
  references?: string;
  gmailThreadId?: string;  // Gmail thread ID — forces follow-up into existing thread via API
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
  const cacheKey = `${account.id || account.email}:${(account.smtp_pass || '').slice(0, 20)}`;
  const cached = _tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) return cached.token;
  const { token, expiresIn } = await fetchAccessToken(account.smtp_pass!);
  _tokenCache.set(cacheKey, { token, expiresAt: Date.now() + expiresIn * 1000 });
  return token;
}

// ─── Gmail REST API sender (bypasses SMTP entirely) ───────────────────────────

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

async function sendViaGmailApi(account: EmailAccount, opts: SendOptions): Promise<{ threadId?: string; sentMessageId?: string }> {
  const accessToken = await getAccessToken(account);

  const boundary = `----=_Part_${Date.now()}`;
  const subject = opts.subject.match(/[^\x00-\x7F]/)
    ? `=?UTF-8?B?${Buffer.from(opts.subject).toString('base64')}?=`
    : opts.subject;

  const headers = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  if (opts.messageId) headers.push(`Message-ID: ${opts.messageId}`);
  if (opts.inReplyTo) headers.push(`In-Reply-To: ${opts.inReplyTo}`);
  if (opts.references) headers.push(`References: ${opts.references}`);
  headers.push('');

  const rawMessage = [
    ...headers,
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

  const rawBase64 = Buffer.from(rawMessage).toString('base64url');
  let result: Awaited<ReturnType<typeof httpsPost>>;

  if (opts.gmailThreadId) {
    // Follow-up: use JSON endpoint with threadId to explicitly join the existing Gmail thread
    const jsonBody = JSON.stringify({ raw: rawBase64, threadId: opts.gmailThreadId });
    result = await httpsPost(
      'gmail.googleapis.com',
      '/gmail/v1/users/me/messages/send',
      jsonBody,
      { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    );
  } else {
    // Initial email: use upload endpoint (raw RFC 2822)
    result = await httpsPost(
      'gmail.googleapis.com',
      '/upload/gmail/v1/users/me/messages/send?uploadType=media',
      rawMessage,
      { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'message/rfc822' },
    );
  }

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
    return { threadId: body.threadId, sentMessageId: opts.messageId };
  } catch {
    return {};
  }
}

// ─── SMTP transport builder ────────────────────────────────────────────────────
// If SMTP_PROXY is set: opens socket via SOCKS5 proxy (Hetzner), bypassing
// Railway's port blocks and Google's GCP IP ban on smtp.gmail.com.
// If not set: direct connection with IPv4 resolution (existing behaviour).

async function createSmtpTransport(account: EmailAccount) {
  const useProxy = !!process.env.SMTP_PROXY;

  if (account.type === 'gmail-app') {
    const targetHost = 'smtp.gmail.com';
    const targetPort = 587;
    const auth = { user: account.smtp_user!.trim(), pass: account.smtp_pass!.replace(/\s+/g, '') };
    const tlsBase = { servername: targetHost };

    if (useProxy) {
      const socket = await createSocksSocket(targetHost, targetPort);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return nodemailer.createTransport({
        socket,
        secure: false,
        requireTLS: true,
        tls: tlsBase,
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 60000,
        auth,
      } as any);
    }

    const host = await randomIPv4(targetHost);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return nodemailer.createTransport({
      host,
      port: targetPort,
      secure: false,
      requireTLS: true,
      tls: tlsBase,
      pool: true,
      maxConnections: 1,
      maxMessages: 100,
      connectionTimeout: 25000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
      auth,
    } as any);
  }

  // Custom SMTP (Titan, Zoho, cPanel, Hostinger, etc.)
  const smtpHostname = account.smtp_host!.trim();
  const smtpPort = account.smtp_port ?? 587;
  const auth = { user: account.smtp_user!.trim(), pass: account.smtp_pass! };
  const tlsBase = { servername: smtpHostname };
  const isSecure = smtpPort === 465;

  if (useProxy) {
    const rawSocket = await createSocksSocket(smtpHostname, smtpPort);

    // Port 465 uses implicit SSL — nodemailer does not reliably upgrade a
    // pre-connected socket to TLS, so we do it manually before handing off.
    const finalSocket: net.Socket = isSecure
      ? await new Promise<net.Socket>((resolve, reject) => {
          const tlsSocket = tls.connect({
            socket: rawSocket,
            servername: smtpHostname,
            rejectUnauthorized: false,
          });
          tlsSocket.once('secureConnect', () => resolve(tlsSocket as unknown as net.Socket));
          tlsSocket.once('error', reject);
        })
      : rawSocket;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return nodemailer.createTransport({
      socket: finalSocket,
      secure: false,   // socket is already in the right state (plain or TLS)
      requireTLS: false,
      tls: tlsBase,
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
      auth,
    } as any);
  }

  const host = await randomIPv4(smtpHostname);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return nodemailer.createTransport({
    host,
    port: smtpPort,
    secure: isSecure,
    requireTLS: !isSecure,
    tls: tlsBase,
    pool: true,
    maxConnections: 1,
    maxMessages: 100,
    connectionTimeout: 25000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    auth,
  } as any);
}

// ─── Transport cache (direct mode only — proxy sockets are single-use) ────────
const _transportCache = new Map<string, nodemailer.Transporter<any>>();

async function getTransport(account: EmailAccount) {
  const key = account.id || account.email;
  if (!_transportCache.has(key)) {
    _transportCache.set(key, await createSmtpTransport(account));
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

// ─── Unified send ─────────────────────────────────────────────────────────────

export async function sendEmail(account: EmailAccount, opts: SendOptions): Promise<{ threadId?: string; sentMessageId?: string }> {
  if (account.type === 'gmail-oauth') {
    return sendViaGmailApi(account, opts);
  }

  // Build nodemailer options — set explicit Message-ID and thread headers
  const mailOpts: any = { ...opts };
  if (opts.messageId || opts.inReplyTo || opts.references) {
    mailOpts.headers = {
      ...(mailOpts.headers || {}),
      ...(opts.messageId ? { 'Message-ID': opts.messageId } : {}),
    };
  }
  if (opts.inReplyTo) mailOpts.inReplyTo = opts.inReplyTo;
  if (opts.references) mailOpts.references = opts.references;

  // Proxy mode: SOCKS5 socket is single-use — create a fresh transport per email
  if (process.env.SMTP_PROXY) {
    const transport = await createSmtpTransport(account);
    try {
      const info = await transport.sendMail(mailOpts);
      const sentMsgId = opts.messageId || (info as any).messageId;
      return { threadId: sentMsgId, sentMessageId: sentMsgId };
    } finally {
      try { (transport as any).close(); } catch { /* ignore */ }
    }
  }

  // Direct mode: use cached pooled transport
  const transport = await getTransport(account);
  try {
    const info = await transport.sendMail(mailOpts);
    const sentMsgId = opts.messageId || (info as any).messageId;
    return { threadId: sentMsgId, sentMessageId: sentMsgId };
  } catch (err: any) {
    evictTransport(account);
    if (err?.message?.toLowerCase().includes('pool') || err?.message?.toLowerCase().includes('closed')) {
      const fresh = await getTransport(account);
      const info = await fresh.sendMail(mailOpts);
      const sentMsgId = opts.messageId || (info as any).messageId;
      return { threadId: sentMsgId, sentMessageId: sentMsgId };
    }
    throw err;
  }
}

// ─── Legacy exports ───────────────────────────────────────────────────────────

export async function createTransportAsync(account: EmailAccount) {
  if (account.type === 'gmail-oauth') {
    return {
      sendMail: async (opts: any) => sendViaGmailApi(account, { from: opts.from, to: opts.to, subject: opts.subject, text: opts.text || '', html: opts.html || '' }),
    };
  }
  return await createSmtpTransport(account);
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

import nodemailer from 'nodemailer';

export type EmailAccount = {
  id?: string;
  type: string;
  email: string;
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_user?: string | null;
  smtp_pass?: string | null;
};

// In-memory cache: accountId → { token, expiresAt }
// Refreshed automatically when token is within 5 minutes of expiry.
// Cache survives for the lifetime of the Railway process (days/weeks).
const _tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function fetchAccessToken(refreshToken: string): Promise<{ token: string; expiresIn: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000); // 12s timeout
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

async function getAccessToken(account: EmailAccount): Promise<string> {
  // Include first 20 chars of refresh token in key: auto-invalidates cache when user reconnects
  const cacheKey = `${account.id || account.email}:${(account.smtp_pass || '').slice(0, 20)}`;
  const cached = _tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cached.token;
  }
  const { token, expiresIn } = await fetchAccessToken(account.smtp_pass!);
  _tokenCache.set(cacheKey, { token, expiresAt: Date.now() + expiresIn * 1000 });
  return token;
}

// Use this for gmail-oauth — async, handles token refresh automatically.
// Non-OAuth accounts can use the sync createTransport below.
export async function createTransportAsync(account: EmailAccount) {
  if (account.type === 'gmail-oauth') {
    const accessToken = await getAccessToken(account);
    // Pass ONLY accessToken — no refresh credentials.
    // We manage token refresh ourselves (getAccessToken above).
    // Passing refreshToken+clientId to nodemailer causes it to treat the token
    // as expired (no `expires` field set) and run its own refresh loop, which
    // creates a second independent refresh cycle and causes intermittent auth failures.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,        // 587+STARTTLS works on Railway; 465 resolves to IPv6 which Railway can't reach
      secure: false,
      family: 4,        // Force IPv4 — Railway does not support IPv6 outbound
      connectionTimeout: 20000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
      auth: {
        type: 'OAuth2',
        user: account.smtp_user || account.email,
        accessToken,
      },
    } as any);
  }
  return createTransport(account);
}

export function createTransport(account: EmailAccount) {
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

export function replaceVars(text: string, lead: Record<string, string | null>): string {
  return text
    .replace(/\{\{first_name\}\}/g, lead.first_name || '')
    .replace(/\{\{last_name\}\}/g, lead.last_name || '')
    .replace(/\{\{company\}\}/g, lead.company || '')
    .replace(/\{\{title\}\}/g, lead.title || '')
    .replace(/\{\{email\}\}/g, lead.email || '')
    .replace(/\{\{website\}\}/g, lead.website || '');
}

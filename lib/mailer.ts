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
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
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
}

async function getAccessToken(account: EmailAccount): Promise<string> {
  const cacheKey = account.id || account.email;
  const cached = _tokenCache.get(cacheKey);
  // Use cached token if it has more than 5 minutes left
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        type: 'OAuth2',
        user: account.smtp_user || account.email,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        accessToken,
        refreshToken: account.smtp_pass,
      },
    } as any);
  }
  return createTransport(account);
}

export function createTransport(account: EmailAccount) {
  if (account.type === 'gmail-app') {
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: account.smtp_user!, pass: account.smtp_pass! },
    });
  }
  return nodemailer.createTransport({
    host: account.smtp_host!,
    port: account.smtp_port ?? 587,
    secure: account.smtp_port === 465,
    auth: { user: account.smtp_user!, pass: account.smtp_pass! },
  });
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

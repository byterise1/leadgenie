import { ImapFlow } from 'imapflow';
import { createTransport, type EmailAccount } from './mailer';

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms)),
  ]);
}

// Real SMTP AUTH + IMAP login check — not a DNS/MX probe (see lib/smtp-check.ts,
// which verifies a recipient address exists, a completely different thing).
// Reuses createTransport() from lib/mailer.ts so this goes through the exact
// same Hetzner SOCKS5 proxy path real sends use — a naive direct connection
// here would falsely reject valid Gmail/Titan credentials on Railway, since
// Railway/GCP blocks a lot of direct outbound SMTP.
export async function verifyAccountCredentials(account: EmailAccount & { imap_host?: string | null; imap_port?: number | null }): Promise<{ ok: boolean; error?: string }> {
  if (account.type === 'gmail-oauth') return { ok: true }; // already proved itself via Google's consent flow

  try {
    const transport = await createTransport(account);
    try {
      await withTimeout(transport.verify(), 15000, 'SMTP verify');
    } finally {
      try { (transport as unknown as { close: () => void }).close(); } catch { /* ignore */ }
    }
  } catch (e: unknown) {
    return { ok: false, error: `SMTP — ${e instanceof Error ? e.message : 'connection failed'}` };
  }

  // Same host-derivation rule used elsewhere (instrumentation.ts) — Gmail App
  // Password accounts don't collect an IMAP host in the connect form.
  const imapHost = account.imap_host
    || (account.type === 'gmail-app' ? 'imap.gmail.com' : (account.smtp_host ? account.smtp_host.replace(/^smtp\./i, 'imap.') : null));
  if (!imapHost) return { ok: true };

  const imapPort = account.imap_port || 993;
  const imapConfig: ConstructorParameters<typeof ImapFlow>[0] & { proxy?: string } = {
    host: imapHost.trim(), port: imapPort, secure: imapPort === 993,
    auth: { user: (account.smtp_user || account.email).trim(), pass: (account.smtp_pass || '').trim() },
    logger: false, tls: { rejectUnauthorized: false },
    connectionTimeout: 15000, socketTimeout: 20000,
  };
  if (process.env.SMTP_PROXY) imapConfig.proxy = process.env.SMTP_PROXY;

  const client = new ImapFlow(imapConfig);
  try {
    await withTimeout(client.connect(), 15000, 'IMAP connect');
    await client.logout();
  } catch (e: unknown) {
    try { client.close(); } catch { /* ignore */ }
    return { ok: false, error: `IMAP — ${e instanceof Error ? e.message : 'connection failed'}` };
  }

  return { ok: true };
}

import { ImapFlow } from 'imapflow';

export type ImapReply = {
  inReplyTo: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  receivedAt: string;
  snippet: string;
};

export type ImapCredentials = {
  imap_host: string;
  imap_port: number;
  smtp_user: string;
  smtp_pass: string;
  email: string;
};

function extractSnippet(raw: string): string {
  // Find body after email headers (double CRLF)
  const bodyStart = raw.indexOf('\r\n\r\n');
  const body = bodyStart >= 0 ? raw.slice(bodyStart + 4) : raw;
  return body
    .replace(/--[^\r\n]*/g, '')            // MIME boundaries
    .replace(/Content-[^\r\n]+/g, '')      // MIME sub-headers
    .replace(/^On .+wrote:.*$/gm, '')      // "On X wrote:" quoted reply header
    .replace(/^>.*$/gm, '')               // quoted lines starting with >
    .replace(/<[^>]+>/g, ' ')            // HTML tags
    .replace(/[A-Za-z0-9+/]{40,}={0,2}/g, '') // base64 blobs
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

export async function fetchImapReplies(
  account: ImapCredentials,
  sentMessageIds: string[],
  sinceDays = 14,
): Promise<ImapReply[]> {
  if (!account.imap_host || !sentMessageIds.length) return [];

  const idSet = new Set(sentMessageIds.map(normaliseId));

  const imapConfig: ConstructorParameters<typeof ImapFlow>[0] = {
    host: account.imap_host.trim(),
    port: account.imap_port || 993,
    secure: (account.imap_port || 993) === 993,
    auth: { user: (account.smtp_user || account.email).trim(), pass: account.smtp_pass },
    logger: false,
    tls: { rejectUnauthorized: false },
    connectionTimeout: 15000,
    socketTimeout: 20000,
  };
  if (process.env.SMTP_PROXY) {
    (imapConfig as any).proxy = process.env.SMTP_PROXY;
  }
  const client = new ImapFlow(imapConfig);

  const replies: ImapReply[] = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const since = new Date(Date.now() - sinceDays * 24 * 3600 * 1000);
      const uids = await client.search({ since }, { uid: true });

      if (!uids || (uids as number[]).length === 0) return [];

      // Pass 1: envelope only — find matching replies
      type ReplyInfo = { uid: number; inReplyTo: string; fromEmail: string; fromName: string; subject: string; receivedAt: string };
      const matchingUids: number[] = [];
      const replyInfos: ReplyInfo[] = [];

      for await (const msg of client.fetch(uids as number[], { envelope: true }, { uid: true })) {
        const env = msg.envelope;
        if (!env) continue;

        const inReplyTo = env.inReplyTo ? normaliseId(env.inReplyTo) : '';
        if (!inReplyTo || !idSet.has(inReplyTo)) continue;

        const from = env.from?.[0];
        const fromEmail = from?.address || '';
        if (fromEmail.toLowerCase() === account.email.toLowerCase()) continue;

        const matchedId = sentMessageIds.find(mid => normaliseId(mid) === inReplyTo);
        if (!matchedId) continue;

        matchingUids.push(msg.uid as number);
        replyInfos.push({
          uid: msg.uid as number,
          inReplyTo: matchedId,
          fromEmail,
          fromName: from?.name || '',
          subject: env.subject || '',
          receivedAt: (env.date || new Date()).toISOString(),
        });
      }

      // Pass 2: fetch first 2KB of body for snippet (matching messages only)
      const snippetMap = new Map<number, string>();
      if (matchingUids.length > 0) {
        try {
          for await (const msg of client.fetch(
            matchingUids,
            { source: { start: 0, maxLength: 2000 } } as any,
            { uid: true },
          )) {
            const raw = (msg as any).source?.toString('utf8') || '';
            if (raw) snippetMap.set(msg.uid as number, extractSnippet(raw));
          }
        } catch { /* snippet is optional */ }
      }

      for (const info of replyInfos) {
        replies.push({
          inReplyTo: info.inReplyTo,
          fromEmail: info.fromEmail,
          fromName: info.fromName,
          subject: info.subject,
          receivedAt: info.receivedAt,
          snippet: snippetMap.get(info.uid) || '',
        });
      }
    } finally {
      lock.release();
    }
  } catch (err) {
    console.error('[imap-reader] error:', (err as Error).message);
  } finally {
    try { await client.logout(); } catch { /* ignore */ }
  }

  return replies;
}

function normaliseId(id: string): string {
  return id.replace(/[<>]/g, '').toLowerCase().trim();
}

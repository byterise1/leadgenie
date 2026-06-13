import { ImapFlow } from 'imapflow';

export type ImapReply = {
  inReplyTo: string;   // the Message-ID of the sent email this is replying to
  fromEmail: string;
  fromName: string;
  subject: string;
  receivedAt: string;
};

export type ImapCredentials = {
  imap_host: string;
  imap_port: number;
  smtp_user: string;
  smtp_pass: string;
  email: string;
};

export async function fetchImapReplies(
  account: ImapCredentials,
  sentMessageIds: string[],
  sinceDays = 14,
): Promise<ImapReply[]> {
  if (!account.imap_host || !sentMessageIds.length) return [];

  const idSet = new Set(sentMessageIds.map(normaliseId));

  const client = new ImapFlow({
    host: account.imap_host,
    port: account.imap_port || 993,
    secure: (account.imap_port || 993) === 993,
    auth: { user: account.smtp_user || account.email, pass: account.smtp_pass },
    logger: false,
    tls: { rejectUnauthorized: false },
    connectionTimeout: 15000,
    socketTimeout: 20000,
  });

  const replies: ImapReply[] = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const since = new Date(Date.now() - sinceDays * 24 * 3600 * 1000);
      const uids = await client.search({ since }, { uid: true });

      // search returns false if mailbox is empty or search unsupported
      if (!uids || (uids as number[]).length === 0) return [];

      for await (const msg of client.fetch(uids as number[], { envelope: true }, { uid: true })) {
        const env = msg.envelope;
        if (!env) continue;

        const inReplyTo = env.inReplyTo ? normaliseId(env.inReplyTo) : '';
        if (!inReplyTo || !idSet.has(inReplyTo)) continue;

        // Skip our own outgoing emails
        const from = env.from?.[0];
        const fromEmail = from?.address || '';
        if (fromEmail.toLowerCase() === account.email.toLowerCase()) continue;

        // Find the original sentMessageId that matches
        const matchedId = sentMessageIds.find(mid => normaliseId(mid) === inReplyTo);
        if (!matchedId) continue;

        replies.push({
          inReplyTo: matchedId,
          fromEmail,
          fromName: from?.name || '',
          subject: env.subject || '',
          receivedAt: (env.date || new Date()).toISOString(),
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

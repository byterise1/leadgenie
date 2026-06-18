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

function decodeQP(str: string): string {
  return str
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function extractSnippet(raw: string): string {
  const decoded = decodeQP(raw);

  // Mark blockquote regions as "> " lines BEFORE stripping HTML tags
  const withMarkedQuotes = decoded
    .replace(/<blockquote[^>]*>/gi, '\n__QUOTE_START__\n')
    .replace(/<\/blockquote>/gi, '\n__QUOTE_END__\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|tr|li)>/gi, '\n');

  // Strip remaining HTML, MIME structure, base64, URLs
  const stripped = withMarkedQuotes
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/--[^\r\n]*/g, '')
    .replace(/Content-[^\r\n]+/gi, '')
    .replace(/MIME-Version:[^\r\n]+/gi, '')
    .replace(/[A-Za-z0-9+/]{40,}={0,2}/g, '')
    .replace(/https?:\/\/\S+/g, '');

  // Walk line by line; stop before quoted sections
  const lines = stripped.split(/\r?\n/);
  const out: string[] = [];
  let inQuote = false;

  for (const line of lines) {
    const t = line.trim();
    if (t === '__QUOTE_START__') { inQuote = true; continue; }
    if (t === '__QUOTE_END__')   { inQuote = false; continue; }
    if (inQuote) continue;
    if (t.startsWith('>')) break;                          // plain-text quote
    if (/^On .{10,}wrote:\s*$/.test(t)) break;            // "On X wrote:"
    if (/^-{4,}|^_{4,}/.test(t)) break;                  // ---- signature / divider
    const clean = t.replace(/\s+/g, ' ').trim();
    if (clean.length > 1) out.push(clean);
  }

  const snippet = out.join(' ').replace(/\s+/g, ' ').trim();
  return (snippet || out.join(' ')).slice(0, 2000);
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
            { bodyParts: ['TEXT'] } as any,
            { uid: true },
          )) {
            const bp = (msg as any).bodyParts as Map<string, Buffer> | undefined;
            const buf = bp?.get('TEXT') ?? bp?.get('text');
            if (buf) snippetMap.set(msg.uid as number, extractSnippet(buf.toString('utf8')));
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

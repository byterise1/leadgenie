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

  const withMarkedQuotes = decoded
    .replace(/<blockquote[^>]*>/gi, '\n__QUOTE_START__\n')
    .replace(/<\/blockquote>/gi, '\n__QUOTE_END__\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|tr|li)>/gi, '\n');

  const stripped = withMarkedQuotes
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/--[^\r\n]*/g, '')
    .replace(/Content-[^\r\n]+/gi, '')
    .replace(/MIME-Version:[^\r\n]+/gi, '')
    .replace(/[A-Za-z0-9+/]{40,}={0,2}/g, '')
    .replace(/https?:\/\/\S+/g, '');

  const lines = stripped.split(/\r?\n/);
  const out: string[] = [];
  let inQuote = false;

  for (const line of lines) {
    const t = line.trim();
    if (t === '__QUOTE_START__') { inQuote = true; continue; }
    if (t === '__QUOTE_END__')   { inQuote = false; continue; }
    if (inQuote) continue;
    if (t.startsWith('>')) break;
    if (/^On .{10,}wrote:\s*$/.test(t)) break;
    if (/^-{4,}|^_{4,}/.test(t)) break;
    const clean = t.replace(/\s+/g, ' ').trim();
    if (clean.length > 1) out.push(clean);
  }

  const snippet = out.join(' ').replace(/\s+/g, ' ').trim();
  return (snippet || out.join(' ')).slice(0, 2000);
}

function normaliseId(id: string): string {
  return id.replace(/[<>]/g, '').toLowerCase().trim();
}

// Folders to scan in priority order — covers INBOX + common Spam/Junk folder names
const FOLDERS_TO_SCAN = ['INBOX', 'Junk', 'Spam', '[Gmail]/Spam', 'JUNK', 'SPAM'];

async function scanFolder(
  client: ImapFlow,
  folder: string,
  idSet: Set<string>,
  sentMessageIds: string[],
  senderEmail: string,
  since: Date,
): Promise<Array<{ uid: number; inReplyTo: string; fromEmail: string; fromName: string; subject: string; receivedAt: string }>> {
  try {
    await client.getMailboxLock(folder);
  } catch {
    return []; // folder doesn't exist on this server
  }

  const results: Array<{ uid: number; inReplyTo: string; fromEmail: string; fromName: string; subject: string; receivedAt: string }> = [];

  try {
    const uids = await client.search({ since }, { uid: true });
    if (!uids || (uids as number[]).length === 0) return [];

    for await (const msg of client.fetch(uids as number[], { envelope: true }, { uid: true })) {
      const env = msg.envelope;
      if (!env) continue;

      // Skip messages sent by us
      const from = env.from?.[0];
      const fromEmail = from?.address || '';
      if (fromEmail.toLowerCase() === senderEmail.toLowerCase()) continue;

      const inReplyTo = env.inReplyTo ? normaliseId(env.inReplyTo) : '';
      if (!inReplyTo || !idSet.has(inReplyTo)) continue;

      const matchedId = sentMessageIds.find(mid => normaliseId(mid) === inReplyTo);
      if (!matchedId) continue;

      results.push({
        uid: msg.uid as number,
        inReplyTo: matchedId,
        fromEmail,
        fromName: from?.name || '',
        subject: env.subject || '',
        receivedAt: (env.date || new Date()).toISOString(),
      });
    }
  } finally {
    // Lock was already released when getMailboxLock succeeded
  }

  return results;
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
  const since = new Date(Date.now() - sinceDays * 24 * 3600 * 1000);

  try {
    await client.connect();

    // Collect matching messages from INBOX + Spam/Junk folders
    const allMatches: Array<{ uid: number; inReplyTo: string; fromEmail: string; fromName: string; subject: string; receivedAt: string; folder: string }> = [];

    for (const folder of FOLDERS_TO_SCAN) {
      let lock: { release: () => void } | null = null;
      try {
        lock = await client.getMailboxLock(folder);
      } catch {
        continue; // folder doesn't exist — skip silently
      }
      try {
        const uids = await client.search({ since }, { uid: true });
        if (!uids || (uids as number[]).length === 0) continue;

        for await (const msg of client.fetch(uids as number[], { envelope: true }, { uid: true })) {
          const env = msg.envelope;
          if (!env) continue;

          const fromAddr = env.from?.[0];
          const fromEmail = fromAddr?.address || '';
          if (fromEmail.toLowerCase() === account.email.toLowerCase()) continue;

          const inReplyTo = env.inReplyTo ? normaliseId(env.inReplyTo) : '';
          if (!inReplyTo || !idSet.has(inReplyTo)) continue;

          const matchedId = sentMessageIds.find(mid => normaliseId(mid) === inReplyTo);
          if (!matchedId) continue;

          // Dedup: same uid+folder pair only once
          if (!allMatches.some(m => m.uid === (msg.uid as number) && m.folder === folder)) {
            allMatches.push({
              uid: msg.uid as number,
              folder,
              inReplyTo: matchedId,
              fromEmail,
              fromName: fromAddr?.name || '',
              subject: env.subject || '',
              receivedAt: (env.date || new Date()).toISOString(),
            });
          }
        }
      } finally {
        lock.release();
      }
    }

    if (allMatches.length === 0) return [];

    // Fetch snippets for matching messages (INBOX only — body fetch on Junk may fail on some servers)
    const inboxMatches = allMatches.filter(m => m.folder === 'INBOX');
    const snippetMap = new Map<number, string>();
    if (inboxMatches.length > 0) {
      let lock: { release: () => void } | null = null;
      try {
        lock = await client.getMailboxLock('INBOX');
        for await (const msg of client.fetch(
          inboxMatches.map(m => m.uid),
          { bodyParts: ['TEXT'] } as any,
          { uid: true },
        )) {
          const bp = (msg as any).bodyParts as Map<string, Buffer> | undefined;
          const buf = bp?.get('TEXT') ?? bp?.get('text');
          if (buf) snippetMap.set(msg.uid as number, extractSnippet(buf.toString('utf8')));
        }
      } catch { /* snippet is optional */ }
      finally { lock?.release(); }
    }

    for (const info of allMatches) {
      replies.push({
        inReplyTo: info.inReplyTo,
        fromEmail: info.fromEmail,
        fromName: info.fromName,
        subject: info.subject,
        receivedAt: info.receivedAt,
        snippet: snippetMap.get(info.uid) || '',
      });
    }
  } catch (err) {
    console.error('[imap-reader] connection/auth error:', (err as Error).message, '| host:', account.imap_host, 'port:', account.imap_port || 993);
    throw err; // re-throw so caller can report the error
  } finally {
    try { await client.logout(); } catch { /* ignore */ }
  }

  return replies;
}

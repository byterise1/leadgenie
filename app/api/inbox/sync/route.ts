import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAccessToken } from '@/lib/mailer';
import { createNotification } from '@/lib/notifications';
import { fetchImapReplies } from '@/lib/imap-reader';

function getHeader(headers: { name: string; value: string }[] | undefined, name: string): string {
  return headers?.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
}

async function gmailFetch(path: string, accessToken: string) {
  const res = await fetch(`https://gmail.googleapis.com${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function POST(_req: NextRequest) {
  try {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Only Gmail OAuth accounts support reply sync
  const { data: accounts } = await supabaseAdmin
    .from('email_accounts')
    .select('*')
    .eq('user_id', user.id)
    .eq('type', 'gmail-oauth')
    .neq('status', 'error');

  let totalSynced = 0;

  for (const account of (accounts || [])) {
    let accessToken: string;
    try {
      accessToken = await getAccessToken(account);
    } catch {
      continue;
    }

    // Get the 30 most recent sent emails for this account that have a Gmail thread ID
    // and haven't been marked as replied yet
    const { data: sentEmails } = await supabaseAdmin
      .from('sent_emails')
      .select('id, message_id, lead_id, campaign_id, subject')
      .eq('account_id', account.id)
      .not('message_id', 'is', null)
      .is('replied_at', null)
      .limit(30);

    if (!sentEmails?.length) continue;

    // System/bounce senders that should never count as replies
    const SYSTEM_SENDER_PATTERNS = [
      'mailer-daemon', 'postmaster', 'noreply', 'no-reply',
      'bounce', 'delivery', 'auto-reply', 'autoreply',
      'do-not-reply', 'donotreply', 'notifications@', 'notification@',
    ];

    function cleanSnippet(raw: string): string {
      return raw
        .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
        .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        .slice(0, 300);
    }

    for (const sentEmail of sentEmails) {
      try {
        const thread = await gmailFetch(
          `/gmail/v1/users/me/threads/${sentEmail.message_id}?format=metadata&metadataHeaders=From,Subject,Date`,
          accessToken,
        );

        if (!thread?.messages || thread.messages.length <= 1) continue;

        // Skip message[0] (our sent email) — only look at subsequent messages for replies
        const replyMessages = thread.messages.slice(1);

        // Find a reply: must be from someone other than us and not a system/bounce sender.
        // SENT label is the definitive check — a missing/empty From header must not pass.
        const reply = replyMessages.find((m: any) => {
          if (m.labelIds?.includes('SENT')) return false;
          const from = (getHeader(m.payload?.headers, 'From') || '').toLowerCase();
          if (!from || from.includes(account.email.toLowerCase())) return false;
          if (SYSTEM_SENDER_PATTERNS.some(p => from.includes(p))) return false;
          return true;
        });

        if (!reply) continue;

        const fromHeader = getHeader(reply.payload?.headers, 'From');
        const dateHeader = getHeader(reply.payload?.headers, 'Date');
        const subjectHeader = getHeader(reply.payload?.headers, 'Subject') || sentEmail.subject;

        // Require reply date to be strictly AFTER the sent email (guards against same-timestamp duplicates)
        if (dateHeader) {
          const sentTime = new Date(getHeader(thread.messages[0].payload?.headers, 'Date')).getTime();
          const replyTime = new Date(dateHeader).getTime();
          if (replyTime <= sentTime) continue;
        }

        // Parse "Name <email>" or bare email
        const match = fromHeader.match(/^(.+?)\s*<(.+?)>$/);
        const fromName = (match ? match[1].replace(/"/g, '').trim() : fromHeader) || '';
        const fromEmail = (match ? match[2].trim() : fromHeader) || '';
        const receivedAt = dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString();

        // Dedup: one inbox_thread per lead per campaign
        const { data: existing } = await supabaseAdmin
          .from('inbox_threads')
          .select('id')
          .eq('user_id', user.id)
          .eq('lead_id', sentEmail.lead_id)
          .eq('campaign_id', sentEmail.campaign_id)
          .maybeSingle();

        if (!existing) {
          await supabaseAdmin.from('inbox_threads').insert({
            user_id: user.id,
            campaign_id: sentEmail.campaign_id,
            lead_id: sentEmail.lead_id,
            account_id: account.id,
            subject: subjectHeader,
            last_message: cleanSnippet(reply.snippet || ''),
            from_email: fromEmail,
            from_name: fromName,
            status: 'new',
            read: false,
            received_at: receivedAt,
          });
          totalSynced++;
        }

        // Mark the sent email as replied (do this regardless of whether thread was new)
        await supabaseAdmin
          .from('sent_emails')
          .update({ replied_at: receivedAt })
          .eq('id', sentEmail.id);

        // Fire notification only for brand-new threads so it's not re-sent on every sync
        if (!existing) {
          const { data: prof } = await supabaseAdmin
            .from('profiles').select('notif_new_reply').eq('id', user.id).maybeSingle();
          if (prof?.notif_new_reply !== false) {
            await createNotification(
              user.id,
              `New reply from ${fromName || fromEmail} — "${subjectHeader}"`,
              'info',
              '/dashboard/inbox',
            );
          }
        }

        if (sentEmail.lead_id && sentEmail.campaign_id) {
          await supabaseAdmin
            .from('campaign_leads')
            .update({ status: 'replied' })
            .eq('lead_id', sentEmail.lead_id)
            .eq('campaign_id', sentEmail.campaign_id);
        }
      } catch (err) {
        console.error(`Sync error thread ${sentEmail.message_id}:`, err);
      }
    }
  }

  // ── IMAP reply sync (Titan, Zoho, Yahoo, App Password, Custom SMTP) ──────────
  // Include accounts that have either imap_host OR smtp_host (imap_host auto-derived from smtp_host)
  const { data: imapAccountsRaw } = await supabaseAdmin
    .from('email_accounts')
    .select('*')
    .eq('user_id', user.id)
    .in('type', ['imap', 'gmail-app', 'smtp'])
    .neq('status', 'error');

  // Derive imap_host from smtp_host if not explicitly set (e.g. smtp.titan.email → imap.titan.email)
  const imapAccounts = (imapAccountsRaw || []).map((a: any) => ({
    ...a,
    imap_host: a.imap_host || (a.smtp_host ? a.smtp_host.replace(/^smtp\./i, 'imap.') : null),
  })).filter((a: any) => a.imap_host);

  // Collect all active account IDs so we can also scan orphaned sent_emails from deleted accounts
  const allActiveAccountIds = [
    ...((accounts || []).map((a: any) => a.id)),
    ...(imapAccounts.map((a: any) => a.id)),
  ];

  if (imapAccounts?.length) {
    const SYSTEM_SENDER_PATTERNS = [
      'mailer-daemon', 'postmaster', 'noreply', 'no-reply',
      'bounce', 'delivery', 'auto-reply', 'autoreply',
      'do-not-reply', 'donotreply', 'notifications@', 'notification@',
    ];

    for (const account of imapAccounts) {
      try {
        const { data: sentEmails } = await supabaseAdmin
          .from('sent_emails')
          .select('id, message_id, lead_id, campaign_id, subject')
          .eq('account_id', account.id)
          .not('message_id', 'is', null)
          .is('replied_at', null)
          .limit(50);

        if (!sentEmails?.length) continue;

        const messageIds = sentEmails.map((s: { message_id: string }) => s.message_id);

        let replies;
        try {
          replies = await fetchImapReplies(
            {
              imap_host: account.imap_host,
              imap_port: account.imap_port || 993,
              smtp_user: account.smtp_user || account.email,
              smtp_pass: account.smtp_pass,
              email: account.email,
            },
            messageIds,
          );
        } catch (imapErr: any) {
          // Mark account as error so user sees it in the UI
          await supabaseAdmin
            .from('email_accounts')
            .update({ status: 'error' })
            .eq('id', account.id);
          console.error(`[imap-sync] ${account.email} IMAP failed: ${imapErr.message}`);
          continue;
        }

        for (const reply of replies) {
          if (SYSTEM_SENDER_PATTERNS.some(p => reply.fromEmail.toLowerCase().includes(p))) continue;

          // Normalised match — strips <> so slight formatting differences don't cause misses
          const sentEmail = sentEmails.find((s: { message_id: string }) =>
            s.message_id.replace(/[<>]/g, '').toLowerCase() ===
            reply.inReplyTo.replace(/[<>]/g, '').toLowerCase()
          );
          if (!sentEmail) continue;

          // Dedup: one thread per lead per campaign
          const { data: existing } = await supabaseAdmin
            .from('inbox_threads')
            .select('id')
            .eq('user_id', user.id)
            .eq('lead_id', sentEmail.lead_id)
            .eq('campaign_id', sentEmail.campaign_id)
            .maybeSingle();

          if (!existing) {
            await supabaseAdmin.from('inbox_threads').insert({
              user_id: user.id,
              campaign_id: sentEmail.campaign_id,
              lead_id: sentEmail.lead_id,
              account_id: account.id,
              subject: reply.subject || sentEmail.subject,
              last_message: reply.snippet || `Reply from ${reply.fromEmail}`,
              from_email: reply.fromEmail,
              from_name: reply.fromName,
              status: 'new',
              read: false,
              received_at: reply.receivedAt,
            });
            totalSynced++;

            const { data: prof } = await supabaseAdmin
              .from('profiles').select('notif_new_reply').eq('id', user.id).maybeSingle();
            if (prof?.notif_new_reply !== false) {
              await createNotification(
                user.id,
                `New reply from ${reply.fromName || reply.fromEmail} — "${reply.subject || sentEmail.subject}"`,
                'info',
                '/dashboard/inbox',
              );
            }
          }

          // Mark as replied regardless
          await supabaseAdmin
            .from('sent_emails')
            .update({ replied_at: reply.receivedAt })
            .eq('id', sentEmail.id);

          if (sentEmail.lead_id && sentEmail.campaign_id) {
            await supabaseAdmin
              .from('campaign_leads')
              .update({ status: 'replied' })
              .eq('lead_id', sentEmail.lead_id)
              .eq('campaign_id', sentEmail.campaign_id);
          }
        }
      } catch (err) {
        console.error(`[imap-sync] error for ${account.email}:`, (err as Error).message);
      }
    }
  }

  return NextResponse.json({ synced: totalSynced });
  } catch (err) {
    console.error('Inbox sync error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

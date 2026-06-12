import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAccessToken } from '@/lib/mailer';

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

  if (!accounts?.length) return NextResponse.json({ synced: 0 });

  let totalSynced = 0;

  for (const account of accounts) {
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

    for (const sentEmail of sentEmails) {
      try {
        const thread = await gmailFetch(
          `/gmail/v1/users/me/threads/${sentEmail.message_id}?format=metadata&metadataHeaders=From,Subject,Date`,
          accessToken,
        );

        if (!thread?.messages || thread.messages.length <= 1) continue;

        // Find a message NOT from our sending account (i.e. a reply)
        const reply = thread.messages.find((m: any) => {
          const from = getHeader(m.payload?.headers, 'From');
          return !from.toLowerCase().includes(account.email.toLowerCase());
        });

        if (!reply) continue;

        const fromHeader = getHeader(reply.payload?.headers, 'From');
        const dateHeader = getHeader(reply.payload?.headers, 'Date');
        const subjectHeader = getHeader(reply.payload?.headers, 'Subject') || sentEmail.subject;

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
            last_message: reply.snippet || '',
            from_email: fromEmail,
            from_name: fromName,
            status: 'new',
            read: false,
            received_at: receivedAt,
          });
          totalSynced++;
        }

        // Mark the sent email as replied and stop further steps for this lead
        await supabaseAdmin
          .from('sent_emails')
          .update({ replied_at: receivedAt })
          .eq('id', sentEmail.id);

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

  return NextResponse.json({ synced: totalSynced });
}

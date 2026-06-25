import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { thread_id, body } = await req.json();
  if (!thread_id || !body?.trim()) return NextResponse.json({ error: 'thread_id and body required' }, { status: 400 });

  // Fetch the thread with account + lead + original sent email for threading headers
  const { data: thread } = await supabaseAdmin
    .from('inbox_threads')
    .select('*, account:email_accounts(*), lead:leads(email,first_name,last_name)')
    .eq('id', thread_id)
    .eq('user_id', user.id)
    .single();

  if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 });

  const account = thread.account;
  if (!account) return NextResponse.json({ error: 'Sending account not found' }, { status: 400 });

  // Get original sent email for In-Reply-To threading
  const { data: firstSent } = await supabaseAdmin
    .from('sent_emails')
    .select('message_id, subject')
    .eq('campaign_id', thread.campaign_id)
    .eq('lead_id', thread.lead_id)
    .eq('step_number', 0)
    .order('sent_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const subject = thread.subject?.startsWith('Re:') ? thread.subject : `Re: ${thread.subject}`;
  const toEmail = thread.from_email;

  const { sendEmail } = await import('@/lib/mailer');

  try {
    await sendEmail(account, {
      from: account.email,
      to: toEmail,
      subject,
      text: body.trim(),
      html: `<p style="font-family:Arial,sans-serif;font-size:14px;color:#111;white-space:pre-wrap">${body.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`,
      ...(firstSent?.message_id && account.type !== 'gmail-oauth'
        ? { inReplyTo: firstSent.message_id, references: firstSent.message_id }
        : {}),
      ...(firstSent?.message_id && account.type === 'gmail-oauth'
        ? { gmailThreadId: firstSent.message_id }
        : {}),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Send failed' }, { status: 500 });
  }

  // Mark thread as replied if it wasn't already
  await supabaseAdmin
    .from('inbox_threads')
    .update({ status: 'replied', read: true })
    .eq('id', thread_id);

  return NextResponse.json({ ok: true });
}

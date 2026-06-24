import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

function replaceVars(template: string, lead: Record<string, unknown>): string {
  return template
    .replace(/\{\{first_name\}\}/gi, String(lead.first_name || ''))
    .replace(/\{\{last_name\}\}/gi, String(lead.last_name || ''))
    .replace(/\{\{email\}\}/gi, String(lead.email || ''))
    .replace(/\{\{company\}\}/gi, String(lead.company || ''))
    .replace(/\{\{title\}\}/gi, String(lead.title || ''))
    .replace(/\{\{website\}\}/gi, String(lead.website || ''))
    .replace(/\{\{phone\}\}/gi, String(lead.phone || ''));
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Fetch the inbox thread (verify ownership)
  const { data: thread, error: threadErr } = await supabaseAdmin
    .from('inbox_threads')
    .select('*, lead:leads(*), campaign:campaigns(id,name,from_name), account:email_accounts(email)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (threadErr || !thread) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Fetch all sent emails for this lead+campaign (the full send history)
  const { data: sentEmails } = await supabaseAdmin
    .from('sent_emails')
    .select('id, step_number, subject, sent_at, opened_at, account_id')
    .eq('campaign_id', thread.campaign_id)
    .eq('lead_id', thread.lead_id)
    .order('step_number', { ascending: true });

  // Fetch email_steps to get template bodies
  const { data: emailSteps } = await supabaseAdmin
    .from('email_steps')
    .select('step_number, subject, body, thread_mode')
    .eq('campaign_id', thread.campaign_id)
    .order('step_number', { ascending: true });

  const stepMap = new Map((emailSteps || []).map(s => [s.step_number, s]));
  const lead = thread.lead as Record<string, unknown>;

  // Build message list: one entry per sent email
  const sentMessages = (sentEmails || []).map(se => {
    const step = stepMap.get(se.step_number);
    const isReply = se.step_number > 0 && step?.thread_mode === 'reply';
    return {
      type: 'sent' as const,
      step_number: se.step_number,
      subject: se.subject || (step ? replaceVars(step.subject, lead) : ''),
      body: step ? replaceVars(step.body, lead) : '',
      sent_at: se.sent_at,
      opened_at: se.opened_at,
      is_reply_thread: isReply,
      account_email: thread.account?.email || '',
      from_name: (thread.campaign as any)?.from_name || '',
    };
  });

  // The lead's reply is the last event
  const replyMessage = {
    type: 'reply' as const,
    step_number: -1,
    subject: thread.subject,
    body: thread.last_message || '',
    sent_at: thread.received_at,
    from_email: thread.from_email,
    from_name: thread.from_name,
  };

  // Merge and sort by time
  const allMessages = [...sentMessages, replyMessage].sort(
    (a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
  );

  return NextResponse.json({
    thread,
    messages: allMessages,
  });
}

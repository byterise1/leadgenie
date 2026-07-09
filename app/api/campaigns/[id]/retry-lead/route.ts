import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { computeAccountRemaining } from '@/lib/campaign-scheduling';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: campaignId } = await params;
  const { campaign_lead_id } = await req.json();

  // Verify campaign ownership
  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('id, user_id, min_delay_secs, max_delay_secs, email_steps(*), campaign_accounts(account:email_accounts(*))')
    .eq('id', campaignId)
    .eq('user_id', user.id)
    .single();

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

  // Get the stuck lead
  const { data: cl } = await supabaseAdmin
    .from('campaign_leads')
    .select('id, lead_id, current_step, status, account_id')
    .eq('id', campaign_lead_id)
    .eq('campaign_id', campaignId)
    .single();

  if (!cl) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  if (cl.status !== 'active') return NextResponse.json({ error: 'Lead is not in active state' }, { status: 400 });

  const stepNumber = cl.current_step;
  const hasStep = campaign.email_steps.some((s: any) => s.step_number === stepNumber);
  if (!hasStep) return NextResponse.json({ error: `No step ${stepNumber} in campaign` }, { status: 400 });

  // Health-aware, pacing-aware, capacity-aware selection — same filters the
  // campaign scheduler itself applies, so a manual retry can never send from
  // an account the automated system would refuse to use or bypass its
  // configured send-delay.
  const accounts = campaign.campaign_accounts.map((ca: any) => ca.account).filter(Boolean);
  if (!accounts.length) return NextResponse.json({ error: 'No sending accounts on this campaign' }, { status: 400 });

  const remaining = await computeAccountRemaining(accounts);
  if (remaining.size === 0) {
    return NextResponse.json({
      error: 'All sending accounts for this campaign are still in their configured pacing window, unhealthy, or out of capacity for today — try again in a few minutes.',
    }, { status: 409 });
  }

  // Prefer the lead's sticky mailbox if it's eligible; otherwise the account
  // with the most room today.
  const stickyId = cl.account_id && remaining.has(cl.account_id) ? cl.account_id : undefined;
  const accId = stickyId ?? [...remaining.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const account = accounts.find((a: any) => a.id === accId);

  // Reserve the same way the scheduler does, so the next scheduler cycle (or
  // another retry) doesn't double-book this mailbox inside its cooldown.
  const minDelayMs = Math.max(10_000, (campaign.min_delay_secs || 60) * 1000);
  const maxDelayMs = Math.max(minDelayMs + 1000, (campaign.max_delay_secs || 300) * 1000);
  const now = Date.now();
  const reservation = account.next_dispatch_at ? new Date(account.next_dispatch_at).getTime() : 0;
  const delay = Math.max(0, reservation - now);
  const nextReservation = Math.max(now, reservation) + minDelayMs + Math.floor(Math.random() * (maxDelayMs - minDelayMs));

  const { emailQueue } = await import('@/lib/queue');
  await emailQueue.add('send', {
    campaignLeadId: cl.id,
    stepNumber,
    accountId: accId,
  }, { delay });

  // Heal the sticky pointer immediately if it was stale, and persist the
  // pacing reservation so this mailbox isn't double-booked before it sends.
  await Promise.all([
    cl.account_id !== accId
      ? supabaseAdmin.from('campaign_leads').update({ account_id: accId }).eq('id', cl.id)
      : Promise.resolve(),
    supabaseAdmin.from('email_accounts').update({ next_dispatch_at: new Date(nextReservation).toISOString() }).eq('id', accId),
  ]);

  return NextResponse.json({ ok: true, message: `Step ${stepNumber + 1} queued for retry via ${account.email}${delay > 0 ? ` (in ~${Math.round(delay / 60000)} min, respecting pacing)` : ''}` });
}

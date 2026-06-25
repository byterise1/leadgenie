import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: campaignId } = await params;
  const { campaign_lead_id } = await req.json();

  // Verify campaign ownership
  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('id, user_id, email_steps(*), campaign_accounts(account:email_accounts(id,email,type,status))')
    .eq('id', campaignId)
    .eq('user_id', user.id)
    .single();

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

  // Get the stuck lead
  const { data: cl } = await supabaseAdmin
    .from('campaign_leads')
    .select('id, lead_id, current_step, status')
    .eq('id', campaign_lead_id)
    .eq('campaign_id', campaignId)
    .single();

  if (!cl) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  if (cl.status !== 'active') return NextResponse.json({ error: 'Lead is not in active state' }, { status: 400 });

  const stepNumber = cl.current_step;
  const hasStep = campaign.email_steps.some((s: any) => s.step_number === stepNumber);
  if (!hasStep) return NextResponse.json({ error: `No step ${stepNumber} in campaign` }, { status: 400 });

  // Pick first active account
  const accounts = campaign.campaign_accounts
    .map((ca: any) => ca.account)
    .filter((a: any) => a && a.status !== 'error');
  if (!accounts.length) return NextResponse.json({ error: 'No active sending accounts on this campaign' }, { status: 400 });

  const { emailQueue } = await import('@/lib/queue');
  await emailQueue.add('send', {
    campaignLeadId: cl.id,
    stepNumber,
    accountId: accounts[0].id,
  }, { delay: 0 });

  return NextResponse.json({ ok: true, message: `Step ${stepNumber + 1} queued for immediate retry` });
}

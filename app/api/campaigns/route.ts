import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with list names
  const listIds = [...new Set((data || []).filter(c => c.list_id).map(c => c.list_id as string))];
  const listMap: Record<string, { name: string; count?: number }> = {};
  if (listIds.length) {
    const { data: lists } = await supabaseAdmin
      .from('lead_lists')
      .select('id,name')
      .in('id', listIds);
    (lists || []).forEach((l: { id: string; name: string }) => { listMap[l.id] = { name: l.name }; });
  }

  // Real sent count per campaign from sent_emails (overrides stale total_sent column)
  const campaignIds = (data || []).map((c: { id: string }) => c.id);
  const sentPerCampaign: Record<string, number> = {};
  if (campaignIds.length) {
    const { data: sentRows } = await supabaseAdmin
      .from('sent_emails')
      .select('campaign_id')
      .in('campaign_id', campaignIds);
    (sentRows || []).forEach((s: { campaign_id: string }) => {
      sentPerCampaign[s.campaign_id] = (sentPerCampaign[s.campaign_id] || 0) + 1;
    });
  }

  const enriched = (data || []).map((c: Record<string, unknown>) => ({
    ...c,
    list_name: (c.list_id as string) ? (listMap[c.list_id as string]?.name ?? null) : null,
    total_sent: sentPerCampaign[c.id as string] ?? c.total_sent ?? 0,
  }));

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, goal, daily_limit, from_hour, to_hour, active_days, timezone, start_date, steps, account_ids, min_delay_secs, max_delay_secs, list_id } = body;

  if (!name || !steps?.length) {
    return NextResponse.json({ error: 'name and steps required' }, { status: 400 });
  }

  // Create campaign
  const { data: campaign, error: campErr } = await supabaseAdmin
    .from('campaigns')
    .insert({
      user_id: user.id,
      name,
      goal: goal || 'Book a Meeting',
      daily_limit: daily_limit || 50,
      from_hour: from_hour || '8:00 AM',
      to_hour: to_hour || '6:00 PM',
      active_days: active_days || [true,true,true,true,true,false,false],
      timezone: timezone || 'UTC',
      start_date: start_date || null,
      min_delay_secs: min_delay_secs || 60,
      max_delay_secs: max_delay_secs || 300,
      list_id: list_id || null,
      status: 'draft',
    })
    .select()
    .single();

  if (campErr) return NextResponse.json({ error: campErr.message }, { status: 500 });

  // Insert email steps
  const stepRows = steps.map((s: any, i: number) => ({
    campaign_id: campaign.id,
    step_number: i,
    subject: s.subject,
    body: s.body,
    delay_days: s.delay || 0,
    include_unsub: s.includeUnsub || false,
  }));

  await supabaseAdmin.from('email_steps').insert(stepRows);

  // Link sending accounts
  if (account_ids?.length) {
    const accountRows = account_ids.map((aid: string) => ({
      campaign_id: campaign.id,
      account_id: aid,
    }));
    await supabaseAdmin.from('campaign_accounts').insert(accountRows);
  }

  return NextResponse.json(campaign);
}

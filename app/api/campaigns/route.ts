import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { NEW_CAMPAIGN_STEP_DELAY_UNIT_MS } from '@/lib/campaign-scheduling';

export async function GET() {
  try {
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

  // Counts matching competitor behaviour: opens/clicks = unique leads, not raw email rows
  const campaignIds = (data || []).map((c: { id: string }) => c.id);
  const statsByCampaign: Record<string, { sent: number; opened: number; replied: number; clicked: number }> = {};
  if (campaignIds.length) {
    const [sentRows, repliedRows] = await Promise.all([
      supabaseAdmin.from('sent_emails').select('campaign_id,lead_id,opened_at,clicked_at').in('campaign_id', campaignIds),
      supabaseAdmin.from('campaign_leads').select('campaign_id').in('campaign_id', campaignIds).eq('status', 'replied'),
    ]);
    // Track unique lead_ids per campaign for opens/clicks
    const openedLeads: Record<string, Set<string>> = {};
    const clickedLeads: Record<string, Set<string>> = {};
    (sentRows.data || []).forEach((s: { campaign_id: string; lead_id: string; opened_at: string | null; clicked_at: string | null }) => {
      const r = statsByCampaign[s.campaign_id] || { sent: 0, opened: 0, replied: 0, clicked: 0 };
      r.sent++;
      statsByCampaign[s.campaign_id] = r;
      if (s.opened_at) {
        if (!openedLeads[s.campaign_id]) openedLeads[s.campaign_id] = new Set();
        openedLeads[s.campaign_id].add(s.lead_id);
      }
      if (s.clicked_at) {
        if (!clickedLeads[s.campaign_id]) clickedLeads[s.campaign_id] = new Set();
        clickedLeads[s.campaign_id].add(s.lead_id);
      }
    });
    // Write unique counts back
    for (const cid of campaignIds) {
      const r = statsByCampaign[cid] || { sent: 0, opened: 0, replied: 0, clicked: 0 };
      r.opened  = openedLeads[cid]?.size  ?? 0;
      r.clicked = clickedLeads[cid]?.size ?? 0;
      statsByCampaign[cid] = r;
    }
    (repliedRows.data || []).forEach((r: { campaign_id: string }) => {
      const s = statsByCampaign[r.campaign_id] || { sent: 0, opened: 0, replied: 0, clicked: 0 };
      s.replied++;
      statsByCampaign[r.campaign_id] = s;
    });
  }

  const enriched = (data || []).map((c: Record<string, unknown>) => {
    const s = statsByCampaign[c.id as string] || { sent: 0, opened: 0, replied: 0, clicked: 0 };
    return {
      ...c,
      list_name: (c.list_id as string) ? (listMap[c.list_id as string]?.name ?? null) : null,
      total_sent: s.sent ?? c.total_sent ?? 0,
      total_opened: s.opened,
      total_replied: s.replied,
      total_clicked: s.clicked,
    };
  });

  return NextResponse.json(enriched);
  } catch (err) {
    console.error('Campaigns GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, goal, daily_limit, daily_limit_mode, from_hour, to_hour, active_days, timezone, start_date, steps, account_ids, min_delay_secs, max_delay_secs, list_id, from_name, followup_priority_mode, followup_weight_pct, is_test_campaign } = body;

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
      from_name: from_name?.trim() || null,
      daily_limit: daily_limit || 50,
      daily_limit_mode: daily_limit_mode === 'manual' ? 'manual' : 'auto',
      from_hour: from_hour || '8:00 AM',
      to_hour: to_hour || '6:00 PM',
      active_days: active_days || [true,true,true,true,true,false,false],
      timezone: timezone || 'UTC',
      start_date: start_date || null,
      min_delay_secs: min_delay_secs || 60,
      max_delay_secs: max_delay_secs || 300,
      list_id: list_id || null,
      followup_priority_mode: followup_priority_mode === 'manual' ? 'manual' : 'auto',
      followup_weight_pct: followup_priority_mode === 'manual' ? (followup_weight_pct ?? 90) : null,
      // Stamped once, permanently, at creation time — see the long comment
      // above NEW_CAMPAIGN_STEP_DELAY_UNIT_MS in lib/campaign-scheduling.ts.
      // Existing campaigns are never touched by this; this campaign keeps
      // whichever unit was active right now, forever, even if the flag
      // controlling NEW_CAMPAIGN_STEP_DELAY_UNIT_MS is flipped back later.
      step_delay_unit_ms: NEW_CAMPAIGN_STEP_DELAY_UNIT_MS,
      // Explicit opt-in flag, independent of delay timing — gates access to
      // the "Skip to Next Day" button (see advance-day/route.ts). Every
      // campaign, test or not, uses real day-based delays now; this is the
      // only thing that makes a campaign fast-clickable for QA.
      is_test_campaign: !!is_test_campaign,
      status: 'draft',
    })
    .select()
    .single();

  if (campErr) return NextResponse.json({ error: campErr.message }, { status: 500 });

  // Insert email steps including thread_mode (requires migration 20260625_ensure_all_columns.sql)
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const baseStepRows = steps.map((s: any, i: number) => ({
    campaign_id: campaign.id,
    step_number: i,
    subject: s.subject,
    body: s.body,
    delay_days: s.delay || 0,
    include_unsub: s.includeUnsub || false,
    thread_mode: (s.threadMode === 'reply' || s.threadMode === 'new_thread') ? s.threadMode : 'new_thread',
    ab_variants: Array.isArray(s.abVariants) && s.abVariants.length > 0 ? s.abVariants : [],
  }));

  const { data: insertedSteps, error: stepsErr } = await supabaseAdmin
    .from('email_steps').insert(baseStepRows).select('id, step_number');

  if (stepsErr) {
    console.error('email_steps insert error:', stepsErr.message);
    await supabaseAdmin.from('campaigns').delete().eq('id', campaign.id);
    return NextResponse.json({ error: 'Failed to save email steps: ' + stepsErr.message }, { status: 500 });
  }

  // Best-effort: write template_id if provided (separate update to avoid blocking step insert)
  if (insertedSteps?.length) {
    for (const row of insertedSteps) {
      const src = steps[row.step_number as number];
      const tid = src?.templateId;
      if (tid && UUID_RE.test(tid)) {
        await supabaseAdmin.from('email_steps').update({ template_id: tid }).eq('id', row.id);
      }
    }
  }

  // Link sending accounts
  if (account_ids?.length) {
    const accountRows = account_ids.map((aid: string) => ({
      campaign_id: campaign.id,
      account_id: aid,
    }));
    await supabaseAdmin.from('campaign_accounts').insert(accountRows);
  }

  return NextResponse.json(campaign);
  } catch (err) {
    console.error('Campaigns POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .select('*, email_steps(*), campaign_accounts(account:email_accounts(id,email,type,status,health_score,warmup_day,warmup_enabled,already_warmed_up,warmup_paused,smtp_host,daily_limit))')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);
  const { count: sentTodayCount } = await supabaseAdmin
    .from('sent_emails').select('id', { count: 'exact', head: true })
    .eq('campaign_id', id).gte('sent_at', todayUTC.toISOString());

  // Counts matching competitor behaviour (Instantly/Smartlead):
  // - Sent   = total emails delivered across all steps
  // - Opens  = unique leads who opened ANY step (deduplicated by lead_id)
  // - Clicks = unique leads who clicked ANY step (deduplicated by lead_id)
  // - Replies= unique leads with status='replied'
  const [sentRes, openedRows, repliedRes, clickedRows] = await Promise.all([
    supabaseAdmin.from('sent_emails').select('id', { count: 'exact', head: true }).eq('campaign_id', id),
    supabaseAdmin.from('sent_emails').select('lead_id').eq('campaign_id', id).not('opened_at', 'is', null),
    supabaseAdmin.from('campaign_leads').select('id', { count: 'exact', head: true }).eq('campaign_id', id).eq('status', 'replied'),
    supabaseAdmin.from('sent_emails').select('lead_id').eq('campaign_id', id).not('clicked_at', 'is', null),
  ]);

  const totalSent    = sentRes.error    ? data.total_sent    : (sentRes.count ?? 0);
  const totalOpened  = new Set((openedRows.data  || []).map((r: any) => r.lead_id)).size;
  const totalReplied = repliedRes.error ? data.total_replied : (repliedRes.count ?? 0);
  const totalClicked = new Set((clickedRows.data || []).map((r: any) => r.lead_id)).size;

  // Per-step sent counts — used by the step editor to lock the position of
  // any step that's already gone out to at least one lead. Reordering (or
  // silently editing) an already-sent step's content would make that
  // position mean two different emails depending on which cohort of leads
  // you look at, so the UI needs to know which positions are "live" history.
  const { data: sentStepRows } = await supabaseAdmin
    .from('sent_emails').select('step_number').eq('campaign_id', id);
  const sentCountByStep: Record<number, number> = {};
  for (const r of sentStepRows || []) {
    const n = (r as any).step_number as number;
    sentCountByStep[n] = (sentCountByStep[n] ?? 0) + 1;
  }

  return NextResponse.json({ ...data, total_sent: totalSent, total_opened: totalOpened, total_replied: totalReplied, total_clicked: totalClicked, sent_today: sentTodayCount ?? 0, sent_count_by_step: sentCountByStep });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // This is the single generic endpoint for Pause/Resume, Schedule & Limits,
  // and Follow-up Priority edits — a hard failure here breaks all of those,
  // not just the "last edited" timestamp. Degrade gracefully if the
  // updated_at migration hasn't run yet (same pattern as safeUpdateAccount
  // in instrumentation.ts for the same class of not-yet-run-migration risk)
  // instead of letting one missing column take down every campaign edit.
  let { data, error } = await supabaseAdmin
    .from('campaigns')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error?.message?.includes('updated_at') || error?.message?.includes('column')) {
    ({ data, error } = await supabaseAdmin
      .from('campaigns')
      .update(body)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // inbox_threads.campaign_id has no ON DELETE CASCADE — null it out first to avoid FK violation
  await supabaseAdmin.from('inbox_threads').update({ campaign_id: null }).eq('campaign_id', id);

  const { error } = await supabaseAdmin
    .from('campaigns')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

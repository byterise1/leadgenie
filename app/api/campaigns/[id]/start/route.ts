import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/rate-limit';
import { detectProvider, campaignDailyCap } from '@/lib/warmup-health';
import { PRODUCTION_STEP_DELAY_UNIT_MS, planBacklogSmoothing } from '@/lib/campaign-scheduling';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body: { resumeMode?: 'auto' | 'fast' | 'spread'; spreadDays?: number } = await req.json().catch(() => ({}));
  const resumeMode = body.resumeMode === 'fast' || body.resumeMode === 'spread' ? body.resumeMode : 'auto';

  const rate = await checkRateLimit(user.id, 'campaign_start');
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many campaign starts in a short time — please wait a bit and try again.' }, { status: 429 });
  }

  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('*, campaign_accounts(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  if (!campaign.campaign_accounts?.length) {
    return NextResponse.json({ error: 'Add at least one sending account first' }, { status: 400 });
  }

  // Warmup safety gate — block launch if every linked account is currently unsafe
  // (paused for bounce/spam issues, or health so low it would just burn the mailbox).
  const accountIds = campaign.campaign_accounts.map((ca: any) => ca.account_id);
  let linkedAccounts: Record<string, any>[] | null;
  {
    const res = await supabaseAdmin
      .from('email_accounts')
      .select('id, email, type, smtp_host, health_score, warmup_day, warmup_enabled, warmup_paused, warmup_pause_reason')
      .in('id', accountIds);
    linkedAccounts = res.data;
  }

  // Phase 1 migration not run yet — fall back so the health/cap safety check still works
  // even without the warmup_paused column.
  if (!linkedAccounts) {
    const fallback = await supabaseAdmin
      .from('email_accounts')
      .select('id, email, type, smtp_host, health_score, warmup_day, warmup_enabled')
      .in('id', accountIds);
    linkedAccounts = fallback.data;
  }

  const accountWarnings: string[] = [];
  let totalAccountCapacityPerDay = 0;
  const safeAccounts = (linkedAccounts || []).filter(a => {
    if (a.warmup_paused) {
      accountWarnings.push(`${a.email} is paused (${a.warmup_pause_reason || 'reputation issue'}) — excluded until it recovers.`);
      return false;
    }
    if ((a.health_score ?? 50) < 35) {
      accountWarnings.push(`${a.email} health is too low (${a.health_score}%) to send safely — excluded.`);
      return false;
    }
    const cap = campaignDailyCap({
      provider: detectProvider(a as any), warmupDay: a.warmup_day ?? 0, health: a.health_score ?? 50, warmupComplete: !a.warmup_enabled,
    });
    if (cap === 0) {
      accountWarnings.push(`${a.email} isn't cleared to send real campaigns yet — excluded.`);
      return false;
    }
    totalAccountCapacityPerDay += cap;
    return true;
  });

  if ((linkedAccounts?.length ?? 0) > 0 && safeAccounts.length === 0) {
    return NextResponse.json({
      error: `None of this campaign's sending accounts are safe to send from right now: ${accountWarnings.join(' ')}`,
    }, { status: 400 });
  }

  // Verify email steps exist
  const { data: emailSteps } = await supabaseAdmin
    .from('email_steps').select('id').eq('campaign_id', id).limit(1);
  if (!emailSteps?.length) {
    return NextResponse.json({ error: 'This campaign has no email steps. Please delete it and create a new one.' }, { status: 400 });
  }

  // Auto-enroll leads from the linked list (upsert so re-launching is safe)
  if (campaign.list_id) {
    const { data: members } = await supabaseAdmin
      .from('lead_list_members')
      .select('lead_id, lead:leads(status)')
      .eq('list_id', campaign.list_id);

    if (members?.length) {
      const enrollRows = members
        .filter((m: any) => m.lead?.status !== 'unsubscribed')
        .map((m: any) => ({
          campaign_id: id,
          lead_id: m.lead_id,
          status: 'pending',
        }));
      if (enrollRows.length) {
        await supabaseAdmin
          .from('campaign_leads')
          .upsert(enrollRows, { onConflict: 'campaign_id,lead_id', ignoreDuplicates: true });
      }
    }
  }

  const [{ data: campaignLeads }, { data: stepsData }] = await Promise.all([
    supabaseAdmin
      .from('campaign_leads')
      .select('id, status, current_step, last_sent_at, next_send_at')
      .eq('campaign_id', id)
      .in('status', ['pending', 'active']),
    supabaseAdmin
      .from('email_steps')
      .select('step_number, delay_days')
      .eq('campaign_id', id)
      .order('step_number'),
  ]);

  if (!campaignLeads?.length) {
    if (campaign.list_id) {
      return NextResponse.json({ error: 'The selected lead list is empty. Add leads to the list first.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'No leads enrolled in this campaign' }, { status: 400 });
  }

  // Only reset stats when starting fresh from draft, not on resume
  const wasPaused = campaign.status === 'paused';
  const statsReset = campaign.status === 'draft' ? { total_sent: 0, total_opened: 0, total_replied: 0 } : {};
  const { error: updateErr } = await supabaseAdmin
    .from('campaigns')
    .update({ status: 'active', ...statsReset })
    .eq('id', id);
  if (updateErr) {
    console.error('[start] campaign update failed:', updateErr.message);
    return NextResponse.json({ error: `Could not activate campaign: ${updateErr.message}` }, { status: 500 });
  }

  // Scheduling itself is no longer decided here — the recurring campaign-scheduler
  // worker (instrumentation.ts) picks up every 'pending' and 'active' lead on its
  // next cycle (within a few minutes) and decides what to send based on live
  // capacity + follow-up priority. All this route needs to do is make sure any
  // lead resuming mid-sequence has a sane next_send_at, so it isn't treated as
  // "due immediately" purely because the campaign was paused for a while — a
  // still-fresh follow-up (small delay_days, recently paused) should still wait
  // out its real remaining delay, not fire the moment the campaign resumes.
  const stepDelayDays: Record<number, number> = {};
  (stepsData || []).forEach((s: any) => { stepDelayDays[s.step_number] = s.delay_days ?? 1; });

  // This campaign's own permanently-stamped follow-up delay unit — 24h for
  // every campaign created before/without TEST_MODE_FAST_FOLLOWUPS, 1 real
  // minute only for campaigns created while it was on. Never the global
  // default directly, so existing campaigns are unaffected either way.
  const stepDelayUnitMs = campaign.step_delay_unit_ms ?? PRODUCTION_STEP_DELAY_UNIT_MS;

  const naturalDue = (campaignLeads as any[])
    .filter(cl => cl.status === 'active' && !cl.next_send_at)
    .map(cl => {
      const step = cl.current_step ?? 1;
      const delayDays = stepDelayDays[step] ?? 1;
      const lastSentMs = cl.last_sent_at ? new Date(cl.last_sent_at).getTime() : Date.now();
      return { id: cl.id, dueAt: lastSentMs + delayDays * stepDelayUnitMs };
    });

  // Only smooth on a genuine resume (paused -> active) — first launch from
  // draft has no backlog to speak of, and real send-time capacity is still
  // fully re-checked every cycle by the scheduler regardless, so this only
  // ever pushes next_send_at further into the future, never sooner.
  const smoothed = wasPaused
    ? planBacklogSmoothing({ leads: naturalDue, dailyCapacity: totalAccountCapacityPerDay, mode: resumeMode, spreadDays: body.spreadDays })
    : new Map(naturalDue.map(l => [l.id, l.dueAt]));

  for (const [leadId, dueMs] of smoothed) {
    await supabaseAdmin.from('campaign_leads').update({ next_send_at: new Date(dueMs).toISOString() }).eq('id', leadId);
  }

  return NextResponse.json({
    success: true, status: 'active', enrolled: campaignLeads.length,
    ...(accountWarnings.length ? { warnings: accountWarnings } : {}),
  });
}

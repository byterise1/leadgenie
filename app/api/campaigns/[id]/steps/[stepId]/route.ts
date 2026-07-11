import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { resyncStepsAfterAddOrReorder, deleteStepAndResync, recomputeNextSendForDelayChange, mapWithConcurrency } from '@/lib/campaign-scheduling';

async function requireEditableCampaign(campaignId: string, userId: string) {
  const { data: campaign } = await supabaseAdmin
    .from('campaigns').select('id, status').eq('id', campaignId).eq('user_id', userId).maybeSingle();
  if (!campaign) return { error: NextResponse.json({ error: 'Campaign not found' }, { status: 404 }) };
  if (campaign.status !== 'draft' && campaign.status !== 'paused') {
    return { error: NextResponse.json(
      { error: 'Pause this campaign before editing its steps — leads may be mid-sequence right now.' },
      { status: 409 },
    ) };
  }
  return { campaign };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; stepId: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: campaignId, stepId } = await params;
  const guard = await requireEditableCampaign(campaignId, user.id);
  if (guard.error) return guard.error;

  const { data: step } = await supabaseAdmin
    .from('email_steps').select('id, step_number, delay_days').eq('id', stepId).eq('campaign_id', campaignId).maybeSingle();
  if (!step) return NextResponse.json({ error: 'Step not found' }, { status: 404 });

  const { subject, body, delay_days, include_unsub, thread_mode, newPosition } = await req.json();

  const contentFields: Record<string, unknown> = {};
  if (subject !== undefined) contentFields.subject = subject;
  if (body !== undefined) contentFields.body = body;
  // undefined check, not just typeof number — a real delay_days:0 ("Same
  // day") must still be recognized so the recompute-on-change check below
  // fires correctly for it too.
  const delayChanged = typeof delay_days === 'number' && delay_days !== step.delay_days;
  if (typeof delay_days === 'number') contentFields.delay_days = delay_days;
  if (include_unsub !== undefined) contentFields.include_unsub = !!include_unsub;
  if (thread_mode === 'reply' || thread_mode === 'new_thread') contentFields.thread_mode = thread_mode;

  if (Object.keys(contentFields).length) {
    const { error } = await supabaseAdmin.from('email_steps').update(contentFields).eq('id', stepId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Only leads WAITING on exactly this step (not yet sent it) get rescheduled
  // — already-sent emails are never touched, since this only ever writes
  // campaign_leads.next_send_at, never sent_emails or last_sent_at.
  if (delayChanged) {
    await recomputeNextSendForDelayChange(campaignId, stepId, delay_days);
  }

  if (typeof newPosition === 'number') {
    const { data: steps } = await supabaseAdmin
      .from('email_steps').select('id, step_number').eq('campaign_id', campaignId).order('step_number', { ascending: true });
    const withoutThis = (steps ?? []).filter(s => s.id !== stepId);
    const clamped = Math.max(0, Math.min(newPosition, withoutThis.length));
    const reordered = [...withoutThis];
    reordered.splice(clamped, 0, { id: stepId, step_number: -1 });
    // Parallelized (bounded concurrency) — no unique constraint on
    // (campaign_id, step_number), so writing every step's new position at
    // once is safe, and this is exactly the loop a drag-and-drop reorder
    // was waiting on sequentially before (felt "stuck" on anything past a
    // couple of steps).
    await mapWithConcurrency(reordered.map((r, i) => ({ r, i })), 10, async ({ r, i }) => {
      await supabaseAdmin.from('email_steps').update({ step_number: i }).eq('id', r.id);
    });
    await resyncStepsAfterAddOrReorder(campaignId);
  }

  await supabaseAdmin.from('campaigns').update({ updated_at: new Date().toISOString() }).eq('id', campaignId);

  const { data: updated } = await supabaseAdmin.from('email_steps').select('*').eq('id', stepId).single();
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; stepId: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: campaignId, stepId } = await params;
  const guard = await requireEditableCampaign(campaignId, user.id);
  if (guard.error) return guard.error;

  const { count: stepCount } = await supabaseAdmin
    .from('email_steps').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId);
  if ((stepCount ?? 0) <= 1) {
    return NextResponse.json({ error: 'A campaign needs at least one step — add a replacement before removing the last one.' }, { status: 400 });
  }

  const { error } = await deleteStepAndResync(campaignId, stepId);
  if (error) return NextResponse.json({ error }, { status: 500 });

  await supabaseAdmin.from('campaigns').update({ updated_at: new Date().toISOString() }).eq('id', campaignId);
  return NextResponse.json({ success: true });
}

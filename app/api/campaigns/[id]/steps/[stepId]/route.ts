import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { deleteStepAndResync, recomputeNextSendForDelayChange, mapWithConcurrency } from '@/lib/campaign-scheduling';

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

  let respondWithStepNumber: number | null = null;

  if (typeof newPosition === 'number') {
    // Delays (and step_number itself) belong to the POSITION in the
    // sequence, not to whichever email currently occupies it — reordering
    // must only change WHICH email sends at each stage, never the
    // campaign's overall day-by-day timing. So this does NOT move step
    // rows to new step_numbers (that would drag each row's own delay_days
    // along with it, exactly what must not happen). Instead it keeps every
    // row pinned to its current step_number/delay_days and reshuffles only
    // the CONTENT fields between them — a side benefit is that no waiting
    // lead's current_step_id (a stable row reference) is ever invalidated
    // by a pure reorder, so no redirect/resync pass is needed here at all,
    // unlike insert/delete which genuinely do change what exists at a
    // position.
    const { data: steps } = await supabaseAdmin
      .from('email_steps')
      .select('id, step_number, subject, body, thread_mode, include_unsub, template_id, ab_variants')
      .eq('campaign_id', campaignId)
      .order('step_number', { ascending: true });

    const ordered = steps ?? [];
    const oldIndex = ordered.findIndex(s => s.id === stepId);
    if (oldIndex === -1) return NextResponse.json({ error: 'Step not found' }, { status: 404 });
    const clamped = Math.max(0, Math.min(newPosition, ordered.length - 1));

    type ContentFields = { subject: string; body: string; thread_mode: string; include_unsub: boolean; template_id: string | null; ab_variants: unknown };
    const contents: ContentFields[] = ordered.map(s => ({
      subject: s.subject, body: s.body, thread_mode: s.thread_mode,
      include_unsub: s.include_unsub, template_id: s.template_id, ab_variants: s.ab_variants,
    }));
    const [moved] = contents.splice(oldIndex, 1);
    contents.splice(clamped, 0, moved);
    // Position 0 is always the first email — there's nothing before it to
    // reply to, so it can never end up thread_mode:'reply' regardless of
    // which content moved there.
    if (contents[0]) contents[0] = { ...contents[0], thread_mode: 'new_thread' };

    // Parallelized (bounded concurrency) — every row's own step_number never
    // changes here, only its content, so there's no ordering constraint to
    // respect (unlike the insert route's position-shift loop).
    await mapWithConcurrency(ordered.map((s, i) => ({ s, content: contents[i] })), 10, async ({ s, content }) => {
      await supabaseAdmin.from('email_steps').update(content).eq('id', s.id);
    });
    respondWithStepNumber = clamped;
  }

  await supabaseAdmin.from('campaigns').update({ updated_at: new Date().toISOString() }).eq('id', campaignId);

  const { data: updated } = respondWithStepNumber !== null
    ? await supabaseAdmin.from('email_steps').select('*').eq('campaign_id', campaignId).eq('step_number', respondWithStepNumber).single()
    : await supabaseAdmin.from('email_steps').select('*').eq('id', stepId).single();
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

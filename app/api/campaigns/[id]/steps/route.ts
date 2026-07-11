import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { resyncStepsAfterAddOrReorder, redirectWaitingLeadsToNewStep } from '@/lib/campaign-scheduling';

// Steps can only be added on a campaign that isn't actively sending -
// draft (never launched) or paused (user paused it specifically to make
// this kind of change) are safe; active/completed are not, since a lead
// could be mid-sequence right now.
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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: campaignId } = await params;
  const guard = await requireEditableCampaign(campaignId, user.id);
  if (guard.error) return guard.error;

  const { subject, body, delay_days, include_unsub, thread_mode, insertAt } = await req.json();
  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 });
  }
  // Defaults to 'reply' — a step added after the fact via this editor is
  // almost always meant as a follow-up in the same thread, matching the
  // creation wizard's own default for its "+ Add Follow-up Step" button.
  const resolvedThreadMode = thread_mode === 'new_thread' ? 'new_thread' : 'reply';

  const { data: existingSteps } = await supabaseAdmin
    .from('email_steps').select('id, step_number').eq('campaign_id', campaignId).order('step_number', { ascending: true });
  const count = existingSteps?.length ?? 0;
  const position = typeof insertAt === 'number' ? Math.max(0, Math.min(insertAt, count)) : count;

  // Make room at `position` by shifting everything at/after it up by one -
  // high-to-low order avoids any transient duplicate step_number, so this
  // one loop stays sequential deliberately (it's only ever a handful of
  // rows — a campaign's step count, not its lead count — the real perceived
  // slowness on step edits is the per-LEAD resync work below, already
  // parallelized).
  const toShift = (existingSteps ?? []).filter(s => s.step_number >= position).sort((a, b) => b.step_number - a.step_number);
  for (const s of toShift) {
    await supabaseAdmin.from('email_steps').update({ step_number: s.step_number + 1 }).eq('id', s.id);
  }

  const { data: newStep, error } = await supabaseAdmin
    .from('email_steps')
    .insert({
      campaign_id: campaignId,
      step_number: position,
      subject: subject.trim(),
      body,
      delay_days: typeof delay_days === 'number' ? delay_days : 1,
      include_unsub: !!include_unsub,
      thread_mode: resolvedThreadMode,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // MUST run before resyncStepsAfterAddOrReorder: that call's
  // refreshLeadStepNumbers step advances a waiting lead's current_step to
  // match its (identity-preserved) target step's NEW position — if it ran
  // first, a lead who was at `position` would already show a bumped-up
  // current_step by the time this query runs, and would never match here.
  // Leads that were waiting EXACTLY at this position get the newly-inserted
  // step next (instead of silently skipping straight to whatever used to be
  // here, now shifted one further along) — leads before/after this point are
  // untouched here and get correctly handled by the identity-preserving
  // resync that follows.
  await redirectWaitingLeadsToNewStep(campaignId, position, newStep.id);
  await resyncStepsAfterAddOrReorder(campaignId);
  await supabaseAdmin.from('campaigns').update({ updated_at: new Date().toISOString() }).eq('id', campaignId);

  return NextResponse.json(newStep);
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { TEST_STEP_DELAY_UNIT_MS } from '@/lib/campaign-scheduling';

// Test-only action: makes every currently-mid-sequence lead on THIS campaign
// immediately eligible for its next follow-up, instead of waiting out the
// remaining delay — lets a multi-step sequence be clicked through step by
// step ("day 2", "day 3", ...) without waiting real time between clicks.
//
// Deliberately scoped as tightly as possible so it can never touch anything
// but the one campaign the button was clicked on:
//   - Gated on THIS campaign's own step_delay_unit_ms being the test unit
//     (see lib/campaign-scheduling.ts) — a real production campaign (real
//     24h unit) always gets a 403 here, full stop, no override.
//   - Only ever updates campaign_leads rows where campaign_id = this
//     campaign's id — never touches another campaign's leads or another
//     account's mailboxes/pacing/capacity.
//   - Does not bypass the real scheduler at all: it only sets next_send_at
//     to "now", the same field the real system already uses to decide
//     what's due. The next 2-minute scheduler cycle picks it up through the
//     exact same pacing/daily-cap/health/mailbox-assignment logic every
//     other send goes through — nothing about HOW a lead gets sent changes.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: campaignId } = await params;

  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('id, name, status, step_delay_unit_ms')
    .eq('id', campaignId)
    .eq('user_id', user.id)
    .single();

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

  if (campaign.step_delay_unit_ms !== TEST_STEP_DELAY_UNIT_MS) {
    return NextResponse.json({
      error: 'This is a test-only action, only available on campaigns created while fast-follow-up testing was enabled. Real campaigns always wait their real configured delay.',
    }, { status: 403 });
  }

  if (campaign.status !== 'active') {
    return NextResponse.json({ error: 'Campaign must be active for its scheduler to pick up the advanced leads — resume it first.' }, { status: 400 });
  }

  const { data: leads, error } = await supabaseAdmin
    .from('campaign_leads')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('status', 'active');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!leads?.length) return NextResponse.json({ advanced: 0, message: 'No leads currently waiting on a follow-up — nothing to advance.' });

  const nowIso = new Date().toISOString();
  const { error: updateErr } = await supabaseAdmin
    .from('campaign_leads')
    .update({ next_send_at: nowIso })
    .eq('campaign_id', campaignId)
    .eq('status', 'active');

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({
    advanced: leads.length,
    message: `${leads.length} lead${leads.length !== 1 ? 's' : ''} made immediately due — the scheduler will pick ${leads.length !== 1 ? 'them' : 'it'} up on its next cycle (within ~2 min), same pacing and daily-limit rules as a real send.`,
  });
}

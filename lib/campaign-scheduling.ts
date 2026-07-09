// Shared scheduling helpers for the campaign Smart Priority Engine.
// Used by both the campaign start route (account/window validation) and the
// recurring campaign-scheduler worker (instrumentation.ts).

import { supabaseAdmin } from '@/lib/supabase/admin';

// Call whenever a lead reaches a terminal state (step sequence completed,
// bounced, unsubscribed, or replied) from ANY code path — the email-sending
// worker, the inbox-sync reply detector, or an API route like unsubscribe.
// A campaign should auto-complete the moment its LAST lead finishes, no
// matter which of those reasons caused it. This used to be duplicated
// inline in a couple of places in the worker and missing entirely from
// others (notably the reply-detection paths and the unsubscribe route) —
// a campaign whose final lead finished via a reply or an unsubscribe click,
// rather than a normal step completion, would sit at "active" forever with
// nothing left to send.
export async function checkCampaignAutoComplete(campaignId: string): Promise<void> {
  const { count: pendingCount } = await supabaseAdmin
    .from('campaign_leads')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .in('status', ['pending', 'active']);
  if (pendingCount !== 0) return;

  const { data: camp } = await supabaseAdmin
    .from('campaigns')
    .select('user_id, name, status')
    .eq('id', campaignId)
    .maybeSingle();
  if (!camp || camp.status === 'completed') return;

  await supabaseAdmin.from('campaigns').update({ status: 'completed' }).eq('id', campaignId);

  const { data: prof } = await supabaseAdmin
    .from('profiles').select('notif_campaign_complete').eq('id', camp.user_id).maybeSingle();
  if ((prof as Record<string, unknown> | null)?.notif_campaign_complete === false) return;

  await supabaseAdmin.from('notifications').insert({
    user_id: camp.user_id,
    message: `Campaign "${camp.name}" has completed sending.`,
    type: 'info',
    link: `/dashboard/campaigns/${campaignId}`,
  });
}

export const TZ_MAP: Record<string, string> = {
  'UTC': 'UTC',
  'US/Eastern (EST)': 'America/New_York',
  'US/Pacific (PST)': 'America/Los_Angeles',
  'Europe/London (GMT)': 'Europe/London',
  'Asia/Karachi (PKT)': 'Asia/Karachi',
  'Asia/Dubai (GST)': 'Asia/Dubai',
};

// Returns total minutes from midnight.
// Accepts "08:30" (24h), "8:30 AM" / "6:00 PM" (legacy), or plain number.
export function parseTimeToMinutes(timeStr: string | number | null | undefined): number {
  if (!timeStr) return 9 * 60;
  const s = String(timeStr);

  const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) return parseInt(m24[1]) * 60 + parseInt(m24[2]);

  const m12 = s.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (m12) {
    let h = parseInt(m12[1]);
    const mins = parseInt(m12[2]);
    const ampm = m12[3].toUpperCase();
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + mins;
  }

  if (/^\d+$/.test(s)) return parseInt(s) * 60;
  return 9 * 60;
}

function getLocalMinutes(ms: number, zone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, hour: 'numeric', minute: 'numeric', hour12: false,
  }).formatToParts(new Date(ms));
  const h = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0') % 24;
  const m = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0');
  return h * 60 + m;
}

// 0=Monday … 6=Sunday (matches active_days array from the UI)
export function getActiveDayIndex(ms: number, zone: string): number {
  const dayName = new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'long' }).format(new Date(ms));
  const map: Record<string, number> = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };
  return map[dayName] ?? 0;
}

// Advance ms forward until it lands on an active day
export function nextActiveDay(ms: number, activeDays: boolean[], zone: string): number {
  let t = ms;
  for (let i = 0; i < 7; i++) {
    if (activeDays[getActiveDayIndex(t, zone)]) return t;
    t += 24 * 60 * 60 * 1000;
  }
  return ms; // fallback: all days disabled, return as-is
}

export type CampaignWindow = {
  from_hour?: string | number | null;
  to_hour?: string | number | null;
  timezone?: string | null;
  active_days?: unknown;
};

// Is `nowMs` inside this campaign's configured sending window, on one of its
// active days, in its own timezone? The scheduler skips a campaign entirely
// this cycle if this is false — nothing gets sent outside the owner's chosen hours.
export function isWithinSendingWindow(campaign: CampaignWindow, nowMs = Date.now()): boolean {
  const ianaZone = TZ_MAP[campaign.timezone || 'UTC'] || 'UTC';
  const activeDays: boolean[] = Array.isArray(campaign.active_days)
    ? campaign.active_days as boolean[]
    : [true, true, true, true, true, false, false];
  if (!activeDays[getActiveDayIndex(nowMs, ianaZone)]) return false;

  const fromMins = parseTimeToMinutes(campaign.from_hour ?? '08:00');
  const toMins = parseTimeToMinutes(campaign.to_hour ?? '18:00');
  const windowMins = Math.max(5, toMins - fromMins);
  const localMins = getLocalMinutes(nowMs, ianaZone);
  return localMins >= fromMins && localMins < fromMins + windowMins;
}

export type PriorityMode = 'auto' | 'manual';

// Auto mode: heavier follow-up backlog relative to today's capacity means a
// lower new-lead share. Manual mode: use the campaign's own stored weight.
// Thresholds are intentionally simple and named here so they're easy to find
// and retune later — not meant to be the final word on the formula.
export function computeFollowupWeightPct(opts: {
  mode: PriorityMode;
  manualWeightPct?: number | null;
  dueFollowupCount: number;
  remainingCapacity: number;
}): number {
  const { mode, manualWeightPct, dueFollowupCount, remainingCapacity } = opts;
  if (mode === 'manual') {
    const v = manualWeightPct ?? 90;
    return Math.max(0, Math.min(100, v));
  }
  if (remainingCapacity <= 0) return 90;
  const loadRatio = dueFollowupCount / remainingCapacity;
  if (loadRatio >= 0.9) return 90; // heavy follow-up load -> new leads get ~10%
  if (loadRatio >= 0.5) return 65; // medium load -> new leads get ~35%
  return 40;                        // light load -> new leads get ~60%
}

// Splits today's remaining capacity between due follow-ups and new leads.
// Follow-ups get first claim, up to their weighted share of capacity (or
// however many are actually due, if that's fewer) — anything left over flows
// to new leads, so capacity is never wasted at either end of the weight range.
// This is also what makes "Strict" (weight=100) behave correctly without a
// separate code path: if follow-ups don't use the whole 100%, the remainder
// still reaches new leads instead of being thrown away.
export function allocateCapacity<F, N>(opts: {
  followupsDue: F[];
  newLeads: N[];
  remainingCapacity: number;
  followupWeightPct: number;
}): { followupsToSend: F[]; newToSend: N[] } {
  const { followupsDue, newLeads, remainingCapacity, followupWeightPct } = opts;
  if (remainingCapacity <= 0) return { followupsToSend: [], newToSend: [] };

  const followupBudget = Math.floor(remainingCapacity * followupWeightPct / 100);
  const followupsToSend = followupsDue.slice(0, Math.min(followupsDue.length, followupBudget));
  const leftover = Math.max(0, remainingCapacity - followupsToSend.length);
  const newToSend = newLeads.slice(0, Math.min(newLeads.length, leftover));
  return { followupsToSend, newToSend };
}

// 1 unit = 1 real day. Shared by the start route (backfilling next_send_at
// on resume) and the campaign-scheduler worker (computing the next
// follow-up's due time). Set to 60*1000 (1 minute) during testing to
// accelerate multi-day sequences — see git history if that's needed again.
export const DELAY_UNIT_MS = 24 * 60 * 60 * 1000;

// Jitter so a lead's follow-up lands at roughly the same time each day, but
// not the EXACT same minute — shifted by ~60-90 minutes either direction, to
// look like a person hit send around the same time, not a script hitting it
// at literally the same second every day. Expressed relative to DELAY_UNIT_MS
// (one "day") rather than the full multi-day delay, so a 5-day follow-up
// doesn't get 5x the variance of a 1-day one — the daily send-time wobble is
// the same regardless of how many days apart two steps are.
export function jitterMs(): number {
  const sign = Math.random() < 0.5 ? -1 : 1;
  const REAL_DAY_MS = 24 * 60 * 60 * 1000;
  const dayScale = DELAY_UNIT_MS / REAL_DAY_MS; // 1 at real scale, tiny during accelerated testing
  const minutes = 60 + Math.random() * 30; // 60-90 real minutes
  return sign * minutes * 60 * 1000 * dayScale;
}

// ── Step editing on paused/draft campaigns ─────────────────────────────────
// A lead's true position in the sequence is tracked by campaign_leads.
// current_step_id (a stable email_steps.id), not the plain step_number
// integer - step_number is just a display/ordering value that can shift
// whenever steps are added/removed/reordered. These helpers keep the two in
// sync so editing a paused campaign's steps can never leave an in-progress
// lead pointing at a step_number that no longer means what it used to.

// Self-heal: any eligible lead that never got current_step_id set (e.g.
// enrolled before this column existed, or before its first send) gets it
// backfilled by matching its current_step number against the CURRENT step
// list - must run before any add/remove/reorder shifts step_numbers around,
// or the match would be against numbers that no longer reflect their steps.
async function ensureLeadStepIds(campaignId: string): Promise<void> {
  const { data: steps } = await supabaseAdmin
    .from('email_steps').select('id, step_number').eq('campaign_id', campaignId);
  const byNumber = new Map((steps ?? []).map(s => [s.step_number, s.id]));

  const { data: leads } = await supabaseAdmin
    .from('campaign_leads')
    .select('id, current_step')
    .eq('campaign_id', campaignId)
    .in('status', ['pending', 'active'])
    .is('current_step_id', null);

  for (const lead of leads ?? []) {
    const stepId = byNumber.get(lead.current_step ?? 0);
    if (stepId) await supabaseAdmin.from('campaign_leads').update({ current_step_id: stepId }).eq('id', lead.id);
  }
}

// Reassign step_number sequentially (0..n-1) by each step's current relative
// order - call after any insert/delete/reorder so display order stays
// gap-free and predictable. Never changes a step's id, so it never breaks
// which step a lead is actually pointing at.
async function renumberSteps(campaignId: string): Promise<void> {
  const { data: steps } = await supabaseAdmin
    .from('email_steps').select('id, step_number').eq('campaign_id', campaignId)
    .order('step_number', { ascending: true });
  for (let i = 0; i < (steps ?? []).length; i++) {
    if (steps![i].step_number !== i) {
      await supabaseAdmin.from('email_steps').update({ step_number: i }).eq('id', steps![i].id);
    }
  }
}

// After steps have been renumbered, refresh every eligible lead's
// current_step (integer) to match whatever step_number its current_step_id
// now carries - this is what keeps the existing send-worker code (which
// still matches on step_number) correct after an edit, without changing
// that worker code at all.
async function refreshLeadStepNumbers(campaignId: string): Promise<void> {
  const { data: steps } = await supabaseAdmin
    .from('email_steps').select('id, step_number').eq('campaign_id', campaignId);
  const byId = new Map((steps ?? []).map(s => [s.id, s.step_number]));

  const { data: leads } = await supabaseAdmin
    .from('campaign_leads')
    .select('id, current_step, current_step_id')
    .eq('campaign_id', campaignId)
    .in('status', ['pending', 'active']);

  for (const lead of leads ?? []) {
    if (!lead.current_step_id) continue;
    const newNumber = byId.get(lead.current_step_id);
    if (newNumber !== undefined && newNumber !== lead.current_step) {
      await supabaseAdmin.from('campaign_leads').update({ current_step: newNumber }).eq('id', lead.id);
    }
  }
}

// Call after adding a new step or reordering existing ones (nothing was
// deleted, so no lead ever needs to move to a different step - just keep
// the display numbers and each lead's current_step integer consistent).
export async function resyncStepsAfterAddOrReorder(campaignId: string): Promise<void> {
  await ensureLeadStepIds(campaignId);
  await renumberSteps(campaignId);
  await refreshLeadStepNumbers(campaignId);
}

// Call to safely delete a step: figures out which leads were about to
// receive exactly this step, moves them to whichever step now comes next
// (skip-to-next-remaining policy), marks a lead 'completed' if the deleted
// step was its last one, then renumbers and resyncs everyone else.
export async function deleteStepAndResync(campaignId: string, stepId: string): Promise<{ error?: string }> {
  await ensureLeadStepIds(campaignId);

  const { data: stepToDelete } = await supabaseAdmin
    .from('email_steps').select('id, step_number').eq('id', stepId).eq('campaign_id', campaignId).maybeSingle();
  if (!stepToDelete) return { error: 'Step not found' };

  const { data: remainingSteps } = await supabaseAdmin
    .from('email_steps').select('id, step_number, delay_days')
    .eq('campaign_id', campaignId).neq('id', stepId)
    .order('step_number', { ascending: true });
  const nextRemaining = (remainingSteps ?? []).find(s => s.step_number > stepToDelete.step_number) ?? null;

  // Re-point every lead referencing this step BEFORE deleting it -
  // current_step_id is a foreign key into email_steps, so the delete below
  // is rejected by Postgres for as long as any row still points at it.
  const { data: affectedLeads } = await supabaseAdmin
    .from('campaign_leads').select('id, last_sent_at')
    .eq('campaign_id', campaignId).eq('current_step_id', stepId);

  let anyCompleted = false;
  for (const lead of affectedLeads ?? []) {
    if (nextRemaining) {
      const lastSentMs = lead.last_sent_at ? new Date(lead.last_sent_at).getTime() : Date.now();
      const nextSendAt = new Date(lastSentMs + (nextRemaining.delay_days || 1) * DELAY_UNIT_MS + jitterMs()).toISOString();
      await supabaseAdmin.from('campaign_leads').update({
        current_step_id: nextRemaining.id, status: 'active', next_send_at: nextSendAt,
      }).eq('id', lead.id);
    } else {
      await supabaseAdmin.from('campaign_leads').update({
        current_step_id: null, status: 'completed', next_send_at: null,
      }).eq('id', lead.id);
      anyCompleted = true;
    }
  }

  const { error: deleteErr } = await supabaseAdmin.from('email_steps').delete().eq('id', stepId);
  if (deleteErr) return { error: deleteErr.message };

  await renumberSteps(campaignId);
  await refreshLeadStepNumbers(campaignId);
  if (anyCompleted) await checkCampaignAutoComplete(campaignId);
  return {};
}

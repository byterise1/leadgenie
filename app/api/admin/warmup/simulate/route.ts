import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { computeHealthScore, shouldPause, type EventCounts } from '@/lib/warmup-health';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single();
  return profile?.is_admin ? user : null;
}

const SIMULATABLE_TYPES = ['bounce', 'spam_placement', 'auth_error'] as const;
type SimType = (typeof SIMULATABLE_TYPES)[number];

async function fetchEventCounts(accountId: string, sinceMs: number): Promise<EventCounts> {
  const { data } = await supabaseAdmin
    .from('email_account_events')
    .select('event_type')
    .eq('account_id', accountId)
    .gte('created_at', new Date(sinceMs).toISOString());
  const counts: EventCounts = { sent7d: 0, spam7d: 0, bounce7d: 0, reply7d: 0, open7d: 0, authError7d: 0 };
  for (const row of data || []) {
    if (row.event_type === 'sent') counts.sent7d++;
    else if (row.event_type === 'spam_placement') counts.spam7d++;
    else if (row.event_type === 'bounce') counts.bounce7d++;
    else if (row.event_type === 'reply') counts.reply7d++;
    else if (row.event_type === 'open') counts.open7d++;
    else if (row.event_type === 'auth_error') counts.authError7d++;
  }
  return counts;
}

async function recomputeAndPersist(accountId: string, justSimulatedType?: SimType) {
  const { data: account } = await supabaseAdmin.from('email_accounts').select('*').eq('id', accountId).single();
  if (!account) return null;

  const events7d = await fetchEventCounts(accountId, Date.now() - 7 * 86400_000);
  const hasAuthErrorNow = justSimulatedType === 'auth_error';

  const health = computeHealthScore({
    events: events7d,
    domainAuth: { spf: account.spf_status || 'unknown', dkim: account.dkim_status || 'unknown', dmarc: account.dmarc_status || 'unknown' },
    consecutiveStableDays: account.consecutive_stable_days ?? 0,
    warmupDay: account.warmup_day ?? 0,
    hasAuthErrorNow,
  });
  const pauseCheck = shouldPause(events7d, hasAuthErrorNow);

  const updates: Record<string, unknown> = {
    health_score: health.score,
    warmup_paused: pauseCheck.pause,
    warmup_pause_reason: pauseCheck.pause ? pauseCheck.reason : null,
    warmup_paused_at: pauseCheck.pause ? (account.warmup_paused ? account.warmup_paused_at : new Date().toISOString()) : null,
    last_health_calc_at: new Date().toISOString(),
  };
  await supabaseAdmin.from('email_accounts').update(updates).eq('id', accountId);

  return {
    ...account, ...updates,
    inbox_rate: health.factors.inboxRate,
    spam_rate: health.factors.spamRate,
    bounce_rate: health.factors.bounceRate,
  };
}

// Inject synthetic events (tagged meta.simulated=true) and recompute health/pause immediately —
// lets an admin verify the pause/recovery logic without waiting for a real bounce/spam/auth issue.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { account_id, event_type, count } = body;

  if (!account_id) return NextResponse.json({ error: 'account_id required' }, { status: 400 });
  if (!SIMULATABLE_TYPES.includes(event_type)) {
    return NextResponse.json({ error: `event_type must be one of: ${SIMULATABLE_TYPES.join(', ')}` }, { status: 400 });
  }

  const { data: account } = await supabaseAdmin.from('email_accounts').select('id').eq('id', account_id).maybeSingle();
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  const n = Math.max(1, Math.min(50, Number(count) || 1));
  const rows = Array.from({ length: n }, () => ({
    account_id, event_type, meta: { simulated: true, by: admin.id, at: new Date().toISOString() },
  }));
  const { error: insertErr } = await supabaseAdmin.from('email_account_events').insert(rows);
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  const updated = await recomputeAndPersist(account_id, event_type as SimType);
  return NextResponse.json({ ok: true, simulated: { event_type, count: n }, account: updated });
}

// Clear all simulated events for an account and recompute back to the real baseline.
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { account_id } = await req.json();
  if (!account_id) return NextResponse.json({ error: 'account_id required' }, { status: 400 });

  const { error: delErr } = await supabaseAdmin
    .from('email_account_events')
    .delete()
    .eq('account_id', account_id)
    .eq('meta->>simulated', 'true');
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  const updated = await recomputeAndPersist(account_id);
  return NextResponse.json({ ok: true, reset: true, account: updated });
}

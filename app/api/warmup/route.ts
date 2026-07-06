import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/rate-limit';
import { detectProvider, campaignDailyCap } from '@/lib/warmup-health';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let accounts: Record<string, any>[] | null;
  let accountsErr: { message: string } | null;
  {
    const res = await supabaseAdmin
      .from('email_accounts')
      .select('id, email, type, smtp_host, status, health_score, warmup_enabled, warmup_day, warmup_target, sent_today, warmup_paused, warmup_pause_reason, spf_status, dkim_status, dmarc_status, consecutive_stable_days, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    accounts = res.data;
    accountsErr = res.error;
  }

  // Phase 1 migration not run yet — fall back to the pre-migration column set
  // instead of breaking the whole warmup page.
  if (accountsErr) {
    const fallback = await supabaseAdmin
      .from('email_accounts')
      .select('id, email, type, status, health_score, warmup_enabled, warmup_day, warmup_target, sent_today, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    accounts = fallback.data;
    accountsErr = fallback.error;
  }

  if (accountsErr) {
    console.error('[warmup GET] accounts query failed:', accountsErr.message);
    return NextResponse.json({ error: accountsErr.message }, { status: 500 });
  }

  const warmupStats = await Promise.all(
    (accounts ?? []).filter(a => a.warmup_enabled).map(async a => {
      const { count } = await supabaseAdmin
        .from('warmup_emails')
        .select('id', { count: 'exact', head: true })
        .eq('from_account_id', a.id);
      return { accountId: a.id, totalSent: count ?? 0 };
    })
  );

  const statsMap = new Map(warmupStats.map(s => [s.accountId, s.totalSent]));

  // Latest saved rate breakdown per account (from warmup_history, written by the worker)
  const emails = (accounts ?? []).map(a => a.email);
  const latestByEmail = new Map<string, { inbox_rate: number | null; spam_rate: number | null; bounce_rate: number | null }>();
  if (emails.length) {
    const { data: latestHistory } = await supabaseAdmin
      .from('warmup_history')
      .select('email, inbox_rate, spam_rate, bounce_rate, date')
      .in('email', emails)
      .order('date', { ascending: false });
    for (const row of latestHistory ?? []) {
      if (!latestByEmail.has(row.email)) latestByEmail.set(row.email, row);
    }
  }

  // Last time each account sent OR received a warmup ping — lets the dashboard tell
  // "actively sending" apart from "enabled but silently stuck" (a real incident that
  // was otherwise invisible without reading server logs).
  const accountIds = (accounts ?? []).map(a => a.id);
  const lastActivityMap = new Map<string, string>();
  if (accountIds.length) {
    const idList = accountIds.join(',');
    const { data: recentActivity } = await supabaseAdmin
      .from('warmup_emails')
      .select('from_account_id, to_account_id, sent_at')
      .or(`from_account_id.in.(${idList}),to_account_id.in.(${idList})`)
      .order('sent_at', { ascending: false })
      .limit(500);
    for (const row of recentActivity ?? []) {
      if (accountIds.includes(row.from_account_id) && !lastActivityMap.has(row.from_account_id)) lastActivityMap.set(row.from_account_id, row.sent_at);
      if (accountIds.includes(row.to_account_id) && !lastActivityMap.has(row.to_account_id)) lastActivityMap.set(row.to_account_id, row.sent_at);
    }
  }

  const enriched = (accounts ?? []).map(a => {
    const rates = latestByEmail.get(a.email);
    const recommendedSendLimit = campaignDailyCap({
      provider: detectProvider(a as any), warmupDay: a.warmup_day ?? 0, health: a.health_score ?? 50, warmupComplete: !a.warmup_enabled,
    });
    const daysToWarmed = a.warmup_enabled ? Math.max(0, Math.min(14, a.warmup_target ?? 14) - (a.warmup_day ?? 0)) : 0;

    const lastActivityAt = lastActivityMap.get(a.id) ?? null;
    const accountAgeHours = a.created_at ? (Date.now() - new Date(a.created_at).getTime()) / 3_600_000 : 999;
    const hoursSinceActivity = lastActivityAt ? (Date.now() - new Date(lastActivityAt).getTime()) / 3_600_000 : null;
    // Fresh: just connected, hasn't had time for its first 6h cycle yet — not a problem.
    const isFresh = accountAgeHours < 6 && !lastActivityAt;
    // Stale: enabled, not paused, not erroring, old enough to have sent by now, but
    // nothing has gone in or out in over 20h (worker runs every 6h — 3+ missed cycles).
    const isStale = !!a.warmup_enabled && !a.warmup_paused && a.status !== 'error'
      && accountAgeHours >= 6
      && (hoursSinceActivity === null || hoursSinceActivity > 20);

    return {
      ...a,
      warmup_emails_sent: statsMap.get(a.id) ?? 0,
      inbox_rate: rates?.inbox_rate ?? null,
      spam_rate: rates?.spam_rate ?? null,
      bounce_rate: rates?.bounce_rate ?? null,
      recommended_send_limit: recommendedSendLimit,
      days_to_warmed: daysToWarmed,
      last_activity_at: lastActivityAt,
      is_fresh: isFresh,
      is_stale: isStale,
    };
  });

  return NextResponse.json(enriched);
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rate = await checkRateLimit(user.id, 'warmup_toggle');
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many warmup changes in a short time — please wait a bit and try again.' }, { status: 429 });
  }

  const body = await req.json();
  const { account_id, enabled, warmup_target } = body;

  if (!account_id) return NextResponse.json({ error: 'account_id required' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (typeof enabled === 'boolean') {
    updates.warmup_enabled = enabled;
    updates.status = enabled ? 'warming' : 'active';
    // Never reset warmup_day on re-enable — mid-course resumes from same day,
    // post-completion (day >= 14) continues at 40/day indefinitely

  }
  if (typeof warmup_target === 'number') {
    updates.warmup_target = warmup_target;
  }

  const { data, error } = await supabaseAdmin
    .from('email_accounts')
    .update(updates)
    .eq('id', account_id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

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
      .select('id, email, type, smtp_host, status, health_score, warmup_enabled, warmup_day, warmup_target, sent_today, warmup_paused, warmup_pause_reason, spf_status, dkim_status, dmarc_status, consecutive_stable_days')
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
      .select('id, email, type, status, health_score, warmup_enabled, warmup_day, warmup_target, sent_today')
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

  const enriched = (accounts ?? []).map(a => {
    const rates = latestByEmail.get(a.email);
    const recommendedSendLimit = campaignDailyCap({
      provider: detectProvider(a as any), warmupDay: a.warmup_day ?? 0, health: a.health_score ?? 50, warmupComplete: !a.warmup_enabled,
    });
    const daysToWarmed = a.warmup_enabled ? Math.max(0, Math.min(14, a.warmup_target ?? 14) - (a.warmup_day ?? 0)) : 0;
    return {
      ...a,
      warmup_emails_sent: statsMap.get(a.id) ?? 0,
      inbox_rate: rates?.inbox_rate ?? null,
      spam_rate: rates?.spam_rate ?? null,
      bounce_rate: rates?.bounce_rate ?? null,
      recommended_send_limit: recommendedSendLimit,
      days_to_warmed: daysToWarmed,
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

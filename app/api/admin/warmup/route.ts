import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/rate-limit';
import { detectProvider, campaignDailyCap } from '@/lib/warmup-health';
import { predictDeliverability, diagnose, computeDomainRollup } from '@/lib/warmup-diagnosis';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single();
  return profile?.is_admin ? user : null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let accounts: Record<string, any>[] | null;
  let error: { message: string } | null;
  {
    const res = await supabaseAdmin
      .from('email_accounts')
      .select('id, user_id, email, type, smtp_host, status, health_score, warmup_enabled, already_warmed_up, warmup_day, warmup_target, sent_today, warmup_pool_mode, warmup_paused, warmup_pause_reason, spf_status, dkim_status, dmarc_status, mx_status, created_at, domain, join_shared_network, blacklist_status, blacklist_details, blacklist_checked_at, consecutive_stable_days')
      .neq('is_pool_account', true)
      .order('warmup_enabled', { ascending: false })
      .order('created_at', { ascending: false });
    accounts = res.data;
    error = res.error;
  }

  // Phase 1 migration not run yet — fall back to the pre-migration column set.
  if (error) {
    const fallback = await supabaseAdmin
      .from('email_accounts')
      .select('id, user_id, email, type, status, health_score, warmup_enabled, warmup_day, warmup_target, sent_today, warmup_pool_mode, created_at')
      .neq('is_pool_account', true)
      .order('warmup_enabled', { ascending: false })
      .order('created_at', { ascending: false });
    accounts = fallback.data;
    error = fallback.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = [...new Set((accounts ?? []).map(a => a.user_id))];

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds);

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p.full_name]));

  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map((authUsers?.users ?? []).map(u => [u.id, u.email]));

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

  const enriched: Record<string, any>[] = (accounts ?? []).map(a => {
    const rates = latestByEmail.get(a.email);
    const recommendedSendLimit = campaignDailyCap({
      provider: detectProvider(a as any), warmupDay: a.warmup_day ?? 0, health: a.health_score ?? 50,
      warmupEnabled: !!a.warmup_enabled, alreadyWarmedUp: !!a.already_warmed_up,
    });
    const domainAuth = {
      spf: a.spf_status || 'unknown', dkim: a.dkim_status || 'unknown',
      dmarc: a.dmarc_status || 'unknown', mx: a.mx_status || 'unknown',
    };
    const blacklistStatus = a.blacklist_status || 'unknown';
    return {
      ...a,
      user_name: profileMap.get(a.user_id) || emailMap.get(a.user_id) || 'Unknown',
      user_email: emailMap.get(a.user_id) || '',
      inbox_rate: rates?.inbox_rate ?? null,
      spam_rate: rates?.spam_rate ?? null,
      bounce_rate: rates?.bounce_rate ?? null,
      recommended_send_limit: recommendedSendLimit,
      deliverability_label: predictDeliverability({ score: a.health_score ?? 50, blacklistStatus, domainAuth }),
      diagnosis: diagnose({
        score: a.health_score ?? 50,
        factors: {
          inboxRate: rates?.inbox_rate ?? null, spamRate: rates?.spam_rate ?? null,
          bounceRate: rates?.bounce_rate ?? null, replyRate: null,
          authScore: 0, consistency: a.consecutive_stable_days ?? 0, blacklistPenalty: 0,
        },
        warmupDay: a.warmup_day ?? 0, warmupTarget: a.warmup_target ?? 14,
        blacklistStatus, blacklistDetails: a.blacklist_details ?? {}, domainAuth,
        isPaused: !!a.warmup_paused, pauseReason: a.warmup_pause_reason ?? null,
      }),
      _dailyCapForRollup: recommendedSendLimit,
    };
  });

  const stats = {
    total: enriched.length,
    warming: enriched.filter(a => a.warmup_enabled).length,
    healthy: enriched.filter(a => a.health_score >= 80).length,
    at_risk: enriched.filter(a => a.health_score > 0 && a.health_score < 50).length,
  };

  // Domain dashboard — per-domain rollup across every account (warming or not).
  const byDomain = new Map<string, typeof enriched>();
  for (const a of enriched) {
    const d = a.domain || a.email?.split('@')[1]?.toLowerCase() || 'unknown';
    if (!byDomain.has(d)) byDomain.set(d, []);
    byDomain.get(d)!.push(a);
  }
  const domains = [...byDomain.entries()].map(([domain, accts]) => ({
    domain,
    ...computeDomainRollup(accts.map(a => ({
      healthScore: a.health_score ?? 0, blacklistStatus: a.blacklist_status || 'unknown', dailyCap: a._dailyCapForRollup,
    }))),
  })).sort((a, b) => b.mailboxCount - a.mailboxCount);

  for (const a of enriched) delete a._dailyCapForRollup;

  return NextResponse.json({ accounts: enriched, stats, domains });
}

const VALID_POOL_MODES = ['admin_pool', 'user_to_user', 'both'] as const;

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const rate = await checkRateLimit(admin.id, 'warmup_toggle');
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many warmup changes in a short time — please wait a bit and try again.' }, { status: 429 });
  }

  const body = await req.json();
  const { id, warmup_enabled, warmup_pool_mode, set_all_pool_mode } = body;

  // Bulk: set pool mode for ALL user accounts at once
  if (set_all_pool_mode && VALID_POOL_MODES.includes(set_all_pool_mode)) {
    const { error } = await supabaseAdmin
      .from('email_accounts')
      .update({ warmup_pool_mode: set_all_pool_mode })
      .neq('is_pool_account', true);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, set_all_pool_mode });
  }

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updates: Record<string, unknown> = {};

  if (typeof warmup_enabled === 'boolean') {
    updates.warmup_enabled = warmup_enabled;
    if (warmup_enabled) { updates.status = 'warming'; }
    else { updates.status = 'active'; }
  }

  if (warmup_pool_mode && VALID_POOL_MODES.includes(warmup_pool_mode)) {
    updates.warmup_pool_mode = warmup_pool_mode;
  }

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('email_accounts').update(updates).eq('id', id).neq('is_pool_account', true).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

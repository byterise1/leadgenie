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

  // Cascading fallback, same reasoning as instrumentation.ts's warmup cycle:
  // bundling a not-yet-migrated column into an already-working select fails
  // the WHOLE query, not just that column — so a brand-new tier (trust_score
  // etc.) must never share a select with columns from an earlier, already-
  // deployed migration, or a missing trust migration would silently regress
  // SPF/DKIM/DMARC/blacklist display too.
  const BASE = 'id, user_id, email, type, smtp_host, status, health_score, warmup_enabled, warmup_day, warmup_target, sent_today, warmup_pool_mode, created_at';
  const PHASE1 = 'already_warmed_up, warmup_paused, warmup_pause_reason, spf_status, dkim_status, dmarc_status, consecutive_stable_days';
  const PHASE23 = 'mx_status, domain, join_shared_network, blacklist_status, blacklist_details, blacklist_checked_at';
  const TRUST = 'trust_score, network_isolated, network_isolation_reason, network_isolated_at, abuse_flag_count';

  let accounts: Record<string, any>[] | null;
  let error: { message: string } | null;

  const tier3 = await supabaseAdmin.from('email_accounts')
    .select(`${BASE}, ${PHASE1}, ${PHASE23}, ${TRUST}`)
    .neq('is_pool_account', true).order('warmup_enabled', { ascending: false }).order('created_at', { ascending: false });
  if (!tier3.error) {
    accounts = tier3.data; error = null;
  } else {
    const tier2 = await supabaseAdmin.from('email_accounts')
      .select(`${BASE}, ${PHASE1}, ${PHASE23}`)
      .neq('is_pool_account', true).order('warmup_enabled', { ascending: false }).order('created_at', { ascending: false });
    if (!tier2.error) {
      accounts = tier2.data; error = null;
    } else {
      const tier1 = await supabaseAdmin.from('email_accounts')
        .select(`${BASE}, ${PHASE1}`)
        .neq('is_pool_account', true).order('warmup_enabled', { ascending: false }).order('created_at', { ascending: false });
      if (!tier1.error) {
        accounts = tier1.data; error = null;
      } else {
        const tier0 = await supabaseAdmin.from('email_accounts')
          .select(BASE)
          .neq('is_pool_account', true).order('warmup_enabled', { ascending: false }).order('created_at', { ascending: false });
        accounts = tier0.data; error = tier0.error;
      }
    }
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

  // Network Health Dashboard — whole-network view spanning both the admin
  // pool and the shared user network, not just one user's own accounts.
  const { data: poolForHealth } = await supabaseAdmin
    .from('email_accounts').select('email, health_score, domain').eq('is_pool_account', true);
  const poolDomains = (poolForHealth ?? []).map((p: any) => p.domain || p.email?.split('@')[1]?.toLowerCase()).filter(Boolean);
  const poolHealthScores = (poolForHealth ?? []).map((p: any) => p.health_score ?? 0);

  const distinctDomains = new Set([
    ...enriched.map(a => a.domain || a.email?.split('@')[1]?.toLowerCase()).filter(Boolean),
    ...poolDomains,
  ]);
  const trustScores = enriched.map(a => a.trust_score).filter((v: any): v is number => typeof v === 'number');
  const healthScores = [...enriched.map(a => a.health_score ?? 0), ...poolHealthScores];
  const isolatedAccounts = enriched.filter(a => a.network_isolated).map(a => ({ email: a.email, reason: a.network_isolation_reason }));
  const abuseFlaggedAccounts = enriched.filter(a => (a.abuse_flag_count ?? 0) > 0).map(a => ({ email: a.email, count: a.abuse_flag_count }));

  // Pairing fairness — leverages the warmup_pairings table built for smart
  // pairing (Phase 2) to show whether rotation is actually spreading fairly.
  const { data: pairingRows } = await supabaseAdmin.from('warmup_pairings').select('from_account_id, send_count');
  const perAccountSendCount = new Map<string, number>();
  for (const row of pairingRows ?? []) {
    perAccountSendCount.set(row.from_account_id, (perAccountSendCount.get(row.from_account_id) ?? 0) + (row.send_count ?? 0));
  }
  const sendCounts = [...perAccountSendCount.values()];

  const networkHealth = {
    networkSize: enriched.length + (poolForHealth?.length ?? 0),
    sharedNetworkSize: enriched.filter(a => a.join_shared_network !== false).length,
    adminPoolSize: poolForHealth?.length ?? 0,
    distinctDomains: distinctDomains.size,
    avgHealth: healthScores.length ? Math.round(healthScores.reduce((s, v) => s + v, 0) / healthScores.length) : 0,
    avgTrust: trustScores.length ? Math.round(trustScores.reduce((s, v) => s + v, 0) / trustScores.length) : null,
    isolatedAccounts,
    abuseFlaggedAccounts,
    pairingFairness: sendCounts.length ? {
      min: Math.min(...sendCounts), max: Math.max(...sendCounts),
      avg: Math.round((sendCounts.reduce((s, v) => s + v, 0) / sendCounts.length) * 10) / 10,
    } : null,
  };

  return NextResponse.json({ accounts: enriched, stats, domains, networkHealth });
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

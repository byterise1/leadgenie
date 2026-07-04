import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Use select('*') to avoid errors on older Supabase instances missing columns like daily_limit
  const { data, error } = await supabaseAdmin
    .from('email_accounts')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_pool_account', false)
    .order('created_at', { ascending: false });

  // Retry without is_pool_account filter in case column doesn't exist yet
  if (error?.message?.includes('is_pool_account') || error?.message?.includes('column')) {
    const { data: data2, error: err2 } = await supabaseAdmin
      .from('email_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (err2) return NextResponse.json({ error: err2.message }, { status: 500 });
    // Filter pool accounts in JS if column exists in data
    const safe2 = (data2 || []).filter((a: Record<string, unknown>) => !a.is_pool_account);
    const todayUTC2 = new Date(); todayUTC2.setUTCHours(0, 0, 0, 0);
    const { data: sr2 } = await supabaseAdmin.from('sent_emails').select('account_id').eq('user_id', user.id).gte('sent_at', todayUTC2.toISOString());
    const cm2: Record<string, number> = {}; (sr2 || []).forEach((s: { account_id: string }) => { cm2[s.account_id] = (cm2[s.account_id] || 0) + 1; });
    return NextResponse.json(safe2.map((acc: Record<string, unknown>) => {
      const sent = cm2[acc.id as string] || 0; const limit = (acc.daily_limit as number) || 50;
      return { id: acc.id, email: acc.email, type: acc.type, status: acc.status, health_score: acc.health_score ?? 80, warmup_enabled: acc.warmup_enabled ?? false, sent_today: acc.sent_today ?? 0, daily_limit: limit, created_at: acc.created_at, sent_today_real: sent, remaining_today: Math.max(0, limit - sent) };
    }));
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Real-time sent count per account for today (UTC midnight)
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);
  const { data: sentRows } = await supabaseAdmin
    .from('sent_emails')
    .select('account_id')
    .eq('user_id', user.id)
    .gte('sent_at', todayUTC.toISOString());

  const countMap: Record<string, number> = {};
  (sentRows || []).forEach((s: { account_id: string }) => {
    countMap[s.account_id] = (countMap[s.account_id] || 0) + 1;
  });

  const enriched = (data || [])
    .filter((acc: Record<string, unknown>) => !acc.is_pool_account)
    .map((acc: Record<string, unknown>) => {
      const sentReal = countMap[acc.id as string] || 0;
      const limit = (acc.daily_limit as number) || 50;
      return {
        id: acc.id, email: acc.email, type: acc.type, status: acc.status,
        health_score: acc.health_score ?? 80, warmup_enabled: acc.warmup_enabled ?? false,
        sent_today: acc.sent_today ?? 0, daily_limit: limit, created_at: acc.created_at,
        sent_today_real: sentReal, remaining_today: Math.max(0, limit - sentReal),
      };
    });

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { type, email, smtp_host, smtp_port, smtp_user, smtp_pass, imap_host, imap_port } = body;

  if (!type || !email) return NextResponse.json({ error: 'type and email required' }, { status: 400 });

  const rate = await checkRateLimit(user.id, 'email_account_add');
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many mailboxes added in a short time — please wait a bit and try again.' }, { status: 429 });
  }

  // Ensure profile row exists
  await supabaseAdmin.from('profiles').upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true });

  // Block duplicate emails regardless of type (unique constraint is on user_id + email)
  const { data: dup } = await supabaseAdmin
    .from('email_accounts')
    .select('id,type')
    .eq('user_id', user.id)
    .eq('email', email)
    .maybeSingle();

  if (dup) {
    const typeLabel: Record<string, string> = {
      'gmail-oauth': 'Gmail (OAuth)',
      'gmail-app': 'Gmail (App Password)',
      'imap': 'IMAP',
      'smtp': 'SMTP',
    };
    const existing = typeLabel[dup.type] ?? dup.type;
    return NextResponse.json(
      { error: `${email} is already connected as ${existing}. Remove it first before adding it again.` },
      { status: 409 }
    );
  }

  // One mailbox = one identity, platform-wide — a real inbox's reputation can't be
  // split across multiple accounts with independently-diverging health/warmup state.
  const { data: crossUserDup } = await supabaseAdmin
    .from('email_accounts')
    .select('id')
    .eq('email', email)
    .neq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (crossUserDup) {
    return NextResponse.json(
      { error: `${email} is already connected to another account on this platform. Each mailbox can only be used by one account — this keeps its warmup and sender reputation accurate.` },
      { status: 409 }
    );
  }

  const DEFAULT_DAILY_LIMITS: Record<string, number> = {
    'gmail-oauth': 50,
    'gmail-app': 50,
    'imap': 50,
    'smtp': 50,
  };
  const defaultLimit = DEFAULT_DAILY_LIMITS[type] ?? 50;

  const { data, error } = await supabaseAdmin
    .from('email_accounts')
    .insert({
      user_id: user.id,
      type,
      email,
      smtp_host: smtp_host || null,
      smtp_port: smtp_port ? Number(smtp_port) : null,
      smtp_user: smtp_user || email,
      smtp_pass: smtp_pass || null,
      imap_host: imap_host || null,
      imap_port: imap_port ? Number(imap_port) : null,
      status: 'warming',
      health_score: 50,
      warmup_enabled: true,
      daily_limit: defaultLimit,
    })
    .select('id,email,type,status,health_score,warmup_enabled,sent_today,daily_limit,created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Enrich with real-time capacity (just added → 0 sent today)
  return NextResponse.json({ ...data, sent_today_real: 0, remaining_today: defaultLimit });
}

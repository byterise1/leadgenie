import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('email_accounts')
    .select('id,email,type,status,health_score,warmup_enabled,sent_today,daily_limit,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Real-time sent count per account for today (UTC midnight)
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);
  const { data: sentRows } = await supabaseAdmin
    .from('sent_emails')
    .select('account_id')
    .eq('user_id', user.id)
    .gte('created_at', todayUTC.toISOString());

  const countMap: Record<string, number> = {};
  (sentRows || []).forEach((s: { account_id: string }) => {
    countMap[s.account_id] = (countMap[s.account_id] || 0) + 1;
  });

  const enriched = (data || []).map((acc: Record<string, unknown>) => {
    const sentReal = countMap[acc.id as string] || 0;
    const limit = (acc.daily_limit as number) || 50;
    return { ...acc, sent_today_real: sentReal, remaining_today: Math.max(0, limit - sentReal) };
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

  // Ensure profile row exists
  await supabaseAdmin.from('profiles').upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true });

  // Prevent duplicate: same email + same type
  const { data: dup } = await supabaseAdmin
    .from('email_accounts')
    .select('id')
    .eq('user_id', user.id)
    .eq('email', email)
    .eq('type', type)
    .maybeSingle();

  if (dup) return NextResponse.json({ error: 'This account is already connected. Remove it first to re-add.' }, { status: 409 });

  // Safe daily limits per type (conservative defaults to protect deliverability)
  const DEFAULT_DAILY_LIMITS: Record<string, number> = {
    'gmail-oauth': 50,
    'gmail-app': 50,
    'imap': 100,
    'smtp': 150,
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
      health_score: 72,
      daily_limit: defaultLimit,
    })
    .select('id,email,type,status,health_score,warmup_enabled,sent_today,created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

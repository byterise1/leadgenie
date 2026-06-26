import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: accounts, error: accountsErr } = await supabaseAdmin
    .from('email_accounts')
    .select('id, email, type, status, health_score, warmup_enabled, warmup_day, warmup_target, sent_today')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

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

  const enriched = (accounts ?? []).map(a => ({
    ...a,
    warmup_emails_sent: statsMap.get(a.id) ?? 0,
  }));

  return NextResponse.json(enriched);
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

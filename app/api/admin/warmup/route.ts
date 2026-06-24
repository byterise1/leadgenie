import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

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

  const { data: accounts, error } = await supabaseAdmin
    .from('email_accounts')
    .select('id, user_id, email, type, status, health_score, warmup_enabled, warmup_day, warmup_target, sent_today, warmup_pool_mode, created_at')
    .neq('is_pool_account', true)
    .order('warmup_enabled', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = [...new Set((accounts ?? []).map(a => a.user_id))];

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds);

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p.full_name]));

  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map((authUsers?.users ?? []).map(u => [u.id, u.email]));

  const enriched = (accounts ?? []).map(a => ({
    ...a,
    user_name: profileMap.get(a.user_id) || emailMap.get(a.user_id) || 'Unknown',
    user_email: emailMap.get(a.user_id) || '',
  }));

  const stats = {
    total: enriched.length,
    warming: enriched.filter(a => a.warmup_enabled).length,
    healthy: enriched.filter(a => a.health_score >= 80).length,
    at_risk: enriched.filter(a => a.health_score > 0 && a.health_score < 50).length,
  };

  return NextResponse.json({ accounts: enriched, stats });
}

const VALID_POOL_MODES = ['admin_pool', 'user_to_user', 'both'] as const;

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, warmup_enabled, warmup_pool_mode } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updates: Record<string, unknown> = {};

  if (typeof warmup_enabled === 'boolean') {
    updates.warmup_enabled = warmup_enabled;
    if (warmup_enabled) { updates.status = 'warming'; updates.warmup_day = 0; }
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

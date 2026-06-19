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

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 20;
  const offset = (page - 1) * limit;

  const { data: profiles, count, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, plan, is_admin, credits_used, credits_total, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const profileIds = (profiles ?? []).map(p => p.id);
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
  const emailMap = new Map(authUsers?.users?.map(u => [u.id, u.email]) ?? []);

  const [campaignsRes, accountsRes, emailsRes, bouncedRes, unsubRes] = await Promise.all([
    supabaseAdmin.from('campaigns').select('user_id').in('user_id', profileIds),
    supabaseAdmin.from('email_accounts').select('user_id').in('user_id', profileIds),
    supabaseAdmin.from('sent_emails').select('user_id').in('user_id', profileIds),
    supabaseAdmin.from('sent_emails').select('user_id').in('user_id', profileIds).eq('bounced', true),
    supabaseAdmin.from('campaign_leads').select('user_id').in('user_id', profileIds).eq('unsubscribed', true),
  ]);

  const campaignCount = new Map<string, number>();
  const accountCount = new Map<string, number>();
  const emailCount = new Map<string, number>();
  const bouncedCount = new Map<string, number>();
  const unsubCount = new Map<string, number>();

  for (const r of campaignsRes.data ?? []) campaignCount.set(r.user_id, (campaignCount.get(r.user_id) ?? 0) + 1);
  for (const r of accountsRes.data ?? []) accountCount.set(r.user_id, (accountCount.get(r.user_id) ?? 0) + 1);
  for (const r of emailsRes.data ?? []) emailCount.set(r.user_id, (emailCount.get(r.user_id) ?? 0) + 1);
  for (const r of bouncedRes.data ?? []) bouncedCount.set(r.user_id, (bouncedCount.get(r.user_id) ?? 0) + 1);
  for (const r of unsubRes.data ?? []) unsubCount.set(r.user_id, (unsubCount.get(r.user_id) ?? 0) + 1);

  const users = (profiles ?? [])
    .map(p => ({
      ...p,
      email: emailMap.get(p.id) ?? '',
      campaigns: campaignCount.get(p.id) ?? 0,
      accounts: accountCount.get(p.id) ?? 0,
      emails_sent: emailCount.get(p.id) ?? 0,
      bounced: bouncedCount.get(p.id) ?? 0,
      unsubscribed: unsubCount.get(p.id) ?? 0,
    }))
    .filter(u => !search || u.email.toLowerCase().includes(search.toLowerCase()) || (u.full_name || '').toLowerCase().includes(search.toLowerCase()));

  return NextResponse.json({ users, total: count ?? 0, page, limit });
}

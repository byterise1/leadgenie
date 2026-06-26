import { NextResponse } from 'next/server';
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

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [usersRes, newUsersRes, emailsRes, activeCampaignsRes] = await Promise.all([
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
    supabaseAdmin.from('sent_emails').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ]);

  return NextResponse.json({
    totalUsers: usersRes.count ?? 0,
    newUsersWeek: newUsersRes.count ?? 0,
    totalEmailsSent: emailsRes.count ?? 0,
    activeCampaigns: activeCampaignsRes.count ?? 0,
  });
}

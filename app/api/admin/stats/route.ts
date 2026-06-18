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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    usersRes,
    activeUsersRes,
    totalEmailsRes,
    emailsTodayRes,
    activeCampaignsRes,
    totalCampaignsRes,
    warmingAccountsRes,
    totalAccountsRes,
    openedEmailsRes,
    repliedEmailsRes,
    recentUsersRes,
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    supabaseAdmin.from('sent_emails').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('sent_emails').select('id', { count: 'exact', head: true }).gte('sent_at', today.toISOString()),
    supabaseAdmin.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('campaigns').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('email_accounts').select('id', { count: 'exact', head: true }).eq('warmup_enabled', true),
    supabaseAdmin.from('email_accounts').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('sent_emails').select('id', { count: 'exact', head: true }).not('opened_at', 'is', null),
    supabaseAdmin.from('sent_emails').select('id', { count: 'exact', head: true }).not('replied_at', 'is', null),
    supabaseAdmin.from('profiles').select('id, full_name, plan, credits_used, credits_total, created_at').order('created_at', { ascending: false }).limit(8),
  ]);

  const totalSent = totalEmailsRes.count ?? 0;
  const totalOpened = openedEmailsRes.count ?? 0;
  const totalReplied = repliedEmailsRes.count ?? 0;

  return NextResponse.json({
    totalUsers: usersRes.count ?? 0,
    newUsersWeek: activeUsersRes.count ?? 0,
    totalEmailsSent: totalSent,
    emailsSentToday: emailsTodayRes.count ?? 0,
    activeCampaigns: activeCampaignsRes.count ?? 0,
    totalCampaigns: totalCampaignsRes.count ?? 0,
    warmingAccounts: warmingAccountsRes.count ?? 0,
    totalAccounts: totalAccountsRes.count ?? 0,
    avgOpenRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
    avgReplyRate: totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0,
    recentUsers: recentUsersRes.data ?? [],
  });
}

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

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    revenueRes,
    refundsRes,
    allTimeRes,
    activeUsersRes,
    freeUsersRes,
    recentEventsRes,
  ] = await Promise.all([
    supabaseAdmin.from('billing_events').select('amount').eq('status', 'paid').gte('created_at', monthStart),
    supabaseAdmin.from('billing_events').select('amount').eq('status', 'refunded').gte('created_at', monthStart),
    supabaseAdmin.from('billing_events').select('amount').eq('status', 'paid'),
    supabaseAdmin.from('profiles').select('id, full_name, plan, created_at').neq('plan', 'free'),
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('plan', 'free'),
    supabaseAdmin.from('billing_events')
      .select('id, user_id, type, plan_id, amount, status, description, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const revenueThisMonth = (revenueRes.data ?? []).reduce((s, e) => s + e.amount, 0);
  const refundsThisMonth = (refundsRes.data ?? []).reduce((s, e) => s + e.amount, 0);
  const totalRevenue = (allTimeRes.data ?? []).reduce((s, e) => s + e.amount, 0);

  const activeUsers = activeUsersRes.data ?? [];
  const userIds = activeUsers.map(u => u.id);
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map((authUsers?.users ?? []).map(u => [u.id, u.email]));

  const enrichedActive = activeUsers.map(u => ({
    ...u,
    email: emailMap.get(u.id) ?? '',
  }));

  const eventsWithEmail = (recentEventsRes.data ?? []).map(e => ({
    ...e,
    user_email: emailMap.get(e.user_id) ?? e.user_id,
    amount_dollars: (e.amount / 100).toFixed(2),
  }));

  return NextResponse.json({
    revenueThisMonth: revenueThisMonth / 100,
    refundsThisMonth: refundsThisMonth / 100,
    totalRevenue: totalRevenue / 100,
    activePayingUsers: activeUsers.length,
    freeUsers: freeUsersRes.count ?? 0,
    planBreakdown: activeUsers.reduce((acc: Record<string, number>, u) => {
      acc[u.plan] = (acc[u.plan] ?? 0) + 1;
      return acc;
    }, {}),
    activeUsersList: enrichedActive,
    recentEvents: eventsWithEmail,
  });
}

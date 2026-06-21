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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const [profileRes, campaignsRes, accountsRes, emailsRes, bouncedRes, unsubRes] = await Promise.all([
    supabaseAdmin.from('profiles').select('*').eq('id', id).single(),
    supabaseAdmin.from('campaigns').select('id, name, status, total_sent, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('email_accounts').select('id, email, type, status, health_score, warmup_enabled, sent_today').eq('user_id', id),
    supabaseAdmin.from('sent_emails').select('id', { count: 'exact', head: true }).eq('user_id', id),
    supabaseAdmin.from('sent_emails').select('id', { count: 'exact', head: true }).eq('user_id', id).eq('bounced', true),
    supabaseAdmin.from('campaign_leads').select('id', { count: 'exact', head: true }).eq('user_id', id).eq('unsubscribed', true),
  ]);

  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(id);

  return NextResponse.json({
    profile: { ...profileRes.data, email: authUser.user?.email ?? '' },
    campaigns: campaignsRes.data ?? [],
    accounts: accountsRes.data ?? [],
    totalEmails: emailsRes.count ?? 0,
    totalBounced: bouncedRes.count ?? 0,
    totalUnsubscribed: unsubRes.count ?? 0,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  // Block removing admin if this is the last admin
  if ('is_admin' in body && body.is_admin === false) {
    const { count } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_admin', true);
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: 'Cannot remove the last admin. Add another admin first.' },
        { status: 400 }
      );
    }
  }

  const allowed = ['plan', 'credits_total', 'credits_used', 'is_admin', 'full_name'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  if (id === admin.id) return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });

  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

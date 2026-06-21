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
  const status = searchParams.get('status') || '';

  let query = supabaseAdmin
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, status, priority, admin_reply } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { data: existing } = await supabaseAdmin
    .from('support_tickets')
    .select('user_email, subject, admin_reply, user_id')
    .eq('id', id)
    .single();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status !== undefined) updates.status = status;
  if (priority !== undefined) updates.priority = priority;
  if (admin_reply !== undefined) updates.admin_reply = admin_reply;

  const { data, error } = await supabaseAdmin
    .from('support_tickets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (admin_reply && existing?.user_id && admin_reply !== existing.admin_reply) {
    void supabaseAdmin.from('notifications').insert({
      user_id: existing.user_id,
      message: `Support reply: your ticket "${existing.subject}" has been answered`,
      type: 'info',
      read: false,
      link: `/dashboard/support/${id}`,
    });
  }

  return NextResponse.json(data);
}

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

  const { data, error } = await supabaseAdmin
    .from('email_accounts')
    .select('id, email, type, status, health_score, warmup_enabled, warmup_day, warmup_target, sent_today')
    .eq('user_id', admin.id)
    .eq('is_pool_account', true)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { email, smtp_host, smtp_port, smtp_user, smtp_pass, warmup_target } = body;

  if (!email || !smtp_host || !smtp_user || !smtp_pass) {
    return NextResponse.json({ error: 'email, smtp_host, smtp_user and smtp_pass are required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('email_accounts')
    .insert({
      user_id: admin.id,
      email,
      type: 'smtp',
      status: 'warming',
      smtp_host,
      smtp_port: smtp_port || 587,
      smtp_user,
      smtp_pass,
      warmup_enabled: true,
      warmup_target: warmup_target || 40,
      health_score: 50,
      is_pool_account: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await req.json();
  const { error } = await supabaseAdmin
    .from('email_accounts')
    .delete()
    .eq('id', id)
    .eq('user_id', admin.id)
    .eq('is_pool_account', true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

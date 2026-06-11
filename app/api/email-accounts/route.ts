import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('email_accounts')
    .select('id,email,type,status,health_score,warmup_enabled,sent_today,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
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
    })
    .select('id,email,type,status,health_score,warmup_enabled,sent_today,created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

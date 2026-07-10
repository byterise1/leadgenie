import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('email_accounts')
    .select('id, email, type, smtp_host, smtp_port, smtp_user, smtp_pass, imap_host, imap_port')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Verify ownership before doing anything
  const { data: account } = await supabaseAdmin
    .from('email_accounts')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!account) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Cascade to every table that references this account
  await supabaseAdmin.from('inbox_threads').delete().eq('account_id', id);
  await supabaseAdmin.from('campaign_accounts').delete().eq('account_id', id);
  await supabaseAdmin.from('sent_emails').update({ account_id: null }).eq('account_id', id);
  // campaign_leads.account_id (added later by the Smart Priority Engine
  // migration to lock a lead to its sending mailbox) has no ON DELETE
  // handling of its own - without this, deleting an account still mid-way
  // through a campaign fails with a foreign key violation instead of
  // actually deleting anything.
  await supabaseAdmin.from('campaign_leads').update({ account_id: null }).eq('account_id', id);

  const { error } = await supabaseAdmin
    .from('email_accounts')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Trim any credential/host string fields present in this update — a
  // password field is masked, so a copy-pasted leading/trailing space is
  // invisible to the user and would otherwise silently fail future auth.
  // Only touches fields actually present, so unrelated updates (e.g. just
  // daily_limit) are unaffected.
  for (const key of ['email', 'smtp_host', 'smtp_user', 'smtp_pass', 'imap_host'] as const) {
    if (typeof body[key] === 'string') body[key] = body[key].trim();
  }

  const { data, error } = await supabaseAdmin
    .from('email_accounts')
    .update(body)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

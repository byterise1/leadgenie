import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

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

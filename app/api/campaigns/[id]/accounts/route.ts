import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { account_id } = await req.json();

  const { data: campaign } = await supabaseAdmin.from('campaigns').select('id').eq('id', id).eq('user_id', user.id).single();
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { error } = await supabaseAdmin.from('campaign_accounts').insert({ campaign_id: id, account_id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { account_id } = await req.json();

  const { data: campaign } = await supabaseAdmin.from('campaigns').select('id').eq('id', id).eq('user_id', user.id).single();
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { error } = await supabaseAdmin.from('campaign_accounts').delete().eq('campaign_id', id).eq('account_id', account_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

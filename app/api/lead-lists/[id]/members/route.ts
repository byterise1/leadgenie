import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: list_id } = await params;
  const { lead_ids } = await req.json();
  if (!Array.isArray(lead_ids) || !lead_ids.length) return NextResponse.json({ error: 'lead_ids required' }, { status: 400 });

  const { data: list } = await supabaseAdmin
    .from('lead_lists').select('id').eq('id', list_id).eq('user_id', user.id).single();
  if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 });

  const rows = lead_ids.map((lid: string) => ({ list_id, lead_id: lid }));
  const { error } = await supabaseAdmin
    .from('lead_list_members')
    .upsert(rows, { onConflict: 'list_id,lead_id', ignoreDuplicates: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ added: rows.length });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: list_id } = await params;
  const { lead_ids } = await req.json();
  if (!Array.isArray(lead_ids) || !lead_ids.length) return NextResponse.json({ error: 'lead_ids required' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('lead_list_members')
    .delete()
    .eq('list_id', list_id)
    .in('lead_id', lead_ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ removed: lead_ids.length });
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('lead_lists')
    .update({ name: name.trim() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Verify this list belongs to the user
  const { data: list } = await supabaseAdmin
    .from('lead_lists')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();
  if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 });

  // Find all leads in this list
  const { data: members } = await supabaseAdmin
    .from('lead_list_members')
    .select('lead_id')
    .eq('list_id', id);

  const leadIds = (members || []).map((m: { lead_id: string }) => m.lead_id);

  if (leadIds.length) {
    // Find which of those leads exist in OTHER lists too
    const { data: inOtherLists } = await supabaseAdmin
      .from('lead_list_members')
      .select('lead_id')
      .in('lead_id', leadIds)
      .neq('list_id', id);

    const sharedSet = new Set((inOtherLists || []).map((m: { lead_id: string }) => m.lead_id));
    const toDelete = leadIds.filter(lid => !sharedSet.has(lid));

    // Permanently delete leads that are only in this list
    if (toDelete.length) {
      await supabaseAdmin.from('leads').delete().in('id', toDelete);
    }
  }

  // Delete the list itself (cascade removes lead_list_members rows)
  const { error } = await supabaseAdmin
    .from('lead_lists')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

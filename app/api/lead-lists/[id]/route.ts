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

  // Get all lead IDs for this user BEFORE deleting (so we know what to check after)
  const { data: allUserLeads } = await supabaseAdmin
    .from('leads')
    .select('id')
    .eq('user_id', user.id);
  const allLeadIds = (allUserLeads || []).map((l: { id: string }) => l.id);

  // Delete the list (cascade removes its lead_list_members rows automatically)
  const { error } = await supabaseAdmin
    .from('lead_lists')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Now find which of the user's leads are still linked to any remaining list
  if (allLeadIds.length) {
    const { data: stillLinked } = await supabaseAdmin
      .from('lead_list_members')
      .select('lead_id')
      .in('lead_id', allLeadIds);

    const linkedSet = new Set((stillLinked || []).map((m: { lead_id: string }) => m.lead_id));
    const orphanIds = allLeadIds.filter(lid => !linkedSet.has(lid));

    if (orphanIds.length) {
      await supabaseAdmin.from('leads').delete().in('id', orphanIds);
    }
  }

  return NextResponse.json({ success: true });
}

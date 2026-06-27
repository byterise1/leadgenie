import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  let query = supabaseAdmin
    .from('inbox_threads')
    .select('*, lead:leads(first_name,last_name,email,company), campaign:campaigns(id,name), account:email_accounts(email)')
    .eq('user_id', user.id)
    .order('received_at', { ascending: false })
    .limit(100);

  if (status && status !== 'All') {
    const statusMap: Record<string, string> = {
      'Interested': 'interested',
      'Not Interested': 'not_interested',
      'Out of Office': 'out_of_office',
      'Do Not Contact': 'do_not_contact',
    };
    if (statusMap[status]) query = query.eq('status', statusMap[status]);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, ...updates } = await req.json();

  const { data, error } = await supabaseAdmin
    .from('inbox_threads')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// Delete a thread and undo its side-effects (replied_at / campaign_leads status)
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();

  // Fetch the thread to get lead_id + campaign_id before deleting
  const { data: thread } = await supabaseAdmin
    .from('inbox_threads')
    .select('lead_id, campaign_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!thread) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Undo replied_at so the sync can detect a real reply later
  if (thread.lead_id && thread.campaign_id) {
    await supabaseAdmin
      .from('sent_emails')
      .update({ replied_at: null })
      .eq('lead_id', thread.lead_id)
      .eq('campaign_id', thread.campaign_id)
      .not('replied_at', 'is', null);

    // Revert campaign_leads status from 'replied' back to 'active'
    await supabaseAdmin
      .from('campaign_leads')
      .update({ status: 'active' })
      .eq('lead_id', thread.lead_id)
      .eq('campaign_id', thread.campaign_id)
      .eq('status', 'replied');
  }

  await supabaseAdmin.from('inbox_threads').delete().eq('id', id).eq('user_id', user.id);

  return NextResponse.json({ ok: true });
}

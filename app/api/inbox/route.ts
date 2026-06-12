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
    .select('*, lead:leads(first_name,last_name,email,company), campaign:campaigns(id,name)')
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

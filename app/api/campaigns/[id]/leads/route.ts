import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Verify campaign belongs to user
  const { data: campaign } = await supabaseAdmin
    .from('campaigns').select('id').eq('id', id).eq('user_id', user.id).single();
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data, error } = await supabaseAdmin
    .from('campaign_leads')
    .select('id,status,current_step,last_sent_at,lead:leads(id,email,first_name,last_name,company)')
    .eq('campaign_id', id)
    .order('last_sent_at', { ascending: false, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

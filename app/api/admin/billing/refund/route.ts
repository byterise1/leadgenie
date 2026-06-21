import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single();
  return profile?.is_admin ? user : null;
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { event_id } = await req.json();
  if (!event_id) return NextResponse.json({ error: 'event_id required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('billing_events')
    .update({ status: 'refunded' })
    .eq('id', event_id)
    .eq('status', 'paid')
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Event not found or already refunded' }, { status: 404 });
  return NextResponse.json(data);
}

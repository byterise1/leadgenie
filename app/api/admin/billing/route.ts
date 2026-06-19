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

  const body = await req.json();
  const { user_id, type, plan_id, amount, currency, status, description, period_start, period_end } = body;

  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('billing_events')
    .insert({
      user_id,
      type: type || 'payment',
      plan_id: plan_id || null,
      amount: Math.round((amount || 0) * 100),
      currency: currency || 'usd',
      status: status || 'paid',
      description: description || null,
      period_start: period_start || null,
      period_end: period_end || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('user_id');

  let query = supabaseAdmin
    .from('billing_events')
    .select('*')
    .order('created_at', { ascending: false });

  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query.limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

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

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from('pricing_plans')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { id, name, tagline, monthly_price, annual_price, credits_per_month, features, highlighted, cta_label, sort_order, active } = body;

  const { data, error } = await supabaseAdmin
    .from('pricing_plans')
    .update({
      name,
      tagline,
      monthly_price: Number(monthly_price),
      annual_price: Number(annual_price),
      credits_per_month: Number(credits_per_month),
      features: typeof features === 'string' ? JSON.parse(features) : features,
      highlighted: !!highlighted,
      cta_label,
      sort_order: Number(sort_order),
      active: !!active,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sync credits_total for all users currently on this plan
  await supabaseAdmin
    .from('profiles')
    .update({ credits_total: Number(credits_per_month) })
    .eq('plan', id);

  return NextResponse.json(data);
}

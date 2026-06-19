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
    .from('prebuilt_templates')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { name, category, subject, body: emailBody, unsub_text, open_rate, reply_rate } = body;

  const { data: maxOrder } = await supabaseAdmin
    .from('prebuilt_templates')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const { data, error } = await supabaseAdmin
    .from('prebuilt_templates')
    .insert({
      name,
      category: category || 'Cold Outreach',
      subject: subject || '',
      body: emailBody || '',
      unsub_text: unsub_text || 'To unsubscribe, click here: {{unsubscribe_link}}\n{{company_address}}',
      open_rate: open_rate || null,
      reply_rate: reply_rate || null,
      sort_order: (maxOrder?.sort_order ?? 0) + 1,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

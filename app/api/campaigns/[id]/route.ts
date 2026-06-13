import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .select('*, email_steps(*), campaign_accounts(account:email_accounts(id,email,type))')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Real counts from sent_emails (opens, clicks) and campaign_leads (replies — per-lead, deduped)
  const [sentRes, openedRes, repliedRes, clickedRes] = await Promise.all([
    supabaseAdmin.from('sent_emails').select('id', { count: 'exact', head: true }).eq('campaign_id', id),
    supabaseAdmin.from('sent_emails').select('id', { count: 'exact', head: true }).eq('campaign_id', id).not('opened_at', 'is', null),
    supabaseAdmin.from('campaign_leads').select('id', { count: 'exact', head: true }).eq('campaign_id', id).eq('status', 'replied'),
    supabaseAdmin.from('sent_emails').select('id', { count: 'exact', head: true }).eq('campaign_id', id).not('clicked_at', 'is', null),
  ]);

  const totalSent = sentRes.error ? data.total_sent : (sentRes.count ?? 0);
  const totalOpened = openedRes.error ? data.total_opened : (openedRes.count ?? 0);
  const totalReplied = repliedRes.error ? data.total_replied : (repliedRes.count ?? 0);
  const totalClicked = clickedRes.error ? 0 : (clickedRes.count ?? 0);

  return NextResponse.json({ ...data, total_sent: totalSent, total_opened: totalOpened, total_replied: totalReplied, total_clicked: totalClicked });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .update(body)
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

  const { error } = await supabaseAdmin
    .from('campaigns')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

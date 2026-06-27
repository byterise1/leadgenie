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

  const [{ data, error }, { data: trackingRows }] = await Promise.all([
    supabaseAdmin
      .from('campaign_leads')
      .select('id,status,current_step,last_sent_at,lead:leads(id,email,first_name,last_name,company)')
      .eq('campaign_id', id)
      .order('last_sent_at', { ascending: false, nullsFirst: false }),
    supabaseAdmin
      .from('sent_emails')
      .select('lead_id, opened_at, clicked_at, replied_at')
      .eq('campaign_id', id),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Build per-lead tracking map: take the first non-null timestamp across all steps
  const trackMap = new Map<string, { opened_at: string | null; clicked_at: string | null; replied_at: string | null }>();
  for (const t of (trackingRows || [])) {
    if (!t.lead_id) continue;
    const prev = trackMap.get(t.lead_id) || { opened_at: null, clicked_at: null, replied_at: null };
    trackMap.set(t.lead_id, {
      opened_at: prev.opened_at || t.opened_at || null,
      clicked_at: prev.clicked_at || t.clicked_at || null,
      replied_at: prev.replied_at || t.replied_at || null,
    });
  }

  const enriched = (data || []).map((cl: any) => ({
    ...cl,
    opened_at: trackMap.get(cl.lead?.id)?.opened_at ?? null,
    clicked_at: trackMap.get(cl.lead?.id)?.clicked_at ?? null,
    replied_at: trackMap.get(cl.lead?.id)?.replied_at ?? null,
  }));

  return NextResponse.json(enriched);
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Verify ownership
  const { data: campaign } = await supabaseAdmin
    .from('campaigns').select('id').eq('id', id).eq('user_id', user.id).single();
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Check if any steps have ab_variants
  const { data: steps } = await supabaseAdmin
    .from('email_steps')
    .select('step_number, ab_variants')
    .eq('campaign_id', id);

  const abSteps = (steps || []).filter(s =>
    Array.isArray(s.ab_variants) && s.ab_variants.length > 0 && s.ab_variants[0]?.body?.trim()
  );

  if (!abSteps.length) return NextResponse.json([]);

  // Fetch all sent emails with ab_variant, opened_at
  const { data: rows } = await supabaseAdmin
    .from('sent_emails')
    .select('step_number, ab_variant, opened_at, lead_id')
    .eq('campaign_id', id)
    .in('step_number', abSteps.map(s => s.step_number));

  // Fetch replied campaign_leads for this campaign
  const { data: repliedLeads } = await supabaseAdmin
    .from('campaign_leads')
    .select('lead_id')
    .eq('campaign_id', id)
    .eq('status', 'replied');

  const repliedLeadIds = new Set((repliedLeads || []).map((r: any) => r.lead_id));

  // Group by step + variant
  type Bucket = { sent: number; opened: number; replied: number };
  const buckets: Record<string, Bucket> = {};

  for (const row of rows || []) {
    const key = `${row.step_number}__${row.ab_variant || 'A'}`;
    if (!buckets[key]) buckets[key] = { sent: 0, opened: 0, replied: 0 };
    buckets[key].sent++;
    if (row.opened_at) buckets[key].opened++;
    if (repliedLeadIds.has(row.lead_id)) buckets[key].replied++;
  }

  const result = Object.entries(buckets).map(([key, b]) => {
    const [stepStr, variant] = key.split('__');
    return { step_number: Number(stepStr), variant, ...b };
  }).sort((a, b) => a.step_number - b.step_number || a.variant.localeCompare(b.variant));

  return NextResponse.json(result);
}

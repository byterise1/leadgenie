import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { emailQueue } from '@/lib/queue';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Verify campaign belongs to user
  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('*, campaign_accounts(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  if (!campaign.campaign_accounts?.length) {
    return NextResponse.json({ error: 'Add at least one sending account first' }, { status: 400 });
  }

  // Get all pending leads in this campaign
  const { data: campaignLeads } = await supabaseAdmin
    .from('campaign_leads')
    .select('id')
    .eq('campaign_id', id)
    .in('status', ['pending', 'active']);

  if (!campaignLeads?.length) {
    return NextResponse.json({ error: 'No leads enrolled in this campaign' }, { status: 400 });
  }

  // Set campaign to active
  await supabaseAdmin.from('campaigns').update({ status: 'active' }).eq('id', id);

  // Enqueue send jobs — spread across the day using daily_limit
  const dailyLimit = campaign.daily_limit || 50;
  const msPerEmail = Math.floor((16 * 60 * 60 * 1000) / dailyLimit); // spread over 16h window

  const jobs = campaignLeads.map((cl, i) => ({
    name: 'send',
    data: { campaignLeadId: cl.id, stepNumber: 0 },
    opts: {
      delay: i * msPerEmail,
      attempts: 3,
      backoff: { type: 'exponential', delay: 60000 },
    },
  }));

  await emailQueue.addBulk(jobs);

  return NextResponse.json({ success: true, queued: campaignLeads.length });
}

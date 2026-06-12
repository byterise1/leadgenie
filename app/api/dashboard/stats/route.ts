import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [campaigns, sent, leads, inbox] = await Promise.all([
    supabaseAdmin.from('campaigns').select('id,name,status,total_sent,total_opened,total_replied,created_at').eq('user_id', user.id),
    supabaseAdmin.from('sent_emails').select('id,campaign_id,opened_at,replied_at,bounced').eq('user_id', user.id),
    supabaseAdmin.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabaseAdmin.from('inbox_threads').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false),
  ]);

  const activeCampaigns = campaigns.data?.filter(c => c.status === 'active').length ?? 0;
  const totalSent = sent.data?.length ?? 0;
  const totalOpened = sent.data?.filter(e => e.opened_at).length ?? 0;
  const totalReplied = sent.data?.filter(e => e.replied_at).length ?? 0;
  const totalBounced = sent.data?.filter(e => e.bounced).length ?? 0;
  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) + '%' : '—';
  const replyRate = totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) + '%' : '—';
  const bounceRate = totalSent > 0 ? ((totalBounced / totalSent) * 100).toFixed(1) + '%' : '—';

  // Real per-campaign counts from sent_emails (avoids stale total_sent column)
  const bycamp: Record<string, { sent: number; opened: number; replied: number }> = {};
  (sent.data || []).forEach((e: { campaign_id: string; opened_at: string | null; replied_at: string | null }) => {
    if (!e.campaign_id) return;
    const r = bycamp[e.campaign_id] || { sent: 0, opened: 0, replied: 0 };
    r.sent++;
    if (e.opened_at) r.opened++;
    if (e.replied_at) r.replied++;
    bycamp[e.campaign_id] = r;
  });

  const campaignBreakdown = (campaigns.data || []).map(c => {
    const r = bycamp[c.id] || { sent: 0, opened: 0, replied: 0 };
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      sent: r.sent,
      opened: r.opened,
      replied: r.replied,
      open_rate: r.sent > 0 ? ((r.opened / r.sent) * 100).toFixed(1) + '%' : '—',
      reply_rate: r.sent > 0 ? ((r.replied / r.sent) * 100).toFixed(1) + '%' : '—',
    };
  });

  return NextResponse.json({
    activeCampaigns,
    totalSent,
    openRate,
    replyRate,
    bounceRate,
    totalLeads: leads.count ?? 0,
    unreadInbox: inbox.count ?? 0,
    campaigns: campaignBreakdown,
  });
}

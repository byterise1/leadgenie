import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [campaigns, sent, leads, inbox] = await Promise.all([
    supabaseAdmin.from('campaigns').select('id,name,status,total_sent,total_opened,total_replied,created_at').eq('user_id', user.id),
    supabaseAdmin.from('sent_emails').select('id,opened_at,replied_at,bounced').eq('user_id', user.id),
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

  const campaignBreakdown = (campaigns.data || []).map(c => ({
    id: c.id,
    name: c.name,
    status: c.status,
    sent: c.total_sent,
    opened: c.total_opened,
    replied: c.total_replied,
    open_rate: c.total_sent > 0 ? ((c.total_opened / c.total_sent) * 100).toFixed(1) + '%' : '—',
    reply_rate: c.total_sent > 0 ? ((c.total_replied / c.total_sent) * 100).toFixed(1) + '%' : '—',
  }));

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

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');  // ISO string or null
  const to   = searchParams.get('to');

  const fromMs = from ? new Date(from).getTime() : null;
  const toMs   = to   ? new Date(to).getTime()   : null;

  const [campaigns, leads, inbox] = await Promise.all([
    supabaseAdmin.from('campaigns').select('id,name,status,total_sent,total_opened,total_replied,created_at').eq('user_id', user.id),
    supabaseAdmin.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabaseAdmin.from('inbox_threads').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false),
  ]);

  const campaignIds = (campaigns.data || []).map(c => c.id);

  // Always fetch all sent_emails — filter in JS to avoid NULL sent_at edge cases
  const [sent, repliedLeadsRes] = campaignIds.length
    ? await Promise.all([
        supabaseAdmin.from('sent_emails').select('id,campaign_id,opened_at,clicked_at,bounced,sent_at').in('campaign_id', campaignIds),
        supabaseAdmin.from('campaign_leads').select('campaign_id,last_sent_at').in('campaign_id', campaignIds).eq('status', 'replied'),
      ])
    : [{ data: [] }, { data: [] }];

  // Apply date filter in JS (handles NULL sent_at gracefully)
  const allEmails = (sent as { data: any[] | null }).data || [];
  const emails = (fromMs !== null || toMs !== null)
    ? allEmails.filter(e => {
        if (!e.sent_at) return false;
        const t = new Date(e.sent_at).getTime();
        if (fromMs !== null && t < fromMs) return false;
        if (toMs   !== null && t > toMs)   return false;
        return true;
      })
    : allEmails;

  // Filter replies by last_sent_at the same way
  const allReplied = (repliedLeadsRes as { data: any[] | null }).data || [];
  const filteredReplied = (fromMs !== null || toMs !== null)
    ? allReplied.filter(r => {
        if (!r.last_sent_at) return false;
        const t = new Date(r.last_sent_at).getTime();
        if (fromMs !== null && t < fromMs) return false;
        if (toMs   !== null && t > toMs)   return false;
        return true;
      })
    : allReplied;

  const repliedByCamp: Record<string, number> = {};
  filteredReplied.forEach((r: { campaign_id: string }) => {
    repliedByCamp[r.campaign_id] = (repliedByCamp[r.campaign_id] || 0) + 1;
  });

  const activeCampaigns = campaigns.data?.filter(c => c.status === 'active').length ?? 0;
  const totalSent    = emails.length;
  const totalOpened  = emails.filter(e => e.opened_at).length;
  const totalReplied = Object.values(repliedByCamp).reduce((s, v) => s + v, 0);
  const totalClicked = emails.filter(e => e.clicked_at).length;
  const totalBounced = emails.filter(e => e.bounced).length;
  const openRate   = totalSent > 0 ? ((totalOpened  / totalSent) * 100).toFixed(1) + '%' : '—';
  const replyRate  = totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) + '%' : '—';
  const clickRate  = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) + '%' : '—';
  const bounceRate = totalSent > 0 ? ((totalBounced / totalSent) * 100).toFixed(1) + '%' : '—';

  const bycamp: Record<string, { sent: number; opened: number; replied: number; clicked: number }> = {};
  emails.forEach((e: any) => {
    if (!e.campaign_id) return;
    const r = bycamp[e.campaign_id] || { sent: 0, opened: 0, replied: 0, clicked: 0 };
    r.sent++;
    if (e.opened_at)  r.opened++;
    if (e.clicked_at) r.clicked++;
    bycamp[e.campaign_id] = r;
  });
  Object.entries(repliedByCamp).forEach(([campId, count]) => {
    const r = bycamp[campId] || { sent: 0, opened: 0, replied: 0, clicked: 0 };
    r.replied = count;
    bycamp[campId] = r;
  });

  const campaignBreakdown = (campaigns.data || []).map(c => {
    const r = bycamp[c.id] || { sent: 0, opened: 0, replied: 0, clicked: 0 };
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      created_at: c.created_at,
      sent: r.sent,
      opened: r.opened,
      replied: r.replied,
      clicked: r.clicked,
      open_rate:  r.sent > 0 ? ((r.opened  / r.sent) * 100).toFixed(1) + '%' : '—',
      reply_rate: r.sent > 0 ? ((r.replied / r.sent) * 100).toFixed(1) + '%' : '—',
      click_rate: r.sent > 0 ? ((r.clicked / r.sent) * 100).toFixed(1) + '%' : '—',
    };
  });

  return NextResponse.json({
    activeCampaigns,
    totalSent,
    openRate,
    clickRate,
    replyRate,
    bounceRate,
    totalLeads: leads.count ?? 0,
    unreadInbox: inbox.count ?? 0,
    campaigns: campaignBreakdown,
  });
  } catch (err) {
    console.error('Stats route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

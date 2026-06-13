import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: templates, error } = await supabaseAdmin
      .from('user_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!templates?.length) return NextResponse.json([]);

    // Get user's campaign IDs
    const { data: campaigns } = await supabaseAdmin
      .from('campaigns')
      .select('id')
      .eq('user_id', user.id);

    const campaignIds = campaigns?.map(c => c.id) || [];
    const templateIds = templates.map(t => t.id);

    if (!campaignIds.length) {
      return NextResponse.json(templates.map(t => ({ ...t, uses: 0, open_rate: null, reply_rate: null })));
    }

    // Get email_steps referencing any of these templates in user's campaigns
    const { data: steps } = await supabaseAdmin
      .from('email_steps')
      .select('template_id, campaign_id')
      .in('campaign_id', campaignIds)
      .in('template_id', templateIds);

    // Map: templateId → Set of campaign_ids that used it
    const templateCampaigns: Record<string, Set<string>> = {};
    const templateUses: Record<string, number> = {};
    (steps || []).forEach((s: { template_id: string; campaign_id: string }) => {
      if (!s.template_id) return;
      templateUses[s.template_id] = (templateUses[s.template_id] || 0) + 1;
      if (!templateCampaigns[s.template_id]) templateCampaigns[s.template_id] = new Set();
      templateCampaigns[s.template_id].add(s.campaign_id);
    });

    // Aggregate sent/opened/replied for all campaigns used by any template
    const allUsedCampaignIds = Array.from(
      new Set(Object.values(templateCampaigns).flatMap(s => Array.from(s)))
    );

    let sentByCampaign: Record<string, { sent: number; opened: number }> = {};
    let repliedByCampaign: Record<string, number> = {};

    if (allUsedCampaignIds.length) {
      const [sentRes, repliedRes] = await Promise.all([
        supabaseAdmin
          .from('sent_emails')
          .select('campaign_id, opened_at')
          .in('campaign_id', allUsedCampaignIds),
        supabaseAdmin
          .from('campaign_leads')
          .select('campaign_id')
          .in('campaign_id', allUsedCampaignIds)
          .eq('status', 'replied'),
      ]);

      (sentRes.data || []).forEach((s: { campaign_id: string; opened_at: string | null }) => {
        const r = sentByCampaign[s.campaign_id] || { sent: 0, opened: 0 };
        r.sent++;
        if (s.opened_at) r.opened++;
        sentByCampaign[s.campaign_id] = r;
      });

      (repliedRes.data || []).forEach((r: { campaign_id: string }) => {
        repliedByCampaign[r.campaign_id] = (repliedByCampaign[r.campaign_id] || 0) + 1;
      });
    }

    // Compute per-template stats
    const enriched = templates.map(t => {
      const usedCampaigns = Array.from(templateCampaigns[t.id] || new Set<string>());
      let totalSent = 0, totalOpened = 0, totalReplied = 0;
      usedCampaigns.forEach(cid => {
        const s = sentByCampaign[cid] || { sent: 0, opened: 0 };
        totalSent += s.sent;
        totalOpened += s.opened;
        totalReplied += repliedByCampaign[cid] || 0;
      });
      return {
        ...t,
        uses: templateUses[t.id] || 0,
        open_rate: totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) + '%' : null,
        reply_rate: totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) + '%' : null,
      };
    });

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('Templates GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { name, category, subject, body: emailBody, unsub_text, source_builtin_id } = body;

    const { data, error } = await supabaseAdmin
      .from('user_templates')
      .insert({
        user_id: user.id,
        name,
        category: category || 'Cold Outreach',
        subject: subject || '',
        body: emailBody || '',
        unsub_text: unsub_text || 'To unsubscribe, click here: {{unsubscribe_link}}\n{{company_address}}',
        source_builtin_id: source_builtin_id ?? null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    console.error('Templates POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

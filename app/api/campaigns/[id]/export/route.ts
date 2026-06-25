import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('id, name')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: rows } = await supabaseAdmin
    .from('sent_emails')
    .select('step_number, subject, sent_at, opened_at, clicked_at, ab_variant, lead:leads(email,first_name,last_name,company), campaign_lead:campaign_leads(status)')
    .eq('campaign_id', id)
    .order('sent_at', { ascending: true });

  const header = 'email,first_name,last_name,company,step,subject,sent_at,opened,clicked,status,variant';
  const csvRows = (rows || []).map((r: any) => {
    const lead = r.lead || {};
    const status = r.campaign_lead?.status || '';
    return [
      lead.email, lead.first_name, lead.last_name, lead.company,
      r.step_number + 1, r.subject,
      r.sent_at ? new Date(r.sent_at).toISOString() : '',
      r.opened_at ? 'Yes' : 'No',
      r.clicked_at ? 'Yes' : 'No',
      status,
      r.ab_variant || 'A',
    ].map(v => v == null ? '' : `"${String(v).replace(/"/g, '""')}"`).join(',');
  });

  const filename = campaign.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const csv = [header, ...csvRows].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}-results.csv"`,
    },
  });
}

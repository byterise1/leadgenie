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

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 25;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('campaigns')
    .select('id, user_id, name, status, total_sent, daily_limit, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);

  const { data: campaigns, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with sent/open/reply from sent_emails
  const ids = (campaigns ?? []).map(c => c.id);
  const [sentRes, openedRes, repliedRes, profilesRes] = await Promise.all([
    supabaseAdmin.from('sent_emails').select('campaign_id').in('campaign_id', ids),
    supabaseAdmin.from('sent_emails').select('campaign_id').in('campaign_id', ids).not('opened_at', 'is', null),
    supabaseAdmin.from('sent_emails').select('campaign_id').in('campaign_id', ids).not('replied_at', 'is', null),
    supabaseAdmin.from('profiles').select('id, full_name').in('id', [...new Set((campaigns ?? []).map(c => c.user_id))]),
  ]);

  const sentMap = new Map<string, number>();
  const openedMap = new Map<string, number>();
  const repliedMap = new Map<string, number>();
  const profileMap = new Map<string, string>();

  for (const r of sentRes.data ?? []) sentMap.set(r.campaign_id, (sentMap.get(r.campaign_id) ?? 0) + 1);
  for (const r of openedRes.data ?? []) openedMap.set(r.campaign_id, (openedMap.get(r.campaign_id) ?? 0) + 1);
  for (const r of repliedRes.data ?? []) repliedMap.set(r.campaign_id, (repliedMap.get(r.campaign_id) ?? 0) + 1);
  for (const p of profilesRes.data ?? []) profileMap.set(p.id, p.full_name || 'Unknown');

  const enriched = (campaigns ?? []).map(c => {
    const sent = sentMap.get(c.id) ?? 0;
    const opened = openedMap.get(c.id) ?? 0;
    const replied = repliedMap.get(c.id) ?? 0;
    return {
      ...c,
      sent,
      open_rate: sent > 0 ? `${Math.round((opened / sent) * 100)}%` : '0%',
      reply_rate: sent > 0 ? `${Math.round((replied / sent) * 100)}%` : '0%',
      user_name: profileMap.get(c.user_id) || 'Unknown',
    };
  });

  return NextResponse.json({ campaigns: enriched, total: count ?? 0, page, limit });
}

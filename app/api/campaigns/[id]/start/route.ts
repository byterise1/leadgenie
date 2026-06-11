import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { emailQueue } from '@/lib/queue';

const TZ_MAP: Record<string, string> = {
  'UTC': 'UTC',
  'US/Eastern (EST)': 'America/New_York',
  'US/Pacific (PST)': 'America/Los_Angeles',
  'Europe/London (GMT)': 'Europe/London',
  'Asia/Karachi (PKT)': 'Asia/Karachi',
  'Asia/Dubai (GST)': 'Asia/Dubai',
};

function parseHour(timeStr: string): number {
  const match = timeStr?.match(/^(\d+):\d+\s*(AM|PM)$/i);
  if (!match) return 9;
  let h = parseInt(match[1]);
  const ampm = match[2].toUpperCase();
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h;
}

function getTzOffsetMs(ianaZone: string): number {
  const now = new Date();
  const tzStr = now.toLocaleString('en-US', { timeZone: ianaZone });
  return new Date(tzStr).getTime() - now.getTime();
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

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

  const { data: campaignLeads } = await supabaseAdmin
    .from('campaign_leads')
    .select('id')
    .eq('campaign_id', id)
    .in('status', ['pending', 'active']);

  if (!campaignLeads?.length) {
    return NextResponse.json({ error: 'No leads enrolled in this campaign' }, { status: 400 });
  }

  await supabaseAdmin.from('campaigns').update({ status: 'active' }).eq('id', id);

  const fromH = parseHour(campaign.from_hour || '8:00 AM');
  const toH = parseHour(campaign.to_hour || '6:00 PM');
  const windowH = Math.max(1, toH - fromH);
  const windowMs = windowH * 60 * 60 * 1000;
  const dailyLimit = campaign.daily_limit || 50;
  const perEmailMs = Math.max(60000, Math.floor(windowMs / dailyLimit));

  const ianaZone = TZ_MAP[campaign.timezone] || 'UTC';
  const offsetMs = getTzOffsetMs(ianaZone);
  const nowUtc = Date.now();

  // Find start of today's sending window in UTC
  const localNow = new Date(nowUtc + offsetMs);
  const todayWindowStartUtc =
    Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate(), fromH) - offsetMs;
  const todayWindowEndUtc = todayWindowStartUtc + windowMs;

  let windowStartUtcMs: number;
  if (nowUtc < todayWindowStartUtc) {
    windowStartUtcMs = todayWindowStartUtc;
  } else if (nowUtc < todayWindowEndUtc) {
    windowStartUtcMs = nowUtc;
  } else {
    windowStartUtcMs = todayWindowStartUtc + 24 * 60 * 60 * 1000;
  }

  const jobs = campaignLeads.map((cl, i) => {
    const dayOffset = Math.floor(i / dailyLimit) * 24 * 60 * 60 * 1000;
    const withinDay = (i % dailyLimit) * perEmailMs;
    const sendAt = windowStartUtcMs + dayOffset + withinDay;
    return {
      name: 'send',
      data: { campaignLeadId: cl.id, stepNumber: 0 },
      opts: {
        delay: Math.max(0, sendAt - Date.now()),
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 60000 },
      },
    };
  });

  await emailQueue.addBulk(jobs);

  return NextResponse.json({ success: true, queued: campaignLeads.length });
}

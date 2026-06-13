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

// Returns total minutes from midnight.
// Accepts "08:30" (24h), "8:30 AM" / "6:00 PM" (legacy), or plain number.
function parseTimeToMinutes(timeStr: string | number | null | undefined): number {
  if (!timeStr) return 9 * 60;
  const s = String(timeStr);

  // "HH:MM" 24h format (new default)
  const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) return parseInt(m24[1]) * 60 + parseInt(m24[2]);

  // "H:MM AM/PM" legacy format
  const m12 = s.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (m12) {
    let h = parseInt(m12[1]);
    const mins = parseInt(m12[2]);
    const ampm = m12[3].toUpperCase();
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + mins;
  }

  // Plain integer → treat as hour
  if (/^\d+$/.test(s)) return parseInt(s) * 60;
  return 9 * 60;
}

function getTzOffsetMs(ianaZone: string): number {
  const now = Date.now();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ianaZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(now));
  const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value ?? '0');
  const tzDate = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  return tzDate - now;
}

// 0=Monday … 6=Sunday (matches active_days array from UI)
function getActiveDayIndex(ms: number, zone: string): number {
  const dayName = new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'long' }).format(new Date(ms));
  const map: Record<string, number> = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };
  return map[dayName] ?? 0;
}

// Advance ms forward until it lands on an active day
function nextActiveDay(ms: number, activeDays: boolean[], zone: string): number {
  let t = ms;
  for (let i = 0; i < 7; i++) {
    if (activeDays[getActiveDayIndex(t, zone)]) return t;
    t += 24 * 60 * 60 * 1000;
  }
  return ms; // fallback: all days disabled, return as-is
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

  // Verify email steps exist
  const { data: emailSteps } = await supabaseAdmin
    .from('email_steps').select('id').eq('campaign_id', id).limit(1);
  if (!emailSteps?.length) {
    return NextResponse.json({ error: 'This campaign has no email steps. Please delete it and create a new one.' }, { status: 400 });
  }

  // Auto-enroll leads from the linked list (upsert so re-launching is safe)
  if (campaign.list_id) {
    const { data: members } = await supabaseAdmin
      .from('lead_list_members')
      .select('lead_id, lead:leads(status)')
      .eq('list_id', campaign.list_id);

    if (members?.length) {
      const enrollRows = members
        .filter((m: any) => m.lead?.status !== 'unsubscribed')
        .map((m: any) => ({
          campaign_id: id,
          lead_id: m.lead_id,
          status: 'pending',
        }));
      if (enrollRows.length) {
        await supabaseAdmin
          .from('campaign_leads')
          .upsert(enrollRows, { onConflict: 'campaign_id,lead_id', ignoreDuplicates: true });
      }
    }
  }

  const { data: campaignLeads } = await supabaseAdmin
    .from('campaign_leads')
    .select('id')
    .eq('campaign_id', id)
    .in('status', ['pending', 'active']);

  if (!campaignLeads?.length) {
    if (campaign.list_id) {
      return NextResponse.json({ error: 'The selected lead list is empty. Add leads to the list first.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'No leads enrolled in this campaign' }, { status: 400 });
  }

  await supabaseAdmin.from('campaigns').update({ status: 'active' }).eq('id', id);

  // ── Sending window ──
  const fromMins = parseTimeToMinutes(campaign.from_hour || '08:00');
  const toMins = parseTimeToMinutes(campaign.to_hour || '18:00');
  const windowMins = Math.max(5, toMins - fromMins); // min 5-minute window as safety floor
  const windowMs = windowMins * 60 * 1000;

  const dailyLimit = Math.max(1, campaign.daily_limit || 50);
  const minDelayMs = Math.max(10_000, (campaign.min_delay_secs || 60) * 1000);
  const maxDelayMs = Math.max(minDelayMs + 1000, (campaign.max_delay_secs || 300) * 1000);

  const ianaZone = TZ_MAP[campaign.timezone] || 'UTC';
  const activeDays: boolean[] = Array.isArray(campaign.active_days)
    ? campaign.active_days
    : [true, true, true, true, true, false, false]; // Mon-Fri default

  const offsetMs = getTzOffsetMs(ianaZone);
  const nowUtc = Date.now();

  // Start of today's sending window in UTC
  const localNow = new Date(nowUtc + offsetMs);
  const fromH = Math.floor(fromMins / 60);
  const fromMin = fromMins % 60;
  const todayWindowStartUtc =
    Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate(), fromH, fromMin) - offsetMs;
  const todayWindowEndUtc = todayWindowStartUtc + windowMs;

  // If we're past today's window, start from tomorrow; then snap to next active day
  let dayWindowStartUtc: number;
  if (nowUtc < todayWindowStartUtc) {
    dayWindowStartUtc = nextActiveDay(todayWindowStartUtc, activeDays, ianaZone);
  } else if (nowUtc < todayWindowEndUtc) {
    // Mid-window — only use today if it's an active day, else tomorrow
    if (activeDays[getActiveDayIndex(nowUtc, ianaZone)]) {
      dayWindowStartUtc = nowUtc;
    } else {
      dayWindowStartUtc = nextActiveDay(todayWindowStartUtc + 24 * 60 * 60 * 1000, activeDays, ianaZone);
    }
  } else {
    dayWindowStartUtc = nextActiveDay(todayWindowStartUtc + 24 * 60 * 60 * 1000, activeDays, ianaZone);
  }

  // ── Schedule with random delays, respecting daily limit, window, and active days ──
  const numAccounts = campaign.campaign_accounts.length;
  let cursor = dayWindowStartUtc;
  let dayStart = dayWindowStartUtc;
  let dayEnd = dayStart + windowMs;
  let emailsThisDay = 0;

  const jobs = campaignLeads.map((cl, i) => {
    // Roll to next active day if we've hit the limit or passed the window
    if (emailsThisDay >= dailyLimit || cursor >= dayEnd) {
      const nextDay = nextActiveDay(dayStart + 24 * 60 * 60 * 1000, activeDays, ianaZone);
      dayStart = nextDay;
      dayEnd = dayStart + windowMs;
      cursor = dayStart;
      emailsThisDay = 0;
    }

    const sendAt = cursor;
    const randomGap = minDelayMs + Math.floor(Math.random() * (maxDelayMs - minDelayMs));
    cursor += randomGap;
    emailsThisDay++;

    return {
      name: 'send',
      data: {
        campaignLeadId: cl.id,
        stepNumber: 0,
        accountIndex: i % numAccounts, // Round-robin across accounts
      },
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

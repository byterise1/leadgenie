import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { emailQueue } from '@/lib/queue';
import { checkRateLimit } from '@/lib/rate-limit';
import { detectProvider, campaignDailyCap } from '@/lib/warmup-health';

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

  const rate = await checkRateLimit(user.id, 'campaign_start');
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many campaign starts in a short time — please wait a bit and try again.' }, { status: 429 });
  }

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

  // Warmup safety gate — block launch if every linked account is currently unsafe
  // (paused for bounce/spam issues, or health so low it would just burn the mailbox).
  const accountIds = campaign.campaign_accounts.map((ca: any) => ca.account_id);
  let linkedAccounts: Record<string, any>[] | null;
  {
    const res = await supabaseAdmin
      .from('email_accounts')
      .select('id, email, type, smtp_host, health_score, warmup_day, warmup_enabled, warmup_paused, warmup_pause_reason')
      .in('id', accountIds);
    linkedAccounts = res.data;
  }

  // Phase 1 migration not run yet — fall back so the health/cap safety check still works
  // even without the warmup_paused column.
  if (!linkedAccounts) {
    const fallback = await supabaseAdmin
      .from('email_accounts')
      .select('id, email, type, smtp_host, health_score, warmup_day, warmup_enabled')
      .in('id', accountIds);
    linkedAccounts = fallback.data;
  }

  const accountWarnings: string[] = [];
  const safeAccounts = (linkedAccounts || []).filter(a => {
    if (a.warmup_paused) {
      accountWarnings.push(`${a.email} is paused (${a.warmup_pause_reason || 'reputation issue'}) — excluded until it recovers.`);
      return false;
    }
    if ((a.health_score ?? 50) < 35) {
      accountWarnings.push(`${a.email} health is too low (${a.health_score}%) to send safely — excluded.`);
      return false;
    }
    const cap = campaignDailyCap({
      provider: detectProvider(a as any), warmupDay: a.warmup_day ?? 0, health: a.health_score ?? 50, warmupComplete: !a.warmup_enabled,
    });
    if (cap === 0) {
      accountWarnings.push(`${a.email} isn't cleared to send real campaigns yet — excluded.`);
      return false;
    }
    return true;
  });

  if ((linkedAccounts?.length ?? 0) > 0 && safeAccounts.length === 0) {
    return NextResponse.json({
      error: `None of this campaign's sending accounts are safe to send from right now: ${accountWarnings.join(' ')}`,
    }, { status: 400 });
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

  const [{ data: campaignLeads }, { data: stepsData }] = await Promise.all([
    supabaseAdmin
      .from('campaign_leads')
      .select('id, status, current_step, last_sent_at')
      .eq('campaign_id', id)
      .in('status', ['pending', 'active']),
    supabaseAdmin
      .from('email_steps')
      .select('step_number, delay_days')
      .eq('campaign_id', id)
      .order('step_number'),
  ]);
  // delay_days per step: step N fires (delay_days[N] * DELAY_UNIT_MS) after step N-1
  const stepDelayDays: Record<number, number> = {};
  (stepsData || []).forEach((s: any) => { stepDelayDays[s.step_number] = s.delay_days ?? 1; });
  // TEST MODE: 60s per "day". Change to 24*60*60*1000 for production.
  const DELAY_UNIT_MS = 60 * 1_000;

  if (!campaignLeads?.length) {
    if (campaign.list_id) {
      return NextResponse.json({ error: 'The selected lead list is empty. Add leads to the list first.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'No leads enrolled in this campaign' }, { status: 400 });
  }

  // Only reset stats when starting fresh from draft, not on resume
  const statsReset = campaign.status === 'draft' ? { total_sent: 0, total_opened: 0, total_replied: 0 } : {};
  const { error: updateErr } = await supabaseAdmin
    .from('campaigns')
    .update({ status: 'active', ...statsReset })
    .eq('id', id);
  if (updateErr) {
    console.error('[start] campaign update failed:', updateErr.message);
    return NextResponse.json({ error: `Could not activate campaign: ${updateErr.message}` }, { status: 500 });
  }

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

  // Seed emailsThisDay with step-0 sends already recorded today so repeated
  // Resume clicks don't re-fill today's slot and bypass the daily limit.
  const todayMidnightUtc = new Date();
  todayMidnightUtc.setUTCHours(0, 0, 0, 0);
  const { count: alreadySentToday } = await supabaseAdmin
    .from('sent_emails')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', id)
    .eq('step_number', 0)
    .gte('sent_at', todayMidnightUtc.toISOString());
  let emailsThisDay = alreadySentToday ?? 0;

  // Separate cursor for follow-up (active) leads so their 2–6 min gaps
  // don't interfere with the step-0 daily-limit window cursor.
  let followupCursor = Date.now() + 5_000;

  const jobs = campaignLeads.map((cl: any) => {
    const targetStep: number = cl.status === 'active' ? (cl.current_step ?? 1) : 0;
    let sendAt: number;

    if (targetStep === 0) {
      // Roll to next active day if we've hit the limit or passed the window
      if (emailsThisDay >= dailyLimit || cursor >= dayEnd) {
        const nextDay = nextActiveDay(dayStart + 24 * 60 * 60 * 1000, activeDays, ianaZone);
        dayStart = nextDay;
        dayEnd = dayStart + windowMs;
        cursor = dayStart;
        emailsThisDay = 0;
      }
      sendAt = cursor;
      const randomGap = minDelayMs + Math.floor(Math.random() * (maxDelayMs - minDelayMs));
      cursor += randomGap;
      emailsThisDay++;
    } else {
      // Active lead resuming: earliest it can send = last_sent_at + step delay.
      // If that time is past (paused a long time), apply the same 2–6 min gap
      // between leads so they don't all blast out at once.
      const lastSentMs = cl.last_sent_at ? new Date(cl.last_sent_at).getTime() : Date.now();
      const delayDays = stepDelayDays[targetStep] ?? 1;
      const stepDue = lastSentMs + delayDays * DELAY_UNIT_MS;
      // followupCursor ensures at least 2–6 min between each follow-up on resume
      followupCursor = Math.max(followupCursor, stepDue);
      sendAt = followupCursor;
      const randomGap = minDelayMs + Math.floor(Math.random() * (maxDelayMs - minDelayMs));
      followupCursor += randomGap;
    }

    return {
      name: 'send',
      data: {
        campaignLeadId: cl.id,
        stepNumber: targetStep,
        accountIndex: Math.floor(Math.random() * numAccounts),
      },
      opts: {
        delay: Math.max(0, sendAt - Date.now()),
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 60000 },
      },
    };
  });

  try {
    await emailQueue.addBulk(jobs);
  } catch (err: any) {
    console.error('[start] queue error:', err?.message);
    return NextResponse.json({ error: `Queue error: ${err?.message || 'Redis unavailable'}` }, { status: 500 });
  }

  return NextResponse.json({
    success: true, status: 'active', queued: campaignLeads.length,
    ...(accountWarnings.length ? { warnings: accountWarnings } : {}),
  });
}

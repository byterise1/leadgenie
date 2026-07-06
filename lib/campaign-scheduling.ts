// Shared scheduling helpers for the campaign Smart Priority Engine.
// Used by both the campaign start route (account/window validation) and the
// recurring campaign-scheduler worker (instrumentation.ts).

export const TZ_MAP: Record<string, string> = {
  'UTC': 'UTC',
  'US/Eastern (EST)': 'America/New_York',
  'US/Pacific (PST)': 'America/Los_Angeles',
  'Europe/London (GMT)': 'Europe/London',
  'Asia/Karachi (PKT)': 'Asia/Karachi',
  'Asia/Dubai (GST)': 'Asia/Dubai',
};

// Returns total minutes from midnight.
// Accepts "08:30" (24h), "8:30 AM" / "6:00 PM" (legacy), or plain number.
export function parseTimeToMinutes(timeStr: string | number | null | undefined): number {
  if (!timeStr) return 9 * 60;
  const s = String(timeStr);

  const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) return parseInt(m24[1]) * 60 + parseInt(m24[2]);

  const m12 = s.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (m12) {
    let h = parseInt(m12[1]);
    const mins = parseInt(m12[2]);
    const ampm = m12[3].toUpperCase();
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + mins;
  }

  if (/^\d+$/.test(s)) return parseInt(s) * 60;
  return 9 * 60;
}

function getLocalMinutes(ms: number, zone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, hour: 'numeric', minute: 'numeric', hour12: false,
  }).formatToParts(new Date(ms));
  const h = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0') % 24;
  const m = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0');
  return h * 60 + m;
}

// 0=Monday … 6=Sunday (matches active_days array from the UI)
export function getActiveDayIndex(ms: number, zone: string): number {
  const dayName = new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'long' }).format(new Date(ms));
  const map: Record<string, number> = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };
  return map[dayName] ?? 0;
}

// Advance ms forward until it lands on an active day
export function nextActiveDay(ms: number, activeDays: boolean[], zone: string): number {
  let t = ms;
  for (let i = 0; i < 7; i++) {
    if (activeDays[getActiveDayIndex(t, zone)]) return t;
    t += 24 * 60 * 60 * 1000;
  }
  return ms; // fallback: all days disabled, return as-is
}

export type CampaignWindow = {
  from_hour?: string | number | null;
  to_hour?: string | number | null;
  timezone?: string | null;
  active_days?: unknown;
};

// Is `nowMs` inside this campaign's configured sending window, on one of its
// active days, in its own timezone? The scheduler skips a campaign entirely
// this cycle if this is false — nothing gets sent outside the owner's chosen hours.
export function isWithinSendingWindow(campaign: CampaignWindow, nowMs = Date.now()): boolean {
  const ianaZone = TZ_MAP[campaign.timezone || 'UTC'] || 'UTC';
  const activeDays: boolean[] = Array.isArray(campaign.active_days)
    ? campaign.active_days as boolean[]
    : [true, true, true, true, true, false, false];
  if (!activeDays[getActiveDayIndex(nowMs, ianaZone)]) return false;

  const fromMins = parseTimeToMinutes(campaign.from_hour ?? '08:00');
  const toMins = parseTimeToMinutes(campaign.to_hour ?? '18:00');
  const windowMins = Math.max(5, toMins - fromMins);
  const localMins = getLocalMinutes(nowMs, ianaZone);
  return localMins >= fromMins && localMins < fromMins + windowMins;
}

export type PriorityMode = 'auto' | 'manual';

// Auto mode: heavier follow-up backlog relative to today's capacity means a
// lower new-lead share. Manual mode: use the campaign's own stored weight.
// Thresholds are intentionally simple and named here so they're easy to find
// and retune later — not meant to be the final word on the formula.
export function computeFollowupWeightPct(opts: {
  mode: PriorityMode;
  manualWeightPct?: number | null;
  dueFollowupCount: number;
  remainingCapacity: number;
}): number {
  const { mode, manualWeightPct, dueFollowupCount, remainingCapacity } = opts;
  if (mode === 'manual') {
    const v = manualWeightPct ?? 90;
    return Math.max(0, Math.min(100, v));
  }
  if (remainingCapacity <= 0) return 90;
  const loadRatio = dueFollowupCount / remainingCapacity;
  if (loadRatio >= 0.9) return 90; // heavy follow-up load -> new leads get ~10%
  if (loadRatio >= 0.5) return 65; // medium load -> new leads get ~35%
  return 40;                        // light load -> new leads get ~60%
}

// Splits today's remaining capacity between due follow-ups and new leads.
// Follow-ups get first claim, up to their weighted share of capacity (or
// however many are actually due, if that's fewer) — anything left over flows
// to new leads, so capacity is never wasted at either end of the weight range.
// This is also what makes "Strict" (weight=100) behave correctly without a
// separate code path: if follow-ups don't use the whole 100%, the remainder
// still reaches new leads instead of being thrown away.
export function allocateCapacity<F, N>(opts: {
  followupsDue: F[];
  newLeads: N[];
  remainingCapacity: number;
  followupWeightPct: number;
}): { followupsToSend: F[]; newToSend: N[] } {
  const { followupsDue, newLeads, remainingCapacity, followupWeightPct } = opts;
  if (remainingCapacity <= 0) return { followupsToSend: [], newToSend: [] };

  const followupBudget = Math.floor(remainingCapacity * followupWeightPct / 100);
  const followupsToSend = followupsDue.slice(0, Math.min(followupsDue.length, followupBudget));
  const leftover = Math.max(0, remainingCapacity - followupsToSend.length);
  const newToSend = newLeads.slice(0, Math.min(newLeads.length, leftover));
  return { followupsToSend, newToSend };
}

// ±30–90 minutes of jitter so a lead's follow-ups don't land at the exact
// same clock time every day.
export function jitterMs(): number {
  const sign = Math.random() < 0.5 ? -1 : 1;
  return sign * (30 + Math.random() * 60) * 60 * 1000;
}

// TESTING: 1 unit = 1 minute. Change to 24*60*60*1000 before production launch.
// Shared by the start route (backfilling next_send_at on resume) and the
// campaign-scheduler worker (computing the next follow-up's due time).
export const DELAY_UNIT_MS = 60 * 1_000;

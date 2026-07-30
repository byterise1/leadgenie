import { supabaseAdmin } from '@/lib/supabase/admin';

export const RATE_LIMITS = {
  campaign_start: { limit: 20, windowMs: 60 * 60 * 1000 },       // 20 campaign starts/hour/user
  email_account_add: { limit: 10, windowMs: 60 * 60 * 1000 },    // 10 new mailboxes/hour/user (single-add path)
  // Bulk onboarding (many real mailboxes, one legitimate business action) needs
  // real headroom — each entry is still credential-verified before it counts,
  // so this isn't an abuse-vector the way an uncapped single-add would be.
  email_account_bulk_add: { limit: 100, windowMs: 60 * 60 * 1000 },
  warmup_toggle: { limit: 40, windowMs: 60 * 60 * 1000 },        // 40 warmup PATCHes/hour/user
} as const;

export type RateLimitAction = keyof typeof RATE_LIMITS;

// Read-only sliding-window check backed by rate_limit_log — does NOT log a hit.
// Call this before doing the gated work; call recordRateLimitHit() only after
// that work actually succeeds. Splitting these two used to be one combined
// call that logged a hit for every ATTEMPT regardless of outcome, so retries,
// duplicate-email rejections, and validation failures all silently burned the
// same budget as a real success — a user working through a long manual list
// could get locked out after 10 attempts having only added 1 real mailbox.
// Fails open (allows the request) if the table/columns aren't there yet —
// this is abuse protection, not a hard dependency the app should break on.
export async function checkRateLimit(userId: string, action: RateLimitAction): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const { limit, windowMs } = RATE_LIMITS[action];
  const since = new Date(Date.now() - windowMs).toISOString();

  const { count, error } = await supabaseAdmin
    .from('rate_limit_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', action)
    .gte('created_at', since);

  if (error) {
    console.error(`[rate-limit] check failed for ${action}:`, error.message);
    return { allowed: true, retryAfterMs: 0 };
  }

  if ((count ?? 0) >= limit) {
    return { allowed: false, retryAfterMs: windowMs };
  }
  return { allowed: true, retryAfterMs: 0 };
}

// Logs one real hit against the budget. Call only once the gated action has
// actually succeeded (not on validation/duplicate/permission failures).
export async function recordRateLimitHit(userId: string, action: RateLimitAction): Promise<void> {
  try {
    await supabaseAdmin.from('rate_limit_log').insert({ user_id: userId, action });
  } catch (e) {
    console.error(`[rate-limit] record failed for ${action}:`, e instanceof Error ? e.message : e);
  }
}

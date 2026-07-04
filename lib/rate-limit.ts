import { supabaseAdmin } from '@/lib/supabase/admin';

export const RATE_LIMITS = {
  campaign_start: { limit: 20, windowMs: 60 * 60 * 1000 },       // 20 campaign starts/hour/user
  email_account_add: { limit: 10, windowMs: 60 * 60 * 1000 },    // 10 new mailboxes/hour/user
  warmup_toggle: { limit: 40, windowMs: 60 * 60 * 1000 },        // 40 warmup PATCHes/hour/user
} as const;

export type RateLimitAction = keyof typeof RATE_LIMITS;

// Sliding-window check backed by rate_limit_log. Fails open (allows the request)
// if the table/columns aren't there yet — this is abuse protection, not a hard
// dependency the app should break on if the migration hasn't been run yet.
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

  await supabaseAdmin.from('rate_limit_log').insert({ user_id: userId, action });
  return { allowed: true, retryAfterMs: 0 };
}

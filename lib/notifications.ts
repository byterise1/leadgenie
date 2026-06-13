import { supabaseAdmin } from '@/lib/supabase/admin';

export async function createNotification(
  userId: string,
  message: string,
  type: 'info' | 'warning' | 'error' = 'info',
  link?: string,
) {
  const payload: Record<string, unknown> = { user_id: userId, message, type };
  if (link) payload.link = link;

  const { error } = await supabaseAdmin.from('notifications').insert(payload);
  if (error) console.error('[notifications] insert failed:', error.message, payload);
}

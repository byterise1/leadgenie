import { supabaseAdmin } from '@/lib/supabase/admin';

export async function createNotification(
  userId: string,
  message: string,
  type: 'info' | 'warning' | 'error' = 'info'
) {
  try {
    await supabaseAdmin.from('notifications').insert({ user_id: userId, message, type });
  } catch {}
}

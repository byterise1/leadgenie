import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Mark all open/in_progress tickets that don't have pending user messages as seen
  const now = new Date().toISOString();
  const { data: tickets } = await supabaseAdmin
    .from('support_tickets')
    .select('id, admin_seen_at, messages, updated_at')
    .in('status', ['open', 'in_progress']);

  const toMark = (tickets || []).filter(t => {
    if (!t.admin_seen_at) return true;
    return false; // only mark ones never seen — preserve seen_at for ones with new user replies
  }).map(t => t.id);

  if (toMark.length > 0) {
    await supabaseAdmin
      .from('support_tickets')
      .update({ admin_seen_at: now })
      .in('id', toMark);
  }

  return NextResponse.json({ ok: true, marked: toMark.length });
}

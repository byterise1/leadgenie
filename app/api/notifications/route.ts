import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get('unread') === '1';

  let query = supabaseAdmin
    .from('notifications')
    .select('id,message,type,read,link,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (unreadOnly) {
    query = query.eq('read', false) as typeof query;
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('Notifications GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: mark notifications as read (all unread, or specific IDs)
export async function PATCH(req: NextRequest) {
  try {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { ids } = body as { ids?: string[] };

  let query = supabaseAdmin
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id);

  if (ids?.length) {
    query = query.in('id', ids) as typeof query;
  } else {
    query = query.eq('read', false) as typeof query;
  }

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Notifications PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

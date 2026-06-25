import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single();
  return profile?.is_admin ? user : null;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || '';

  // Fast count for admin sidebar badge: ?count=1
  // Counts tickets admin hasn't seen yet OR where user sent a follow-up since admin last viewed
  if (searchParams.get('count') === '1') {
    const { data: open } = await supabaseAdmin
      .from('support_tickets')
      .select('id, admin_seen_at, updated_at, messages')
      .in('status', ['open', 'in_progress']);
    const count = (open || []).filter(t => {
      // Never seen by admin
      if (!t.admin_seen_at) return true;
      // New user activity after admin last viewed
      if (new Date(t.updated_at) > new Date(t.admin_seen_at)) {
        const msgs = Array.isArray(t.messages) ? t.messages : [];
        return msgs.length > 0 && msgs[msgs.length - 1]?.role === 'user';
      }
      return false;
    }).length;
    return NextResponse.json({ unread: count });
  }

  let query = supabaseAdmin
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, status, priority, admin_reply, new_reply } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { data: existing } = await supabaseAdmin
    .from('support_tickets')
    .select('user_email, subject, admin_reply, user_id, messages')
    .eq('id', id)
    .single();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status !== undefined) updates.status = status;
  if (priority !== undefined) updates.priority = priority;

  // new_reply: always appends a fresh admin message to the thread and always notifies user
  if (new_reply?.trim()) {
    const existingMsgs = Array.isArray(existing?.messages) ? existing.messages : [];
    updates.messages = [
      ...existingMsgs,
      { role: 'admin', body: new_reply.trim(), ts: new Date().toISOString() },
    ];
    updates.admin_reply = new_reply.trim();
    updates.user_seen_at = null;

    if (existing?.user_id) {
      supabaseAdmin.from('notifications').insert({
        user_id: existing.user_id,
        message: `Support reply: your ticket "${existing.subject}" has been updated`,
        type: 'info',
        read: false,
        link: `/dashboard/support/${id}`,
      }).then(({ error }) => { if (error) console.error('Notification insert failed:', error.message); });
    }
  } else if (admin_reply !== undefined) {
    // Legacy path: editing admin_reply field directly
    updates.admin_reply = admin_reply;
    if (admin_reply && admin_reply !== existing?.admin_reply) {
      const existingMsgs = Array.isArray(existing?.messages) ? existing.messages : [];
      updates.messages = [
        ...existingMsgs,
        { role: 'admin', body: admin_reply, ts: new Date().toISOString() },
      ];
      updates.user_seen_at = null;
      if (existing?.user_id) {
        supabaseAdmin.from('notifications').insert({
          user_id: existing.user_id,
          message: `Support reply: your ticket "${existing.subject}" has been answered`,
          type: 'info',
          read: false,
          link: `/dashboard/support/${id}`,
        }).then(({ error }) => { if (error) console.error('Notification insert failed:', error.message); });
      }
    }
  }

  const { data, error } = await supabaseAdmin
    .from('support_tickets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

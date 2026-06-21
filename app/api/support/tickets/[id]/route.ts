import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('support_tickets')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Verify ticket belongs to this user
  const { data: ticket } = await supabaseAdmin
    .from('support_tickets')
    .select('id, messages, subject, status, attachments')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  // Mark as seen (user opened ticket with admin reply)
  if (body.mark_seen) {
    updates.user_seen_at = new Date().toISOString();
    // Also mark the corresponding bell notification as read
    void supabaseAdmin.from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('link', `/dashboard/support/${id}`)
      .eq('read', false);
  }

  // User sending a follow-up message (attachments are stored inside the message object)
  if (body.follow_up) {
    const existing = Array.isArray(ticket.messages) ? ticket.messages : [];
    const newMsg: Record<string, unknown> = {
      role: 'user',
      body: body.follow_up,
      ts: new Date().toISOString(),
    };
    if (Array.isArray(body.attachments) && body.attachments.length) {
      newMsg.attachments = body.attachments;
    }
    updates.messages = [...existing, newMsg];
    // Reopen ticket if it was closed
    if (ticket.status === 'closed') updates.status = 'open';

    // Notify all admins about the follow-up
    const { data: admins } = await supabaseAdmin.from('profiles').select('id').eq('is_admin', true);
    if (admins?.length) {
      void supabaseAdmin.from('notifications').insert(
        admins.map(a => ({
          user_id: a.id,
          message: `User replied on ticket: "${ticket.subject}"`,
          type: 'info',
          read: false,
          link: `/admin/support/${id}`,
        }))
      );
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

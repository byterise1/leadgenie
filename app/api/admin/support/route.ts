import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import nodemailer from 'nodemailer';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single();
  return profile?.is_admin ? user : null;
}

async function sendUserReplyEmail(userEmail: string, subject: string, adminReply: string) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: `"LeadGenie Support" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject: `Re: ${subject}`,
      text: `Hi,\n\nWe've replied to your support ticket.\n\n${adminReply}\n\n— LeadGenie Support`,
      html: `<p>Hi,</p><p>We've replied to your support ticket.</p><hr/><p>${adminReply.replace(/\n/g, '<br/>')}</p><p>— LeadGenie Support</p>`,
    });
  } catch {
    // Non-fatal
  }
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || '';

  let query = supabaseAdmin
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, status, priority, admin_reply } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  // Fetch ticket before update so we have user_email and subject
  const { data: existing } = await supabaseAdmin
    .from('support_tickets')
    .select('user_email, subject, admin_reply')
    .eq('id', id)
    .single();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status !== undefined) updates.status = status;
  if (priority !== undefined) updates.priority = priority;
  if (admin_reply !== undefined) updates.admin_reply = admin_reply;

  const { data, error } = await supabaseAdmin
    .from('support_tickets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Email user when admin sets (or changes) a reply
  if (admin_reply && existing?.user_email && admin_reply !== existing.admin_reply) {
    sendUserReplyEmail(existing.user_email, existing.subject, admin_reply);
  }

  return NextResponse.json(data);
}

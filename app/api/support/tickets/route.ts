import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import nodemailer from 'nodemailer';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'byterisellc@gmail.com';

async function sendAdminEmail(ticket: {
  user_email: string;
  subject: string;
  message: string;
  category: string;
  id: string;
}) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: `"LeadGenie Support" <${process.env.SMTP_USER}>`,
      to: ADMIN_EMAIL,
      subject: `[Support] ${ticket.subject}`,
      text: `New support ticket from ${ticket.user_email}\n\nCategory: ${ticket.category}\nSubject: ${ticket.subject}\n\n${ticket.message}\n\nTicket ID: ${ticket.id}`,
      html: `<p><strong>From:</strong> ${ticket.user_email}</p><p><strong>Category:</strong> ${ticket.category}</p><p><strong>Subject:</strong> ${ticket.subject}</p><hr/><p>${ticket.message.replace(/\n/g, '<br/>')}</p><p style="color:#999;font-size:12px">Ticket ID: ${ticket.id}</p>`,
    });
  } catch {
    // Non-fatal — ticket is saved, email is best-effort
  }
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('support_tickets')
    .select('id, subject, category, status, priority, admin_reply, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { subject, message, category } = await req.json();
  if (!subject || !message) return NextResponse.json({ error: 'Subject and message required' }, { status: 400 });

  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id);
  const userEmail = authUser.user?.email ?? '';

  const { data, error } = await supabaseAdmin
    .from('support_tickets')
    .insert({
      user_id: user.id,
      user_email: userEmail,
      subject,
      message,
      category: category || 'general',
      status: 'open',
      priority: 'normal',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fire-and-forget email to admin
  sendAdminEmail({ user_email: userEmail, subject, message, category: category || 'general', id: data.id });

  return NextResponse.json(data);
}

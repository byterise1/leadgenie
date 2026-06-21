import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

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
  return NextResponse.json(data);
}

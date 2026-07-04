import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get all emails the current user has ever connected
  const { data: accounts } = await supabaseAdmin
    .from('email_accounts')
    .select('id, email')
    .eq('user_id', user.id);

  if (!accounts || accounts.length === 0) return NextResponse.json([]);

  const emails = accounts.map(a => a.email);

  // Fetch warmup_history for those emails (includes prior-user history — keyed by email, not user_id)
  const { data: history, error } = await supabaseAdmin
    .from('warmup_history')
    .select('email, date, day_number, emails_sent, health_score, inbox_rate, spam_rate, bounce_rate, paused')
    .in('email', emails)
    .order('date', { ascending: false })
    .limit(1000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group by email
  const grouped: Record<string, typeof history> = {};
  for (const row of history ?? []) {
    if (!grouped[row.email]) grouped[row.email] = [];
    grouped[row.email].push(row);
  }

  return NextResponse.json(grouped);
}

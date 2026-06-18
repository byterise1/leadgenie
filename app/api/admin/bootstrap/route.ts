import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// One-time endpoint: grants admin to the calling user IF no admins exist yet.
// Safe to leave deployed — once an admin exists, anyone calling this just gets 403.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Check if any admin already exists
  const { count } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_admin', true);

  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: 'An admin already exists. Ask them to grant you access.' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ is_admin: true })
    .eq('id', user.id)
    .select('id, is_admin')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, message: 'You are now the admin. Visit /admin to get started.', ...data });
}

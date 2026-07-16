import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { refreshPostmasterToken, fetchPostmasterDomains } from '@/lib/postmaster';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: conn, error: connErr } = await supabaseAdmin
    .from('postmaster_connections')
    .select('google_email, refresh_token, connected_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (connErr) {
    // Table likely doesn't exist yet — migration 20260716_postmaster_tools.sql not run.
    return NextResponse.json({ connected: false, error: 'not_migrated' });
  }
  if (!conn) return NextResponse.json({ connected: false });

  try {
    const accessToken = await refreshPostmasterToken(conn.refresh_token);
    const domains = await fetchPostmasterDomains(accessToken);
    return NextResponse.json({ connected: true, googleEmail: conn.google_email, connectedAt: conn.connected_at, domains });
  } catch (err) {
    return NextResponse.json({
      connected: true,
      googleEmail: conn.google_email,
      connectedAt: conn.connected_at,
      domains: [],
      error: (err as Error).message,
    });
  }
}

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await supabaseAdmin.from('postmaster_connections').delete().eq('user_id', user.id);
  return NextResponse.json({ ok: true });
}

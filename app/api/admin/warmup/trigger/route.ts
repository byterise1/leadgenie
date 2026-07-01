import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { warmupQueue } from '@/lib/queue';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // manual:true bypasses the business-hours gate in the warmup worker
  await warmupQueue.add('warmup-manual', { manual: true }, { delay: 0 });

  return NextResponse.json({ ok: true, message: 'Warmup cycle triggered — check logs in ~30s' });
}

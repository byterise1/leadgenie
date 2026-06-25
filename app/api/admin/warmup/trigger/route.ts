import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { Queue } = await import('bullmq');
  const connection = { url: process.env.REDIS_URL! };
  const warmupQueue = new Queue('warmup', { connection });
  await warmupQueue.add('warmup-manual', {}, { delay: 0 });

  return NextResponse.json({ ok: true, message: 'Warmup cycle triggered — check logs in ~30s' });
}

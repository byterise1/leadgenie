import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const list_id = searchParams.get('list_id');

  let query = supabaseAdmin
    .from('lead_import_jobs')
    .select('id, status, progress, total_emails, filename, list_id, list_name, results, summary, created_at, completed_at')
    .eq('user_id', user.id)
    .neq('status', 'imported')
    .order('created_at', { ascending: false })
    .limit(10);

  if (list_id) query = query.eq('list_id', list_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ jobs: data || [] });
}

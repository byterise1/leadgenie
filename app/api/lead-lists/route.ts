import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: lists, error } = await supabaseAdmin
    .from('lead_lists')
    .select('id, name, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!lists?.length) return NextResponse.json([]);

  const { data: members } = await supabaseAdmin
    .from('lead_list_members')
    .select('list_id')
    .in('list_id', lists.map(l => l.id));

  const countMap = (members || []).reduce((acc: Record<string, number>, m: { list_id: string }) => {
    acc[m.list_id] = (acc[m.list_id] || 0) + 1;
    return acc;
  }, {});

  return NextResponse.json(lists.map(l => ({ ...l, count: countMap[l.id] || 0 })));
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  await supabaseAdmin.from('profiles').upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true });

  const { data, error } = await supabaseAdmin
    .from('lead_lists')
    .insert({ user_id: user.id, name: name.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ...data, count: 0 });
}

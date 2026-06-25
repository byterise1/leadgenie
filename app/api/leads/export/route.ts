import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const list_id = searchParams.get('list_id');

  let leadIds: string[] | null = null;
  let listName = 'all-leads';

  if (list_id) {
    const [members, listRow] = await Promise.all([
      supabaseAdmin.from('lead_list_members').select('lead_id').eq('list_id', list_id),
      supabaseAdmin.from('lead_lists').select('name').eq('id', list_id).eq('user_id', user.id).single(),
    ]);
    if (!listRow.data) return NextResponse.json({ error: 'List not found' }, { status: 404 });
    leadIds = (members.data || []).map((m: { lead_id: string }) => m.lead_id);
    listName = listRow.data.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    if (!leadIds.length) {
      return new NextResponse('email,first_name,last_name,company,title,website,phone,status,created_at\n', {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${listName}.csv"`,
        },
      });
    }
  }

  let query = supabaseAdmin
    .from('leads')
    .select('email,first_name,last_name,company,title,website,phone,status,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (leadIds) query = query.in('id', leadIds);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const header = 'email,first_name,last_name,company,title,website,phone,status,created_at';
  const rows = (data || []).map((l: any) =>
    [l.email, l.first_name, l.last_name, l.company, l.title, l.website, l.phone, l.status, l.created_at]
      .map(v => v == null ? '' : `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );

  const csv = [header, ...rows].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${listName}.csv"`,
    },
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import Papa from 'papaparse';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const campaign_id = formData.get('campaign_id') as string | null;

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const text = await file.text();

  const { data: rows, errors } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim().toLowerCase().replace(/\s+/g, '_'),
  });

  if (errors.length && !rows.length) {
    return NextResponse.json({ error: 'Could not parse CSV' }, { status: 400 });
  }

  const leads = rows
    .filter(r => r.email)
    .map(r => ({
      user_id: user.id,
      email: r.email?.trim(),
      first_name: r.first_name || r.firstname || r.first || null,
      last_name: r.last_name || r.lastname || r.last || null,
      company: r.company || r.company_name || null,
      title: r.title || r.job_title || r.position || null,
      website: r.website || r.domain || null,
      linkedin: r.linkedin || r.linkedin_url || null,
      phone: r.phone || r.phone_number || null,
    }));

  if (!leads.length) return NextResponse.json({ error: 'No valid leads found' }, { status: 400 });

  const { data: inserted, error } = await supabaseAdmin
    .from('leads')
    .upsert(leads, { onConflict: 'email,user_id', ignoreDuplicates: true })
    .select('id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enroll in campaign if provided
  if (campaign_id && inserted?.length) {
    const enrollRows = inserted.map(l => ({
      campaign_id,
      lead_id: l.id,
      status: 'pending',
    }));
    await supabaseAdmin
      .from('campaign_leads')
      .upsert(enrollRows, { onConflict: 'campaign_id,lead_id', ignoreDuplicates: true });
  }

  return NextResponse.json({ imported: leads.length, enrolled: inserted?.length || 0 });
}

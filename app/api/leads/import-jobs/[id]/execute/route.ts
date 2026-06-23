import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { EmailResult } from '@/lib/score-engine';
import { IMPORTABLE_DECISIONS } from '@/lib/score-engine';

interface ExecuteBody {
  include_caution: boolean;
  include_cross_list: boolean;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { include_caution, include_cross_list }: ExecuteBody = await req.json();

  // Load job
  const { data: job, error: jobErr } = await supabaseAdmin
    .from('lead_import_jobs')
    .select('id, user_id, list_id, status, results, probe_data')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (jobErr || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  if (job.status !== 'done') return NextResponse.json({ error: 'Job not ready yet' }, { status: 400 });

  const results: EmailResult[] = job.results || [];
  const rowData: Record<string, Record<string, string | null>> = job.probe_data?.row_data || {};

  // Determine which emails to import
  // safe/likely_safe/risky always included; catchall/unknown toggled by include_caution
  const toImport = results.filter(r => {
    if (!IMPORTABLE_DECISIONS.includes(r.decision)) return false;
    if ((r.decision === 'catchall' || r.decision === 'unknown' || r.decision === 'risky') && !include_caution) return false;
    if (r.dupe_lists.length > 0 && !include_cross_list) return false;
    return true;
  });

  let imported = 0;
  let skipped = 0;

  for (const result of toImport) {
    const extraFields = rowData[result.email] || {};

    // Upsert lead
    const { data: lead, error: leadErr } = await supabaseAdmin
      .from('leads')
      .upsert(
        {
          user_id: user.id,
          email: result.email,
          first_name: extraFields.first_name || null,
          last_name: extraFields.last_name || null,
          company: extraFields.company || null,
          title: extraFields.title || null,
          website: extraFields.website || null,
          linkedin: extraFields.linkedin || null,
          phone: extraFields.phone || null,
        },
        { onConflict: 'user_id,email', ignoreDuplicates: false }
      )
      .select('id')
      .single();

    if (leadErr || !lead) { skipped++; continue; }

    // Add to list if specified
    if (job.list_id) {
      await supabaseAdmin
        .from('lead_list_members')
        .upsert({ list_id: job.list_id, lead_id: lead.id }, { onConflict: 'list_id,lead_id', ignoreDuplicates: true });
    }

    imported++;
  }

  // Mark job as imported
  await supabaseAdmin
    .from('lead_import_jobs')
    .update({ status: 'imported', probe_data: null })
    .eq('id', id);

  return NextResponse.json({ imported, skipped });
}

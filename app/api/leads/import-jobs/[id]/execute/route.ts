import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { EmailResult } from '@/lib/score-engine';
import { IMPORTABLE_DECISIONS } from '@/lib/score-engine';

interface ExecuteBody {
  include_risky: boolean;
  include_catchall: boolean;
  include_cross_list: boolean;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { include_risky, include_catchall, include_cross_list }: ExecuteBody = await req.json();

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
  const toImport = results.filter(r => {
    if (!IMPORTABLE_DECISIONS.includes(r.decision)) return false;
    if (r.decision === 'risky' && !include_risky) return false;
    if (r.dupe_lists.length > 0 && !include_cross_list) return false;
    return true;
  });

  if (toImport.length === 0) {
    await supabaseAdmin.from('lead_import_jobs').update({ status: 'imported', probe_data: null }).eq('id', id);
    return NextResponse.json({ imported: 0, skipped: 0 });
  }

  const emailsToImport = toImport.map(r => r.email);

  // ── Step 1: find which emails already exist for this user ────────────────────
  const { data: existingRows } = await supabaseAdmin
    .from('leads')
    .select('id, email')
    .eq('user_id', user.id)
    .in('email', emailsToImport);

  const existingMap = new Map<string, string>((existingRows || []).map((r: any) => [r.email, r.id]));
  const brandNewEmails = emailsToImport.filter(e => !existingMap.has(e));

  // ── Step 2: insert only new leads ───────────────────────────────────────────
  let newlyInserted: { id: string; email: string }[] = [];
  if (brandNewEmails.length > 0) {
    const insertPayload = brandNewEmails.map(email => {
      const extra = rowData[email] || {};
      return {
        user_id: user.id,
        email,
        first_name: extra.first_name || null,
        last_name: extra.last_name || null,
        company: extra.company || null,
        title: extra.title || null,
        website: extra.website || null,
        linkedin: extra.linkedin || null,
        phone: extra.phone || null,
      };
    });

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('leads')
      .insert(insertPayload)
      .select('id, email');

    if (insertErr) {
      console.error('Lead insert failed:', insertErr.message);
      return NextResponse.json({ error: 'Import failed: ' + insertErr.message }, { status: 500 });
    }
    newlyInserted = inserted || [];
  }

  // ── Step 3: collect all lead IDs (existing + new) for list membership ────────
  const allLeadIds = [
    ...newlyInserted.map(l => l.id),
    ...Array.from(existingMap.values()),
  ];

  const imported = newlyInserted.length;

  // ── Step 4: upsert list members ──────────────────────────────────────────────
  if (job.list_id && allLeadIds.length > 0) {
    const members = allLeadIds.map(lead_id => ({ list_id: job.list_id, lead_id }));
    await supabaseAdmin
      .from('lead_list_members')
      .upsert(members, { onConflict: 'list_id,lead_id', ignoreDuplicates: true });
  }

  // Mark job as imported
  await supabaseAdmin
    .from('lead_import_jobs')
    .update({ status: 'imported', probe_data: null })
    .eq('id', id);

  return NextResponse.json({ imported, skipped: toImport.length - imported });
}

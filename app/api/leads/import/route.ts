import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import Papa from 'papaparse';
import { preCheckEmail } from '@/lib/email-validate';

// Only allow emails that pass pre-check (valid syntax, not disposable, not typo)
// role_based emails are allowed through import — they're a soft warning only
function isImportable(email: string): boolean {
  const result = preCheckEmail(email);
  return result.status === 'valid' || result.status === 'role_based';
}

function clean(v: string | undefined): string | null {
  const s = (v || '').trim();
  return s || null;
}

function normalizeRow(r: Record<string, string>) {
  return {
    email: (r.email || r.Email || r.EMAIL || '').trim().toLowerCase(),
    first_name: clean(r.first_name || r.firstname || r.first || r['First Name'] || r['First name']),
    last_name: clean(r.last_name || r.lastname || r.last || r['Last Name'] || r['Last name']),
    company: clean(r.company || r.company_name || r['Company'] || r['Company Name']),
    title: clean(r.title || r.job_title || r.position || r['Title'] || r['Job Title']),
    website: clean(r.website || r.domain || r['Website']),
    linkedin: clean(r.linkedin || r.linkedin_url || r['LinkedIn']),
    phone: clean(r.phone || r.phone_number || r['Phone']),
  };
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const campaign_id = formData.get('campaign_id') as string | null;
  const list_id = formData.get('list_id') as string | null;

  // From validate step: emails confirmed as bounced/unsubscribed by client
  let excludeEmails = new Set<string>();
  const excludeRaw = formData.get('exclude_emails') as string | null;
  if (excludeRaw) {
    try { excludeEmails = new Set(JSON.parse(excludeRaw) as string[]); } catch {}
  }

  // Whether to add cross-list duplicates (existing leads in other lists) to this list
  const includeCrossList = formData.get('include_cross_list') !== 'false';

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const fileName = file.name.toLowerCase();
  let rawRows: Record<string, string>[] = [];

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    const { read, utils } = await import('xlsx');
    const wb = read(await file.arrayBuffer(), { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rawRows = utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
  } else if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
    const text = await file.text();
    const { data, errors } = Papa.parse<Record<string, string>>(text, {
      header: true, skipEmptyLines: true, transformHeader: h => h.trim(),
    });
    if (errors.length && !data.length) return NextResponse.json({ error: 'Could not parse CSV' }, { status: 400 });
    rawRows = data;
  } else {
    return NextResponse.json({ error: 'Unsupported file type. Use CSV, XLSX, or XLS.' }, { status: 400 });
  }

  const totalRows = rawRows.length;
  const normalized = rawRows
    .map(normalizeRow)
    .filter(r => isImportable(r.email) && !excludeEmails.has(r.email))
    .map(r => ({ ...r, user_id: user.id }));
  const invalid = totalRows - normalized.length;

  if (!normalized.length) {
    return NextResponse.json({ error: 'No valid email addresses found in file' }, { status: 400 });
  }

  await supabaseAdmin.from('profiles').upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true });

  // Deduplicate within file
  const seenInFile = new Set<string>();
  const unique = normalized.filter(l => {
    if (seenInFile.has(l.email)) return false;
    seenInFile.add(l.email);
    return true;
  });
  const duplicatesInFile = normalized.length - unique.length;

  // Fetch all existing emails for this user
  const { data: allExisting } = await supabaseAdmin.from('leads').select('id, email').eq('user_id', user.id);
  const existingMap = new Map<string, string>((allExisting || []).map((r: { id: string; email: string }) => [r.email, r.id]));

  const trulyNew = unique.filter(l => !existingMap.has(l.email));
  const alreadyInAccount = unique.length - trulyNew.length;

  // For list import: if include_cross_list=true, add existing leads (from other lists) as members
  let crossListAdded = 0;
  if (list_id && includeCrossList) {
    const existingToAdd = unique.filter(l => existingMap.has(l.email));
    if (existingToAdd.length) {
      const memberRows = existingToAdd
        .map(l => ({ list_id, lead_id: existingMap.get(l.email)! }))
        .filter(r => r.lead_id);
      if (memberRows.length) {
        await supabaseAdmin
          .from('lead_list_members')
          .upsert(memberRows, { onConflict: 'list_id,lead_id', ignoreDuplicates: true });
        crossListAdded = memberRows.length;
      }
    }
  }

  if (!trulyNew.length) {
    return NextResponse.json({
      imported: 0,
      added_to_list: crossListAdded,
      total_in_file: totalRows,
      invalid,
      duplicates_in_file: duplicatesInFile,
      already_in_db: alreadyInAccount,
      list_id: list_id || null,
      enrolled: 0,
    });
  }

  const { data: inserted, error } = await supabaseAdmin
    .from('leads')
    .insert(trulyNew)
    .select('id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (list_id && inserted?.length) {
    const memberRows = (inserted as { id: string }[]).map(l => ({ list_id, lead_id: l.id }));
    await supabaseAdmin
      .from('lead_list_members')
      .upsert(memberRows, { onConflict: 'list_id,lead_id', ignoreDuplicates: true });
  }

  if (campaign_id && inserted?.length) {
    const enrollRows = inserted.map((l: { id: string }) => ({
      campaign_id, lead_id: l.id, status: 'pending',
    }));
    await supabaseAdmin
      .from('campaign_leads')
      .upsert(enrollRows, { onConflict: 'campaign_id,lead_id', ignoreDuplicates: true });
  }

  return NextResponse.json({
    imported: inserted?.length ?? 0,
    added_to_list: crossListAdded,
    total_in_file: totalRows,
    invalid,
    duplicates_in_file: duplicatesInFile,
    already_in_db: alreadyInAccount,
    list_id: list_id || null,
    enrolled: campaign_id ? (inserted?.length ?? 0) : 0,
  });
}

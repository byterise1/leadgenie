import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import Papa from 'papaparse';

const FAKE_DOMAINS = new Set([
  'example.com', 'test.com', 'website.com', 'domain.com', 'email.com',
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
  'yopmail.com', 'sharklasers.com', 'spam4.me', 'trashmail.com',
  'doe.com', 'smith.com', 'foo.com', 'bar.com', 'placeholder.com',
]);
const FAKE_EMAILS = new Set([
  'your@email.com', 'john@doe.com', 'john@smith.com', 'info@website.com',
  'test@test.com', 'user@domain.com', 'name@email.com', 'me@example.com',
  'email@email.com', 'admin@example.com', 'no@email.com', 'noemail@noemail.com',
]);

function isValidEmail(email: string): boolean {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  const lower = email.toLowerCase();
  if (FAKE_EMAILS.has(lower)) return false;
  const domain = lower.split('@')[1];
  if (FAKE_DOMAINS.has(domain)) return false;
  return true;
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

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const fileName = file.name.toLowerCase();
  let rawRows: Record<string, string>[] = [];

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    const { read, utils } = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const wb = read(buffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rawRows = utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
  } else if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
    const text = await file.text();
    const { data, errors } = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim(),
    });
    if (errors.length && !data.length) {
      return NextResponse.json({ error: 'Could not parse CSV' }, { status: 400 });
    }
    rawRows = data;
  } else {
    return NextResponse.json({ error: 'Unsupported file type. Use CSV, XLSX, or XLS.' }, { status: 400 });
  }

  const totalRows = rawRows.length;
  const leads = rawRows
    .map(normalizeRow)
    .filter(r => isValidEmail(r.email))
    .map(r => ({ ...r, user_id: user.id }));
  const invalid = totalRows - leads.length;

  if (!leads.length) {
    return NextResponse.json({ error: 'No valid email addresses found in file' }, { status: 400 });
  }

  // Ensure profile row exists
  await supabaseAdmin.from('profiles').upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true });

  const emails = leads.map(l => l.email);

  // Chunk into 100 to avoid URL length limits on .in() queries
  const existingSet = new Set<string>();
  for (let i = 0; i < emails.length; i += 100) {
    const chunk = emails.slice(i, i + 100);
    const { data } = await supabaseAdmin
      .from('leads')
      .select('email')
      .eq('user_id', user.id)
      .in('email', chunk);
    (data || []).forEach((r: { email: string }) => existingSet.add(r.email));
  }

  const duplicatesInFile = emails.length - new Set(emails).size;
  const duplicatesInDB = leads.filter(l => existingSet.has(l.email)).length;

  // Deduplicate within the file too, then filter out DB duplicates — plain insert only new
  const seenInFile = new Set<string>();
  const newLeads = leads.filter(l => {
    if (seenInFile.has(l.email) || existingSet.has(l.email)) return false;
    seenInFile.add(l.email);
    return true;
  });

  if (!newLeads.length) {
    return NextResponse.json({
      imported: 0,
      total_in_file: leads.length,
      duplicates_in_file: duplicatesInFile,
      already_in_db: duplicatesInDB,
      enrolled: 0,
    });
  }

  const { data: inserted, error } = await supabaseAdmin
    .from('leads')
    .insert(newLeads)
    .select('id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Add imported leads to the chosen list
  if (list_id && inserted?.length) {
    const memberRows = inserted.map((l: { id: string }) => ({ list_id, lead_id: l.id }));
    await supabaseAdmin
      .from('lead_list_members')
      .upsert(memberRows, { onConflict: 'list_id,lead_id', ignoreDuplicates: true });
  }

  // Also enroll in campaign if provided
  if (campaign_id && inserted?.length) {
    const enrollRows = inserted.map((l: { id: string }) => ({
      campaign_id,
      lead_id: l.id,
      status: 'pending',
    }));
    await supabaseAdmin
      .from('campaign_leads')
      .upsert(enrollRows, { onConflict: 'campaign_id,lead_id', ignoreDuplicates: true });
  }

  return NextResponse.json({
    imported: inserted?.length ?? 0,
    total_in_file: totalRows,
    invalid,
    duplicates_in_file: duplicatesInFile,
    already_in_db: duplicatesInDB,
    list_id: list_id || null,
    enrolled: campaign_id ? (inserted?.length ?? 0) : 0,
  });
}

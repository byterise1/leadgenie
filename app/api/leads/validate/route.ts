import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import Papa from 'papaparse';
import { batchSmtp } from '@/lib/smtp-check';

const FAKE_DOMAINS = new Set([
  'example.com','test.com','website.com','domain.com','email.com',
  'mailinator.com','guerrillamail.com','tempmail.com','throwaway.email',
  'yopmail.com','sharklasers.com','spam4.me','trashmail.com',
  'doe.com','smith.com','foo.com','bar.com','placeholder.com',
]);
const FAKE_EMAILS = new Set([
  'your@email.com','john@doe.com','john@smith.com','info@website.com',
  'test@test.com','user@domain.com','name@email.com','me@example.com',
  'email@email.com','admin@example.com','no@email.com','noemail@noemail.com',
]);

function isValidFormat(email: string): boolean {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  const lower = email.toLowerCase();
  if (FAKE_EMAILS.has(lower)) return false;
  return !FAKE_DOMAINS.has(lower.split('@')[1]);
}

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const list_id = formData.get('list_id') as string | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const fileName = file.name.toLowerCase();
  let rawRows: Record<string, string>[] = [];

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    const { read, utils } = await import('xlsx');
    const wb = read(await file.arrayBuffer(), { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rawRows = utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
  } else {
    const { data } = Papa.parse<Record<string, string>>(await file.text(), { header: true, skipEmptyLines: true, transformHeader: h => h.trim() });
    rawRows = data;
  }

  const total = rawRows.length;

  // Extract emails
  const allEmails = rawRows.map(r =>
    (r.email || r.Email || r.EMAIL || '').trim().toLowerCase()
  );

  // 1. Format filter
  const formatValid = allEmails.filter(isValidFormat);
  const invalid_format = total - formatValid.length;

  // 2. In-file dedup
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const e of formatValid) {
    if (!seen.has(e)) { seen.add(e); unique.push(e); }
  }
  const file_duplicates = formatValid.length - unique.length;

  // 3. Already in account
  const { data: allExisting } = await supabaseAdmin.from('leads').select('email').eq('user_id', user.id);
  const existingSet = new Set((allExisting || []).map((r: { email: string }) => r.email));
  const already_in_account = unique.filter(e => existingSet.has(e)).length;
  const newEmails = unique.filter(e => !existingSet.has(e));

  // 4. Unsubscribe check
  const { data: unsubLeads } = await supabaseAdmin
    .from('sent_emails').select('leads!inner(email)').not('unsubscribed_at', 'is', null).eq('user_id', user.id);
  const unsubSet = new Set((unsubLeads || []).map((r: any) => r.leads?.email).filter(Boolean));
  const unsubscribed_emails = newEmails.filter(e => unsubSet.has(e));
  const afterUnsub = newEmails.filter(e => !unsubSet.has(e));

  // 5. Cross-list duplicates (emails in other lists already, for list import)
  let cross_list_dupes: { email: string; lists: string[] }[] = [];
  if (list_id && afterUnsub.length) {
    const { data: members } = await supabaseAdmin
      .from('lead_list_members')
      .select('lead_id, leads!inner(email), lead_lists!inner(id,name,user_id)')
      .neq('list_id', list_id);
    const crossMap = new Map<string, string[]>();
    for (const m of members || []) {
      const email = (m.leads as any)?.email as string;
      const listMeta = m.lead_lists as any;
      if (!email || listMeta?.user_id !== user.id || !afterUnsub.includes(email)) continue;
      if (!crossMap.has(email)) crossMap.set(email, []);
      const nm = listMeta?.name || 'Another list';
      if (!crossMap.get(email)!.includes(nm)) crossMap.get(email)!.push(nm);
    }
    cross_list_dupes = Array.from(crossMap.entries()).map(([email, lists]) => ({ email, lists }));
  }

  // 6. Bounce check via port 25 (limit 500, skip already-excluded)
  const toCheck = afterUnsub.slice(0, 500);
  const bounceResults = await batchSmtp(toCheck);
  const bounced_emails = toCheck.filter(e => bounceResults.get(e) === 'invalid');
  const bounce_unknown = toCheck.filter(e => bounceResults.get(e) === 'unknown').length;
  const clean = afterUnsub.filter(e => !bounced_emails.includes(e));

  return NextResponse.json({
    total,
    invalid_format,
    file_duplicates,
    already_in_account,
    unsubscribed: unsubscribed_emails.length,
    unsubscribed_emails,
    cross_list_dupes,
    cross_list_count: cross_list_dupes.length,
    bounced: bounced_emails.length,
    bounced_emails,
    bounce_unknown,
    clean_count: clean.length,
  });
}

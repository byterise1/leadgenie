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

  // ── Parse file ───────────────────────────────────────────────────────────
  const fileName = file.name.toLowerCase();
  let rawRows: Record<string, string>[] = [];
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    const { read, utils } = await import('xlsx');
    const wb = read(await file.arrayBuffer(), { type: 'array' });
    rawRows = utils.sheet_to_json<Record<string, string>>(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  } else {
    const { data } = Papa.parse<Record<string, string>>(await file.text(), { header: true, skipEmptyLines: true, transformHeader: h => h.trim() });
    rawRows = data;
  }

  const total = rawRows.length;
  const allEmails = rawRows.map(r => (r.email || r.Email || r.EMAIL || '').trim().toLowerCase());

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
  const uniqueSet = new Set(unique);

  // ── Fetch all user's existing leads ─────────────────────────────────────
  const { data: allLeads } = await supabaseAdmin
    .from('leads').select('id, email').eq('user_id', user.id);
  // Map<email, lead_id> for all existing leads
  const existingMap = new Map<string, string>(
    (allLeads || []).map((r: { id: string; email: string }) => [r.email, r.id])
  );

  // ── Membership categorisation (only when importing to a specific list) ───
  const inThisListSet = new Set<string>();               // already in target list
  const inOtherListsMap = new Map<string, string[]>();   // email → list names

  if (list_id) {
    // Members already in THIS list
    const { data: thisMembers } = await supabaseAdmin
      .from('lead_list_members')
      .select('leads!inner(email)')
      .eq('list_id', list_id);
    for (const m of thisMembers || []) {
      const e = (m.leads as any)?.email as string;
      if (e && uniqueSet.has(e)) inThisListSet.add(e);
    }

    // Other lists belonging to this user
    const { data: userLists } = await supabaseAdmin
      .from('lead_lists').select('id, name').eq('user_id', user.id).neq('id', list_id);

    if (userLists?.length) {
      const listIdToName = new Map((userLists as { id: string; name: string }[]).map(l => [l.id, l.name]));
      const otherListIds = userLists.map((l: { id: string }) => l.id);

      const { data: otherMembers } = await supabaseAdmin
        .from('lead_list_members')
        .select('list_id, leads!inner(email)')
        .in('list_id', otherListIds);

      for (const m of otherMembers || []) {
        const email = (m.leads as any)?.email as string;
        // Only include if: in the file, in account, NOT already in this list
        if (!email || !uniqueSet.has(email) || !existingMap.has(email) || inThisListSet.has(email)) continue;
        const listName = listIdToName.get(m.list_id as string) || 'Another list';
        if (!inOtherListsMap.has(email)) inOtherListsMap.set(email, []);
        if (!inOtherListsMap.get(email)!.includes(listName)) inOtherListsMap.get(email)!.push(listName);
      }
    }
  }

  // ── Categorise each email ────────────────────────────────────────────────
  // already_in_this_list: already a member of target list → always skip
  const already_in_this_list = unique.filter(e => inThisListSet.has(e)).length;

  // cross_list_dupes: in another list (and in leads table) but NOT in this list
  // User decides whether to add them to this list too
  const cross_list_dupes = Array.from(inOtherListsMap.entries())
    .map(([email, lists]) => ({ email, lists }));
  const cross_list_count = cross_list_dupes.length;

  // brand_new: not in leads table at all (also not in this list, not in other lists)
  const brand_new = unique.filter(e => !existingMap.has(e));

  // ── Unsubscribe check (brand new only — existing leads already have status) ─
  const { data: unsubLeads } = await supabaseAdmin
    .from('sent_emails').select('leads!inner(email)')
    .not('unsubscribed_at', 'is', null).eq('user_id', user.id);
  const unsubSet = new Set((unsubLeads || []).map((r: any) => r.leads?.email).filter(Boolean));
  const unsubscribed_emails = brand_new.filter(e => unsubSet.has(e));
  const afterUnsub = brand_new.filter(e => !unsubSet.has(e));

  // ── Port 25 SMTP bounce check (brand new, after unsub filter, cap 500) ──
  const toCheck = afterUnsub.slice(0, 500);
  const bounceResults = await batchSmtp(toCheck);
  const bouncedSet = new Set(toCheck.filter(e => bounceResults.get(e) === 'invalid'));
  const bounced_emails = [...bouncedSet];
  const bounce_unknown = toCheck.filter(e => bounceResults.get(e) === 'unknown').length;
  // clean = brand new, not unsubscribed, not bounced (unknown still gets imported)
  const clean_count = afterUnsub.filter(e => !bouncedSet.has(e)).length;

  return NextResponse.json({
    total,
    invalid_format,
    file_duplicates,
    already_in_this_list,   // skip silently — already a member of the target list
    cross_list_dupes,        // in OTHER lists — ask user include or skip
    cross_list_count,
    unsubscribed: unsubscribed_emails.length,
    unsubscribed_emails,
    bounced: bounced_emails.length,
    bounced_emails,
    bounce_unknown,          // SMTP probe inconclusive — will be imported
    clean_count,             // brand new, confirmed valid (or unverified), ready to insert
  });
}

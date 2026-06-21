import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import Papa from 'papaparse';
import { batchSmtp } from '@/lib/smtp-check';
import { batchPreCheck } from '@/lib/email-validate';

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

  // ── 1. Pre-check: syntax / typos / disposable / role-based ──────────────
  const preChecks = batchPreCheck(allEmails);

  const domain_typo_emails: { email: string; suggestion: string }[] = [];
  const disposable_emails: string[] = [];
  const role_based_emails: string[] = [];
  const invalid_syntax_emails: string[] = [];
  const preValid: string[] = [];

  for (const email of allEmails) {
    const check = preChecks.get(email)!;
    switch (check.status) {
      case 'invalid_syntax':
        invalid_syntax_emails.push(email);
        break;
      case 'domain_typo':
        domain_typo_emails.push({ email, suggestion: check.suggestion! });
        break;
      case 'disposable':
        disposable_emails.push(email);
        break;
      case 'role_based':
        role_based_emails.push(email);
        break;
      default:
        preValid.push(email);
    }
  }

  const invalid_format = invalid_syntax_emails.length;

  // ── 2. In-file dedup (from pre-valid only) ───────────────────────────────
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const e of preValid) {
    if (!seen.has(e)) { seen.add(e); unique.push(e); }
  }
  const file_duplicates = preValid.length - unique.length;
  const uniqueSet = new Set(unique);

  // ── Fetch all user's existing leads ─────────────────────────────────────
  const { data: allLeads } = await supabaseAdmin
    .from('leads').select('id, email').eq('user_id', user.id);
  const existingMap = new Map<string, string>(
    (allLeads || []).map((r: { id: string; email: string }) => [r.email, r.id])
  );

  // ── 3. Membership categorisation ─────────────────────────────────────────
  const inThisListSet = new Set<string>();
  const inOtherListsMap = new Map<string, string[]>();

  if (list_id) {
    const { data: thisMembers } = await supabaseAdmin
      .from('lead_list_members')
      .select('leads!inner(email)')
      .eq('list_id', list_id);
    for (const m of thisMembers || []) {
      const e = (m.leads as any)?.email as string;
      if (e && uniqueSet.has(e)) inThisListSet.add(e);
    }

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
        if (!email || !uniqueSet.has(email) || !existingMap.has(email) || inThisListSet.has(email)) continue;
        const listName = listIdToName.get(m.list_id as string) || 'Another list';
        if (!inOtherListsMap.has(email)) inOtherListsMap.set(email, []);
        if (!inOtherListsMap.get(email)!.includes(listName)) inOtherListsMap.get(email)!.push(listName);
      }
    }
  }

  const already_in_this_list = unique.filter(e => inThisListSet.has(e)).length;
  const cross_list_dupes = Array.from(inOtherListsMap.entries()).map(([email, lists]) => ({ email, lists }));
  const cross_list_count = cross_list_dupes.length;

  // ── 4. Unsubscribe check ─────────────────────────────────────────────────
  const brand_new = unique.filter(e => !existingMap.has(e));
  const { data: unsubLeads } = await supabaseAdmin
    .from('sent_emails').select('leads!inner(email)')
    .not('unsubscribed_at', 'is', null).eq('user_id', user.id);
  const unsubSet = new Set((unsubLeads || []).map((r: any) => r.leads?.email).filter(Boolean));
  const unsubscribed_emails = brand_new.filter(e => unsubSet.has(e));
  const afterUnsub = brand_new.filter(e => !unsubSet.has(e));

  // ── 5. SMTP bounce check (brand new, non-disposable, non-typo, after unsub) ─
  const toCheck = afterUnsub.slice(0, 500);
  const bounceResults = await batchSmtp(toCheck);
  const bouncedSet = new Set(toCheck.filter(e => bounceResults.get(e) === 'invalid'));
  const unknownSet = new Set(toCheck.filter(e => bounceResults.get(e) === 'unknown'));
  const catchallSet = new Set(toCheck.filter(e => bounceResults.get(e) === 'catchall'));
  const bounced_emails = [...bouncedSet];
  const unknown_emails = [...unknownSet];
  const catchall_emails = [...catchallSet];
  // clean = not bounced (unknown/catchall imported with caution info)
  const clean_count = afterUnsub.filter(e => !bouncedSet.has(e)).length;

  return NextResponse.json({
    total,
    // Pre-check categories (all excluded from import)
    invalid_format,
    domain_typo: domain_typo_emails.length,
    domain_typo_emails,         // [{ email, suggestion }]
    disposable: disposable_emails.length,
    disposable_emails,
    role_based: role_based_emails.length,
    role_based_emails,
    // File-level
    file_duplicates,
    // List membership
    already_in_this_list,
    cross_list_dupes,
    cross_list_count,
    // Unsub
    unsubscribed: unsubscribed_emails.length,
    unsubscribed_emails,
    // SMTP probe results
    bounced: bounced_emails.length,
    bounced_emails,
    bounce_unknown: unknown_emails.length,
    unknown_emails,
    bounce_catchall: catchall_emails.length,
    catchall_emails,
    clean_count,
  });
}

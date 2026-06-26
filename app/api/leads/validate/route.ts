import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import Papa from 'papaparse';
import { batchSmtp } from '@/lib/smtp-check';
import { batchPreCheck } from '@/lib/email-validate';
import { detectProvider, scoreEmail, buildSummary as buildSummaryEngine, EmailResult } from '@/lib/score-engine';
import { validationQueue } from '@/lib/queue';

export const maxDuration = 300;

// Everything goes to background worker — UI polls for progress so user can navigate freely
const ASYNC_THRESHOLD = 0;

function expandRow(r: Record<string, string>) {
  const clean = (v: string | undefined) => (v || '').trim() || null;
  const rawEmail = (r.email || r.Email || r.EMAIL || '').trim();
  // Split cells that contain multiple emails separated by ; or ,
  const emails = rawEmail.split(/[;,]/).map(e => e.trim().toLowerCase()).filter(Boolean);
  const base = {
    first_name: clean(r.first_name || r.firstname || r.first || r['First Name'] || r['First name']),
    last_name: clean(r.last_name || r.lastname || r.last || r['Last Name'] || r['Last name']),
    company: clean(r.company || r.company_name || r['Company'] || r['Company Name']),
    title: clean(r.title || r.job_title || r.position || r['Title'] || r['Job Title']),
    website: clean(r.website || r.domain || r['Website']),
    linkedin: clean(r.linkedin || r.linkedin_url || r['LinkedIn']),
    phone: clean(r.phone || r.phone_number || r['Phone']),
  };
  if (emails.length === 0) return [{ email: '', ...base }];
  return emails.map(email => ({ email, ...base }));
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const list_id = formData.get('list_id') as string | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  // ── Validate file type ───────────────────────────────────────────────────────
  const fileName = file.name.toLowerCase();
  const ext = fileName.split('.').pop() ?? '';
  if (!['csv', 'xlsx', 'xls'].includes(ext)) {
    return NextResponse.json(
      { error: `Unsupported file type ".${ext}". Please upload a CSV or Excel file (.csv, .xlsx, .xls).` },
      { status: 400 }
    );
  }

  // ── Parse file ───────────────────────────────────────────────────────────────
  let rawRows: Record<string, string>[] = [];
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    try {
      const { read, utils } = await import('xlsx');
      const wb = read(new Uint8Array(await file.arrayBuffer()), { type: 'array' });
      rawRows = utils.sheet_to_json<Record<string, string>>(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    } catch {
      return NextResponse.json({ error: 'Could not read the Excel file. Make sure it is not corrupted or password-protected.' }, { status: 400 });
    }
  } else {
    const { data } = Papa.parse<Record<string, string>>(await file.text(), {
      header: true, skipEmptyLines: true, transformHeader: h => h.trim(),
    });
    rawRows = data;
  }

  const allRows = rawRows.flatMap(expandRow);
  const total = allRows.length;

  // ── 1. Pre-check: syntax / disposable / typo / role-based ───────────────────
  const allEmails = allRows.map(r => r.email);
  const preChecks = batchPreCheck(allEmails);

  const preResults: { email: string; reason: string; pre_fail: string; typo_suggestion?: string }[] = [];
  const roleSet = new Set<string>();
  const preValid: string[] = [];

  for (const email of allEmails) {
    const check = preChecks.get(email)!;
    if (check.status === 'invalid_syntax') {
      preResults.push({ email, reason: 'Invalid email syntax', pre_fail: 'syntax' });
    } else if (check.status === 'domain_typo') {
      preResults.push({ email, reason: `Domain typo — did you mean ${check.suggestion}?`, pre_fail: 'typo', typo_suggestion: check.suggestion });
    } else if (check.status === 'disposable') {
      preResults.push({ email, reason: 'Disposable / temporary email domain', pre_fail: 'disposable' });
    } else {
      if (check.status === 'role_based') roleSet.add(email);
      preValid.push(email);
    }
  }

  const pre_failed = preResults.length;

  // ── 2. In-file dedup ─────────────────────────────────────────────────────────
  const seen = new Set<string>();
  const unique: string[] = [];
  const fileDupeEmails: string[] = [];
  for (const e of preValid) {
    if (!seen.has(e)) { seen.add(e); unique.push(e); }
    else fileDupeEmails.push(e);
  }
  const file_dupes = fileDupeEmails.length;

  // ── 3. Membership check ──────────────────────────────────────────────────────
  const { data: allLeads } = await supabaseAdmin
    .from('leads').select('id, email').eq('user_id', user.id);
  const existingMap = new Map<string, string>((allLeads || []).map((r: any) => [r.email, r.id]));

  let inThisListSet = new Set<string>();
  const crossListMap = new Map<string, string[]>();

  if (list_id) {
    const { data: thisMembers } = await supabaseAdmin
      .from('lead_list_members').select('leads!inner(email)').eq('list_id', list_id);
    for (const m of thisMembers || []) {
      const e = (m.leads as any)?.email as string;
      if (e) inThisListSet.add(e);
    }

    const { data: userLists } = await supabaseAdmin
      .from('lead_lists').select('id, name').eq('user_id', user.id).neq('id', list_id);
    if (userLists?.length) {
      const listIdToName = new Map((userLists as any[]).map(l => [l.id, l.name]));
      const { data: otherMembers } = await supabaseAdmin
        .from('lead_list_members').select('list_id, leads!inner(email)')
        .in('list_id', userLists.map((l: any) => l.id));
      for (const m of otherMembers || []) {
        const email = (m.leads as any)?.email as string;
        if (!email || !existingMap.has(email) || inThisListSet.has(email)) continue;
        const listName = listIdToName.get(m.list_id as string) || 'Another list';
        if (!crossListMap.has(email)) crossListMap.set(email, []);
        if (!crossListMap.get(email)!.includes(listName)) crossListMap.get(email)!.push(listName);
      }
    }
  }

  const in_this_list = unique.filter(e => inThisListSet.has(e)).length;
  const cross_list = crossListMap.size;

  // ── 4. Bounce & unsub history ────────────────────────────────────────────────
  const { data: bouncedRows } = await supabaseAdmin
    .from('sent_emails').select('leads!inner(email)').eq('user_id', user.id).eq('bounced', true);
  const prevBouncedSet = new Set<string>(
    (bouncedRows || []).map((r: any) => r.leads?.email as string).filter(Boolean)
  );

  const { data: unsubRows } = await supabaseAdmin
    .from('sent_emails').select('leads!inner(email)')
    .not('unsubscribed_at', 'is', null).eq('user_id', user.id);
  const unsubSet = new Set<string>(
    (unsubRows || []).map((r: any) => r.leads?.email as string).filter(Boolean)
  );

  // Emails to actually probe: new, not in this list, not bounced, not unsub
  const toProbe = unique.filter(e =>
    !inThisListSet.has(e) && !prevBouncedSet.has(e) && !unsubSet.has(e)
  );

  // Build row_data map for later import
  const rowDataMap: Record<string, Record<string, string | null>> = {};
  for (const row of allRows) {
    if (row.email && !rowDataMap[row.email]) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { email, ...rest } = row;
      rowDataMap[row.email] = rest;
    }
  }

  // ── Determine list name ──────────────────────────────────────────────────────
  let list_name: string | null = null;
  if (list_id) {
    const { data: listRow } = await supabaseAdmin.from('lead_lists').select('name').eq('id', list_id).single();
    list_name = listRow?.name ?? null;
  }

  // ── Create job record ────────────────────────────────────────────────────────
  const probe_data = {
    emails_to_probe: toProbe,
    pre_results: preResults,
    row_data: rowDataMap,
    context: {
      prev_bounced: [...prevBouncedSet].filter(e => unique.includes(e)),
      unsub: [...unsubSet].filter(e => unique.includes(e)),
      role_based: [...roleSet],
      in_this_list: [...inThisListSet].filter(e => unique.includes(e)),
      cross_list: Array.from(crossListMap.entries()).map(([email, lists]) => ({ email, lists })),
      file_dupes: fileDupeEmails,
    },
  };

  const quick_summary = { total, pre_failed, file_dupes, in_this_list, cross_list, to_probe: toProbe.length };

  const { data: jobRow, error: jobErr } = await supabaseAdmin
    .from('lead_import_jobs')
    .insert({
      user_id: user.id,
      list_id: list_id || null,
      list_name,
      filename: file.name,
      status: toProbe.length > ASYNC_THRESHOLD ? 'processing' : 'processing',
      progress: 0,
      total_emails: total,
      probe_data,
    })
    .select('id')
    .single();

  if (jobErr || !jobRow) {
    return NextResponse.json({ error: 'Failed to create validation job' }, { status: 500 });
  }

  const jobId = jobRow.id;

  // ── Small list: run probe inline ─────────────────────────────────────────────
  if (toProbe.length <= ASYNC_THRESHOLD) {
    const smtpMap = toProbe.length > 0 ? await batchSmtp(toProbe) : new Map();
    const results = buildResults({ unique, toProbe, preResults, smtpMap, prevBouncedSet, unsubSet, roleSet, crossListMap, inThisListSet, fileDupeEmails });
    const summary = buildSummaryEngine(results, { pre_failed, file_dupes, in_this_list, cross_list, total });

    await supabaseAdmin.from('lead_import_jobs').update({
      status: 'done', progress: 100, results, summary, probe_data: null, completed_at: new Date().toISOString(),
    }).eq('id', jobId);

    return NextResponse.json({ job_id: jobId, status: 'done', results, summary, quick_summary });
  }

  // ── Large list: queue worker ─────────────────────────────────────────────────
  await validationQueue.add('validate', { jobId, userId: user.id });

  return NextResponse.json({ job_id: jobId, status: 'processing', quick_summary });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildResults(p: {
  unique: string[];
  toProbe: string[];
  preResults: { email: string; reason: string; pre_fail: string; typo_suggestion?: string }[];
  smtpMap: Map<string, string>;
  prevBouncedSet: Set<string>;
  unsubSet: Set<string>;
  roleSet: Set<string>;
  crossListMap: Map<string, string[]>;
  inThisListSet: Set<string>;
  fileDupeEmails: string[];
}): EmailResult[] {
  const { unique, toProbe, preResults, smtpMap, prevBouncedSet, unsubSet, roleSet, crossListMap, inThisListSet, fileDupeEmails } = p;
  const results: EmailResult[] = [];

  // Pre-failed emails
  for (const pr of preResults) {
    results.push({
      email: pr.email,
      score: 0,
      decision: 'invalid',
      provider: 'other',
      reasons: [pr.reason],
      smtp: 'skipped',
      is_bounce: false,
      is_unsub: false,
      is_dupe_this_list: false,
      dupe_lists: [],
      pre_fail: pr.pre_fail as any,
      typo_suggestion: pr.typo_suggestion,
    });
  }

  // File dupes
  for (const e of fileDupeEmails) {
    results.push({
      email: e, score: 0, decision: 'invalid', provider: detectProvider(e.split('@')[1] || ''),
      reasons: ['Duplicate in uploaded file'],
      smtp: 'skipped', is_bounce: false, is_unsub: false,
      is_dupe_this_list: false, dupe_lists: [], pre_fail: null,
    });
  }

  // Unique emails
  for (const email of unique) {
    const domain = email.split('@')[1] || '';
    const provider = detectProvider(domain);
    const isBounce = prevBouncedSet.has(email);
    const isUnsub = unsubSet.has(email);
    const isRole = roleSet.has(email);
    const isInList = inThisListSet.has(email);
    const dupeLists = crossListMap.get(email) || [];

    if (isInList) {
      results.push({
        email, score: 0, decision: 'invalid', provider,
        reasons: ['Already in this list'],
        smtp: 'skipped', is_bounce: false, is_unsub: false,
        is_dupe_this_list: true, dupe_lists: [], pre_fail: null,
      });
      continue;
    }

    const smtp = (smtpMap.get(email) || 'skipped') as any;
    const scored = scoreEmail({ smtp, provider, prevBounced: isBounce, isUnsub, isRoleBased: isRole });

    results.push({
      email,
      score: scored.score,
      decision: scored.decision,
      provider,
      reasons: scored.reasons,
      smtp,
      is_bounce: isBounce,
      is_unsub: isUnsub,
      is_dupe_this_list: false,
      dupe_lists: dupeLists,
      pre_fail: null,
    });
  }

  return results;
}


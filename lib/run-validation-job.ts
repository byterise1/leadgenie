import { batchSmtp } from './smtp-check';
import { detectProvider, scoreEmail, EmailResult, JobSummary } from './score-engine';

// Shared validation job runner — used by both instrumentation.ts worker and worker/index.ts
export async function runValidationJob(supabase: any, jobId: string, userId: string): Promise<void> {
  const { data: jobRow } = await supabase
    .from('lead_import_jobs')
    .select('probe_data, filename, total_emails')
    .eq('id', jobId)
    .single();

  if (!jobRow?.probe_data) {
    await supabase.from('lead_import_jobs').update({ status: 'failed' }).eq('id', jobId);
    return;
  }

  const { emails_to_probe, pre_results, row_data, context } = jobRow.probe_data as any;
  const totalEmails: number = jobRow.total_emails || 0;

  const prevBouncedSet = new Set<string>(context.prev_bounced || []);
  const unsubSet = new Set<string>(context.unsub || []);
  const roleSet = new Set<string>(context.role_based || []);
  const inThisListSet = new Set<string>(context.in_this_list || []);
  const crossListMap = new Map<string, string[]>(
    (context.cross_list || []).map((c: { email: string; lists: string[] }) => [c.email, c.lists])
  );
  const fileDupeEmails: string[] = context.file_dupes || [];

  const inListEmails: string[] = [...inThisListSet];
  const uniqueEmails: string[] = [...inListEmails, ...(emails_to_probe as string[])];

  // SMTP probe in batches of 50, concurrency 20, updating progress after each batch
  const BATCH_SIZE = 50;
  const smtpMap = new Map<string, string>();
  let probed = 0;

  for (let i = 0; i < (emails_to_probe as string[]).length; i += BATCH_SIZE) {
    const batch = (emails_to_probe as string[]).slice(i, i + BATCH_SIZE);
    const batchResult = await batchSmtp(batch, 20);
    for (const [email, result] of batchResult) smtpMap.set(email, result);
    probed += batch.length;
    const progress = Math.round((probed / (emails_to_probe as string[]).length) * 100);
    await supabase.from('lead_import_jobs').update({ progress }).eq('id', jobId);
  }

  const results: EmailResult[] = [];

  for (const pr of pre_results) {
    results.push({
      email: pr.email, score: 0, decision: 'block', provider: 'other',
      reasons: [pr.reason], smtp: 'skipped', is_bounce: false, is_unsub: false,
      is_dupe_this_list: false, dupe_lists: [], pre_fail: pr.pre_fail,
      typo_suggestion: pr.typo_suggestion,
    });
  }

  for (const e of fileDupeEmails) {
    results.push({
      email: e, score: 0, decision: 'block', provider: detectProvider(e.split('@')[1] || ''),
      reasons: ['Duplicate in uploaded file'], smtp: 'skipped',
      is_bounce: false, is_unsub: false, is_dupe_this_list: false, dupe_lists: [], pre_fail: null,
    });
  }

  for (const email of uniqueEmails) {
    const domain = email.split('@')[1] || '';
    const provider = detectProvider(domain);
    const isBounce = prevBouncedSet.has(email);
    const isUnsub = unsubSet.has(email);
    const isRole = roleSet.has(email);
    const isInList = inThisListSet.has(email);
    const dupeLists = crossListMap.get(email) || [];

    if (isInList) {
      results.push({
        email, score: 0, decision: 'block', provider,
        reasons: ['Already in this list'], smtp: 'skipped',
        is_bounce: false, is_unsub: false, is_dupe_this_list: true, dupe_lists: [], pre_fail: null,
      });
      continue;
    }

    const smtp = (smtpMap.get(email) || 'skipped') as any;
    const scored = scoreEmail({ smtp, provider, prevBounced: isBounce, isUnsub, isRoleBased: isRole });
    results.push({
      email, score: scored.score, decision: scored.decision, provider,
      reasons: scored.reasons, smtp, is_bounce: isBounce, is_unsub: isUnsub,
      is_dupe_this_list: false, dupe_lists: dupeLists, pre_fail: null,
    });
  }

  const summary: JobSummary = {
    total: totalEmails,
    safe: results.filter(r => r.decision === 'safe').length,
    caution: results.filter(r => r.decision === 'caution').length,
    block: results.filter(r => r.decision === 'block').length,
    pre_failed: pre_results.length,
    file_dupes: fileDupeEmails.length,
    in_this_list: inListEmails.length,
    cross_list: crossListMap.size,
  };

  await supabase.from('lead_import_jobs').update({
    status: 'done',
    progress: 100,
    results,
    summary,
    probe_data: { row_data },
    completed_at: new Date().toISOString(),
  }).eq('id', jobId);

  const importedCount = summary.safe + summary.caution;
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'success',
    message: `Validation complete: ${importedCount} importable, ${summary.block} blocked — ${jobRow.filename ?? 'file'}`,
    link: `/dashboard/leads?job=${jobId}`,
    read: false,
  });

  console.log(`✓ Validation job ${jobId}: ${results.length} emails scored`);
}

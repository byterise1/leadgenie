import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import { createTransport, replaceVars } from '../lib/mailer';
import { batchSmtp } from '../lib/smtp-check';
import { detectProvider, scoreEmail, EmailResult, JobSummary } from '../lib/score-engine';

const u = new URL(process.env.REDIS_URL!);
const connection = {
  host: u.hostname,
  port: Number(u.port),
  password: u.password ? decodeURIComponent(u.password) : undefined,
  maxRetriesPerRequest: null as null,
  enableReadyCheck: false,
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function processEmailJob(job: Job) {
  const { campaignLeadId, stepNumber, accountIndex } = job.data;

  // Get campaign lead + lead + campaign + step + account
  const { data: cl } = await supabase
    .from('campaign_leads')
    .select(`
      *,
      lead:leads(*),
      campaign:campaigns(*, email_steps(*), campaign_accounts(account:email_accounts(*)))
    `)
    .eq('id', campaignLeadId)
    .single();

  if (!cl || cl.status === 'replied' || cl.status === 'unsubscribed') return;

  const campaign = cl.campaign;
  const step = campaign.email_steps.find((s: any) => s.step_number === stepNumber);
  if (!step) return;

  const accounts = campaign.campaign_accounts.map((ca: any) => ca.account).filter(Boolean);
  if (!accounts.length) return;

  const account = accounts[(accountIndex ?? stepNumber) % accounts.length];
  const lead = cl.lead;

  const subject = replaceVars(step.subject, lead);
  const body = replaceVars(step.body, lead);

  const transport = await createTransport(account);

  const htmlBody = body.split('\n').map((l: string) =>
    l.trim() ? `<p style="margin:0 0 12px 0;font-family:Arial,sans-serif;font-size:14px;color:#111">${l}</p>` : ''
  ).join('');

  await transport.sendMail({
    from: `${account.email}`,
    to: lead.email,
    subject,
    text: body,
    html: `<html><body>${htmlBody}</body></html>`,
  });

  // Record in sent_emails
  await supabase.from('sent_emails').insert({
    user_id: campaign.user_id,
    campaign_id: campaign.id,
    lead_id: lead.id,
    account_id: account.id,
    step_number: stepNumber,
    subject,
    sent_at: new Date().toISOString(),
  });

  // Update campaign_lead
  const nextStep = stepNumber + 1;
  const hasNextStep = campaign.email_steps.some((s: any) => s.step_number === nextStep);

  await supabase.from('campaign_leads').update({
    current_step: nextStep,
    last_sent_at: new Date().toISOString(),
    status: hasNextStep ? 'active' : 'completed',
  }).eq('id', campaignLeadId);

  // Update campaign totals
  await supabase.rpc('increment_campaign_sent', { campaign_id: campaign.id });

  // Enqueue next step if exists
  if (hasNextStep) {
    const nextStepData = campaign.email_steps.find((s: any) => s.step_number === nextStep);
    const delayMs = (nextStepData.delay_days || 3) * 24 * 60 * 60 * 1000;

    const { emailQueue } = await import('../lib/queue');
    await emailQueue.add('send', { campaignLeadId, stepNumber: nextStep }, { delay: delayMs });
  }

  console.log(`✓ Sent step ${stepNumber} to ${lead.email} (campaign: ${campaign.name})`);
}

async function processWarmupJob(job: Job) {
  const { fromAccountId, toAccountId } = job.data;

  const { data: fromAcc } = await supabase.from('email_accounts').select('*').eq('id', fromAccountId).single();
  const { data: toAcc } = await supabase.from('email_accounts').select('*').eq('id', toAccountId).single();

  if (!fromAcc || !toAcc) return;

  const subjects = [
    'Quick check in', 'Following up', 'Just wanted to say', 'Hope you\'re well',
    'Touching base', 'Quick note', 'Checking in', 'Hi there',
  ];
  const bodies = [
    'Hey, just wanted to reach out and see how things are going. Let me know if you need anything.',
    'Hope everything is going well on your end. Always good to stay in touch.',
    'Just a quick note to say hello. Looking forward to catching up soon.',
  ];

  const subject = subjects[Math.floor(Math.random() * subjects.length)];
  const body = bodies[Math.floor(Math.random() * bodies.length)];

  const transport = await createTransport(fromAcc);
  await transport.sendMail({
    from: fromAcc.email,
    to: toAcc.email,
    subject,
    text: body,
    html: `<p>${body}</p>`,
  });

  await supabase.from('warmup_emails').insert({
    from_account_id: fromAccountId,
    to_account_id: toAccountId,
    subject,
    body,
  });

  // Update health score slightly
  await supabase.from('email_accounts')
    .update({ health_score: Math.min(100, (fromAcc.health_score || 50) + 1) })
    .eq('id', fromAccountId);
}

async function processValidationJob(job: Job) {
  const { jobId, userId } = job.data;

  const { data: jobRow } = await supabase
    .from('lead_import_jobs')
    .select('probe_data, list_id, list_name, filename, total_emails')
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

  // Build the set of all unique emails (probe + already-handled)
  const inListEmails: string[] = [...inThisListSet];
  const uniqueEmails: string[] = [
    ...inListEmails,
    ...(emails_to_probe as string[]),
  ];

  // SMTP probe in batches, updating progress
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

  // Build full results
  const results: EmailResult[] = [];

  // Pre-failed
  for (const pr of pre_results) {
    results.push({
      email: pr.email, score: 0, decision: 'block', provider: 'other',
      reasons: [pr.reason], smtp: 'skipped', is_bounce: false, is_unsub: false,
      is_dupe_this_list: false, dupe_lists: [], pre_fail: pr.pre_fail,
      typo_suggestion: pr.typo_suggestion,
    });
  }

  // File dupes
  for (const e of fileDupeEmails) {
    results.push({
      email: e, score: 0, decision: 'block', provider: detectProvider(e.split('@')[1] || ''),
      reasons: ['Duplicate in uploaded file'], smtp: 'skipped',
      is_bounce: false, is_unsub: false, is_dupe_this_list: false, dupe_lists: [], pre_fail: null,
    });
  }

  // Unique emails (in-list + probed)
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

  // Save results + mark done, clear probe_data
  await supabase.from('lead_import_jobs').update({
    status: 'done',
    progress: 100,
    results,
    summary,
    probe_data: { row_data }, // keep row_data for execute route, discard the rest
    completed_at: new Date().toISOString(),
  }).eq('id', jobId);

  // Send bell notification
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

const emailWorker = new Worker('email-sending', processEmailJob, {
  connection,
  concurrency: 5,
});

const warmupWorker = new Worker('warmup', processWarmupJob, {
  connection,
  concurrency: 3,
});

const validationWorker = new Worker('lead-validation', processValidationJob, {
  connection,
  concurrency: 2,
});

emailWorker.on('completed', job => console.log(`Email job ${job.id} done`));
emailWorker.on('failed', (job, err) => console.error(`Email job ${job?.id} failed:`, err.message));
warmupWorker.on('failed', (job, err) => console.error(`Warmup job ${job?.id} failed:`, err.message));
validationWorker.on('completed', job => console.log(`Validation job ${job.id} done`));
validationWorker.on('failed', (job, err) => console.error(`Validation job ${job?.id} failed:`, err.message));

console.log('🚀 Lead Genie worker started');

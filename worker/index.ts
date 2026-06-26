import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import { createTransport, replaceVars } from '../lib/mailer';
import { runValidationJob } from '../lib/run-validation-job';

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

  console.log(`? Sent step ${stepNumber} to ${lead.email} (campaign: ${campaign.name})`);
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

const emailWorker = new Worker('email-sending', processEmailJob, {
  connection,
  concurrency: 5,
});

const warmupWorker = new Worker('warmup', processWarmupJob, {
  connection,
  concurrency: 3,
});

const validationWorker = new Worker('lead-validation', async (job) => {
  await runValidationJob(supabase, job.data.jobId, job.data.userId);
}, { connection, concurrency: 2 });

emailWorker.on('completed', job => console.log(`Email job ${job.id} done`));
emailWorker.on('failed', (job, err) => console.error(`Email job ${job?.id} failed:`, err.message));
warmupWorker.on('failed', (job, err) => console.error(`Warmup job ${job?.id} failed:`, err.message));
validationWorker.on('completed', job => console.log(`Validation job ${job.id} done`));
validationWorker.on('failed', (job, err) => console.error(`Validation job ${job?.id} failed:`, err.message));

console.log('?? Leads Genie worker started');

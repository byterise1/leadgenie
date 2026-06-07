export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.REDIS_URL) {
    const { Worker } = await import('bullmq');
    const Redis = (await import('ioredis')).default;
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const { createTransport, replaceVars } = await import('./lib/mailer');

    const connection = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    new Worker('email-sending', async (job) => {
      const { campaignLeadId, stepNumber } = job.data;

      const { data: cl } = await supabase
        .from('campaign_leads')
        .select(`*, lead:leads(*), campaign:campaigns(*, email_steps(*), campaign_accounts(account:email_accounts(*)))`)
        .eq('id', campaignLeadId)
        .single();

      if (!cl || cl.status === 'replied' || cl.status === 'unsubscribed') return;

      const campaign = cl.campaign;
      const step = campaign.email_steps.find((s: any) => s.step_number === stepNumber);
      if (!step) return;

      const accounts = campaign.campaign_accounts.map((ca: any) => ca.account).filter(Boolean);
      if (!accounts.length) return;

      const account = accounts[stepNumber % accounts.length];
      const lead = cl.lead;
      const subject = replaceVars(step.subject, lead);
      const body = replaceVars(step.body, lead);
      const htmlBody = body.split('\n').map((l: string) =>
        l.trim() ? `<p style="margin:0 0 12px 0;font-family:Arial,sans-serif;font-size:14px">${l}</p>` : ''
      ).join('');

      const transport = createTransport(account);
      await transport.sendMail({ from: account.email, to: lead.email, subject, text: body, html: `<html><body>${htmlBody}</body></html>` });

      await supabase.from('sent_emails').insert({
        user_id: campaign.user_id, campaign_id: campaign.id, lead_id: lead.id,
        account_id: account.id, step_number: stepNumber, subject,
      });

      const nextStep = stepNumber + 1;
      const hasNextStep = campaign.email_steps.some((s: any) => s.step_number === nextStep);

      await supabase.from('campaign_leads').update({
        current_step: nextStep,
        last_sent_at: new Date().toISOString(),
        status: hasNextStep ? 'active' : 'completed',
      }).eq('id', campaignLeadId);

      await supabase.rpc('increment_campaign_sent', { campaign_id: campaign.id });

      if (hasNextStep) {
        const { emailQueue } = await import('./lib/queue');
        const nextStepData = campaign.email_steps.find((s: any) => s.step_number === nextStep);
        const delayMs = (nextStepData.delay_days || 3) * 24 * 60 * 60 * 1000;
        await emailQueue.add('send', { campaignLeadId, stepNumber: nextStep }, { delay: delayMs });
      }

      console.log(`✓ Sent step ${stepNumber} to ${lead.email}`);
    }, { connection, concurrency: 5 });

    console.log('✅ Email worker started');
  }
}

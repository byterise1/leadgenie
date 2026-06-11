export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.REDIS_URL) {
    const { Worker } = await import('bullmq');
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const { createTransport, replaceVars } = await import('./lib/mailer');

    const redisUrl = new URL(process.env.REDIS_URL!);
    const connection = {
      host: redisUrl.hostname,
      port: Number(redisUrl.port),
      password: redisUrl.password ? decodeURIComponent(redisUrl.password) : undefined,
      maxRetriesPerRequest: null as null,
      enableReadyCheck: false,
    };

    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const SITE_URL = process.env.SITE_URL || 'https://leadgenie-production.up.railway.app';

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

      // Use accountIndex from scheduler (round-robin), fall back to stepNumber rotation
      const accountIndex = typeof job.data.accountIndex === 'number' ? job.data.accountIndex : stepNumber;
      const account = accounts[accountIndex % accounts.length];

      // Enforce per-account daily limit across all campaigns
      const todayUTC = new Date();
      todayUTC.setUTCHours(0, 0, 0, 0);
      const { count: sentTodayCount } = await supabase
        .from('sent_emails')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', account.id)
        .gte('created_at', todayUTC.toISOString());

      const accountDailyLimit = account.daily_limit ?? 50;
      if ((sentTodayCount || 0) >= accountDailyLimit) {
        // Requeue for 25 hours from now (lands in tomorrow's sending window)
        // Only requeue once (isRequeued flag) to avoid infinite loops
        if (!job.data.isRequeued) {
          const { emailQueue } = await import('./lib/queue');
          await emailQueue.add('send', { ...job.data, isRequeued: true }, {
            delay: 25 * 60 * 60 * 1000,
            attempts: 3,
            backoff: { type: 'exponential', delay: 60000 },
          });
          console.log(`⏸ ${account.email} at daily limit (${accountDailyLimit}/day), requeueing in 25h`);
        } else {
          console.log(`⚠ ${account.email} still at daily limit after requeue — skipping lead ${cl.lead?.email}`);
        }
        return;
      }

      const lead = cl.lead;
      const subject = replaceVars(step.subject, lead);
      const body = replaceVars(step.body, lead);

      // Insert sent_email record first to get the ID for the tracking pixel
      const { data: sentEmail } = await supabase.from('sent_emails').insert({
        user_id: campaign.user_id,
        campaign_id: campaign.id,
        lead_id: lead.id,
        account_id: account.id,
        step_number: stepNumber,
        subject,
      }).select('id').single();

      const trackPixel = sentEmail?.id
        ? `<img src="${SITE_URL}/api/track/open/${sentEmail.id}" width="1" height="1" style="display:none" alt="">`
        : '';

      const htmlBody = body.split('\n').map((l: string) =>
        l.trim() ? `<p style="margin:0 0 12px 0;font-family:Arial,sans-serif;font-size:14px">${l}</p>` : ''
      ).join('');

      const transport = createTransport(account);
      await transport.sendMail({
        from: account.email,
        to: lead.email,
        subject,
        text: body,
        html: `<html><body>${htmlBody}${trackPixel}</body></html>`,
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

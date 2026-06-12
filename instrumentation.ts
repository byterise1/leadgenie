export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.REDIS_URL) {
    const { Worker } = await import('bullmq');
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const { sendEmail, replaceVars } = await import('./lib/mailer');

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

      if (!cl || cl.status === 'replied' || cl.status === 'unsubscribed' || cl.status === 'bounced') return;

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
        .gte('sent_at', todayUTC.toISOString());

      const accountDailyLimit = account.daily_limit ?? 50;
      if ((sentTodayCount || 0) >= accountDailyLimit) {
        if (!job.data.isRequeued) {
          // Write one notification per account per day (not per job)
          const { data: existingNotif } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', campaign.user_id)
            .ilike('message', `%${account.email}%`)
            .gte('created_at', todayUTC.toISOString())
            .limit(1)
            .maybeSingle();

          if (!existingNotif) {
            await supabase.from('notifications').insert({
              user_id: campaign.user_id,
              message: `Account ${account.email} reached its daily send limit of ${accountDailyLimit} emails. Affected emails have been automatically rescheduled for tomorrow.`,
              type: 'warning',
            });
          }

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

      // Credits check — 1 credit per sent email (100 free on free plan)
      const FREE_CREDITS = 100;
      const { data: userCampaigns } = await supabase.from('campaigns').select('id').eq('user_id', campaign.user_id);
      const userCampaignIds = (userCampaigns || []).map((c: any) => c.id as string);
      const { count: usedCredits } = userCampaignIds.length
        ? await supabase.from('sent_emails').select('id', { count: 'exact', head: true }).in('campaign_id', userCampaignIds)
        : { count: 0 };

      if ((usedCredits ?? 0) >= FREE_CREDITS) {
        console.log(`⛔ User ${campaign.user_id} out of credits (${usedCredits}/${FREE_CREDITS})`);
        const { data: existingCreditNotif } = await supabase
          .from('notifications').select('id').eq('user_id', campaign.user_id)
          .ilike('message', '%free email credits%').limit(1).maybeSingle();
        if (!existingCreditNotif) {
          await supabase.from('notifications').insert({
            user_id: campaign.user_id,
            message: `You've used all ${FREE_CREDITS} free email credits. Upgrade your plan to continue sending.`,
            type: 'warning',
          });
        }
        return;
      }

      const lead = cl.lead;
      const subject = replaceVars(step.subject, lead);
      const rawBody = replaceVars(step.body, lead);

      // Insert sent_email record FIRST to get ID for tracking pixel + unsubscribe link
      const { data: sentEmail } = await supabase.from('sent_emails').insert({
        user_id: campaign.user_id,
        campaign_id: campaign.id,
        lead_id: lead.id,
        account_id: account.id,
        step_number: stepNumber,
        subject,
      }).select('id').single();

      // Inject unsubscribe link into body
      const unsubUrl = sentEmail?.id ? `${SITE_URL}/api/unsubscribe/${sentEmail.id}` : '#';
      let body = rawBody.replace(/\{\{unsubscribe_link\}\}/g, unsubUrl);

      // Append unsubscribe footer if step has include_unsub flag
      if (step.include_unsub && sentEmail?.id) {
        body += `\n\n---\nTo unsubscribe from future emails, click here: ${unsubUrl}`;
      }

      const trackPixel = sentEmail?.id
        ? `<img src="${SITE_URL}/api/track/open/${sentEmail.id}" width="1" height="1" style="display:none" alt="">`
        : '';

      const htmlBody = body.split('\n').map((l: string) =>
        l.trim() ? `<p style="margin:0 0 12px 0;font-family:Arial,sans-serif;font-size:14px">${l}</p>` : ''
      ).join('');

      try {
        await sendEmail(account, {
          from: account.email,
          to: lead.email,
          subject,
          text: body,
          html: `<html><body>${htmlBody}${trackPixel}</body></html>`,
        });
      } catch (err: any) {
        if (sentEmail?.id) await supabase.from('sent_emails').delete().eq('id', sentEmail.id);

        const code = err.responseCode as number | undefined;

        // Auth failure (535 = SMTP auth failed, 401 = Gmail API unauthorized)
        if (code === 535 || code === 401 || err.code === 'EAUTH') {
          if (account.type === 'gmail-oauth') {
            await supabase.from('email_accounts').update({ status: 'error' }).eq('id', account.id);
            await supabase.from('notifications').insert({
              user_id: campaign.user_id,
              message: `Gmail account ${account.email} needs to be re-authorised. Go to Email Accounts to reconnect.`,
              type: 'error',
            });
            console.error(`🔐 Auth failure for ${account.email} — marked as error`);
            return;
          }
        }

        // Hard bounce (5xx delivery failure) — don't retry
        if (typeof code === 'number' && code >= 550) {
          await Promise.all([
            supabase.from('leads').update({ status: 'bounced' }).eq('id', lead.id),
            supabase.from('campaign_leads').update({ status: 'bounced' }).eq('id', campaignLeadId),
          ]);
          console.log(`⛔ Bounced: ${lead.email} (${code})`);
          return;
        }

        throw err; // Transient error → BullMQ retries
      }

      const nextStep = stepNumber + 1;
      const hasNextStep = campaign.email_steps.some((s: any) => s.step_number === nextStep);

      await supabase.from('campaign_leads').update({
        current_step: nextStep,
        last_sent_at: new Date().toISOString(),
        status: hasNextStep ? 'active' : 'completed',
      }).eq('id', campaignLeadId);

      // Direct increment — avoids needing a separate DB function
      const { data: campRow } = await supabase.from('campaigns').select('total_sent').eq('id', campaign.id).single();
      await supabase.from('campaigns').update({ total_sent: (campRow?.total_sent || 0) + 1 }).eq('id', campaign.id);

      if (hasNextStep) {
        const { emailQueue } = await import('./lib/queue');
        const nextStepData = campaign.email_steps.find((s: any) => s.step_number === nextStep);
        // TEST MODE: 1 unit = 1 minute. Revert to 24*60*60*1000 for production (days).
        const DELAY_UNIT_MS = 60 * 1000;
        const delayMs = (nextStepData.delay_days || 1) * DELAY_UNIT_MS;
        await emailQueue.add('send', { campaignLeadId, stepNumber: nextStep }, { delay: delayMs });
      }

      console.log(`✓ Sent step ${stepNumber} to ${lead.email}`);
    }, { connection, concurrency: 5 });

    console.log('✅ Email worker started');
  }
}

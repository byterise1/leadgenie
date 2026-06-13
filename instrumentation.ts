const TZ_MAP: Record<string, string> = {
  'UTC': 'UTC',
  'US/Eastern (EST)': 'America/New_York',
  'US/Pacific (PST)': 'America/Los_Angeles',
  'Europe/London (GMT)': 'Europe/London',
  'Asia/Karachi (PKT)': 'Asia/Karachi',
  'Asia/Dubai (GST)': 'Asia/Dubai',
};

function parseMins(s: unknown): number {
  if (!s) return 9 * 60;
  const str = String(s);
  const m24 = str.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) return parseInt(m24[1]) * 60 + parseInt(m24[2]);
  const m12 = str.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (m12) {
    let h = parseInt(m12[1]);
    const mins = parseInt(m12[2]);
    if (m12[3].toUpperCase() === 'PM' && h !== 12) h += 12;
    if (m12[3].toUpperCase() === 'AM' && h === 12) h = 0;
    return h * 60 + mins;
  }
  return 9 * 60;
}

function getLocalMinutes(ms: number, zone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, hour: 'numeric', minute: 'numeric', hour12: false,
  }).formatToParts(new Date(ms));
  const h = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0') % 24;
  const m = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0');
  return h * 60 + m;
}

function getLocalDayIdx(ms: number, zone: string): number {
  // 0=Monday … 6=Sunday (matches active_days array)
  const day = new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'long' }).format(new Date(ms));
  const map: Record<string, number> = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };
  return map[day] ?? 0;
}

// Given a target fire time, snap it forward into the next open sending window on an active day
function adjustToWindow(targetMs: number, campaign: any): number {
  const zone = TZ_MAP[campaign.timezone] || 'UTC';
  const fromMins = parseMins(campaign.from_hour);
  const windowMins = Math.max(5, parseMins(campaign.to_hour) - fromMins);
  const windowEndMins = fromMins + windowMins;
  const activeDays: boolean[] = Array.isArray(campaign.active_days)
    ? campaign.active_days
    : [true, true, true, true, true, false, false];

  let t = targetMs;
  for (let guard = 0; guard < 8; guard++) {
    const localMins = getLocalMinutes(t, zone);
    const dayActive = activeDays[getLocalDayIdx(t, zone)];

    if (!dayActive) {
      // Skip to next day's window start
      const minsUntilNext = (24 * 60 - localMins) + fromMins;
      t += minsUntilNext * 60 * 1000;
      continue;
    }
    if (localMins < fromMins) {
      // Before window today — push to window start
      t += (fromMins - localMins) * 60 * 1000;
      break;
    }
    if (localMins < windowEndMins) {
      // Already inside window
      break;
    }
    // Past window — push to next day's window start
    const minsUntilNext = (24 * 60 - localMins) + fromMins;
    t += minsUntilNext * 60 * 1000;
  }
  return t;
}

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
      if (cl.lead?.status === 'unsubscribed') return;

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

      // Credits check — read from profiles so top-ups are instantly honoured
      const { data: profileData } = await supabase
        .from('profiles')
        .select('credits_used, credits_total')
        .eq('id', campaign.user_id)
        .single();
      const creditsUsed = profileData?.credits_used ?? 0;
      const creditsTotal = profileData?.credits_total ?? 100;

      if (creditsUsed >= creditsTotal) {
        console.log(`⛔ User ${campaign.user_id} out of credits (${creditsUsed}/${creditsTotal})`);
        const { data: existingCreditNotif } = await supabase
          .from('notifications').select('id').eq('user_id', campaign.user_id)
          .ilike('message', '%email credits%').limit(1).maybeSingle();
        if (!existingCreditNotif) {
          await supabase.from('notifications').insert({
            user_id: campaign.user_id,
            message: `You've used all ${creditsTotal} email credits. Upgrade your plan or add more credits to continue sending.`,
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

      // Save body BEFORE appending plain-text footer (used for HTML conversion below)
      const bodyForHtml = body;

      // Append minimal plain-text footer for email clients that display text/plain
      if (step.include_unsub && sentEmail?.id) {
        body += `\n\n--\nDon't want these emails? Unsubscribe: ${unsubUrl}`;
      }

      const trackPixel = sentEmail?.id
        ? `<img src="${SITE_URL}/api/track/open/${sentEmail.id}" width="1" height="1" style="display:none" alt="">`
        : '';

      const clickBase = sentEmail?.id ? `${SITE_URL}/api/track/click/${sentEmail.id}` : null;

      // Build HTML safely: treat lines with existing <a> tags differently from plain text
      const BLOCK_RE = /^<(p|div|ul|ol|h[1-6]|table|blockquote|pre|hr)\b/i;
      const htmlLines = bodyForHtml.split('\n').map((l: string) => {
        const t = l.trim();
        if (!t) return '';

        let processed: string;
        if (/<a[\s>]/i.test(t)) {
          // Line has existing <a> tags — only rewrite href values for click tracking, don't touch content
          processed = clickBase
            ? t.replace(/href="(https?:\/\/[^"]+)"/g, (_m: string, url: string) => {
                if (url.includes('/api/track/') || url.includes('/api/unsubscribe/')) return `href="${url}"`;
                return `href="${clickBase}?url=${encodeURIComponent(url)}"`;
              })
            : t;
        } else {
          // Plain text line — wrap bare URLs in <a> tags
          processed = t.replace(/(https?:\/\/[^\s<>"]+)/g, (url: string) => {
            if (!clickBase || url.includes('/api/track/') || url.includes('/api/unsubscribe/')) {
              return `<a href="${url}" style="color:#2563eb;text-decoration:underline">${url}</a>`;
            }
            return `<a href="${clickBase}?url=${encodeURIComponent(url)}" style="color:#2563eb;text-decoration:underline">${url}</a>`;
          });
        }

        if (BLOCK_RE.test(processed)) return processed;
        return `<p style="margin:0 0 12px 0;font-family:Arial,sans-serif;font-size:14px;color:#111">${processed}</p>`;
      }).join('\n');

      // Clean HTML unsubscribe footer — personal tone, small/muted, not marketing-style
      const unsubHtml = step.include_unsub && sentEmail?.id
        ? `<p style="margin:20px 0 0 0;padding-top:12px;border-top:1px solid #f0f0f0;font-family:Arial,sans-serif;font-size:11px;color:#aaa;line-height:1.5">If you'd prefer not to hear from me, <a href="${unsubUrl}" style="color:#aaa;text-decoration:underline">unsubscribe here</a>.</p>`
        : '';

      const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;font-size:14px;color:#111;max-width:600px;margin:0 auto;padding:24px">${htmlLines}${unsubHtml}${trackPixel}</body></html>`;

      try {
        const fromName = campaign.from_name?.trim();
        const fromHeader = fromName ? `"${fromName}" <${account.email}>` : account.email;
        const { threadId } = await sendEmail(account, {
          from: fromHeader,
          to: lead.email,
          subject,
          text: body,
          html: fullHtml,
        });

        // Store Gmail threadId for reply detection
        if (sentEmail?.id && threadId) {
          await supabase.from('sent_emails').update({ message_id: threadId }).eq('id', sentEmail.id);
        }
      } catch (err: any) {
        if (sentEmail?.id) await supabase.from('sent_emails').delete().eq('id', sentEmail.id);

        const code = err.responseCode as number | undefined;

        // Auth failure (535 = SMTP auth failed / Gmail API config error, 401 = Gmail API unauthorized)
        if (code === 535 || code === 401 || err.code === 'EAUTH') {
          await supabase.from('email_accounts').update({ status: 'error' }).eq('id', account.id);
          await supabase.from('notifications').insert({
            user_id: campaign.user_id,
            message: `Sending account ${account.email} has an error: ${err.message}`,
            type: 'error',
          });
          console.error(`🔐 Auth/config failure for ${account.email}: ${err.message}`);
          return;
        }

        // Hard bounce (5xx delivery failure) — don't retry
        if (typeof code === 'number' && code >= 550) {
          await Promise.all([
            supabase.from('leads').update({ status: 'bounced' }).eq('id', lead.id),
            supabase.from('campaign_leads').update({ status: 'bounced' }).eq('id', campaignLeadId),
          ]);
          console.log(`⛔ Bounced: ${lead.email} (${code})`);
          const { count: pendingAfterBounce } = await supabase
            .from('campaign_leads')
            .select('id', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .in('status', ['pending', 'active']);
          if (pendingAfterBounce === 0) {
            await supabase.from('campaigns').update({ status: 'completed' }).eq('id', campaign.id);
          }
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

      // Increment campaign total_sent
      const { data: campRow } = await supabase.from('campaigns').select('total_sent').eq('id', campaign.id).single();
      await supabase.from('campaigns').update({ total_sent: (campRow?.total_sent || 0) + 1 }).eq('id', campaign.id);

      // Deduct 1 credit from profile — profiles is the source of truth for billing
      const { data: profRow } = await supabase.from('profiles').select('credits_used').eq('id', campaign.user_id).single();
      await supabase.from('profiles').update({ credits_used: (profRow?.credits_used || 0) + 1 }).eq('id', campaign.user_id);

      // Auto-complete campaign when all leads are in a terminal state
      if (!hasNextStep) {
        const { count: pendingCount } = await supabase
          .from('campaign_leads')
          .select('id', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id)
          .in('status', ['pending', 'active']);
        if (pendingCount === 0) {
          await supabase.from('campaigns').update({ status: 'completed' }).eq('id', campaign.id);
          console.log(`✅ Campaign "${campaign.name}" auto-completed`);
        }
      }

      if (hasNextStep) {
        const { emailQueue } = await import('./lib/queue');
        const nextStepData = campaign.email_steps.find((s: any) => s.step_number === nextStep);
        // TEST MODE: 1 unit = 1 minute. Revert to 24*60*60*1000 for production (days).
        const DELAY_UNIT_MS = 60 * 1000;
        const rawDelayMs = (nextStepData.delay_days || 1) * DELAY_UNIT_MS;
        const targetFireMs = Date.now() + rawDelayMs;
        const adjustedFireMs = adjustToWindow(targetFireMs, campaign);
        const delayMs = Math.max(0, adjustedFireMs - Date.now());
        await emailQueue.add('send', { campaignLeadId, stepNumber: nextStep }, { delay: delayMs });
      }

      console.log(`✓ Sent step ${stepNumber} to ${lead.email}`);
    }, { connection, concurrency: 5 });

    console.log('✅ Email worker started');
  }
}

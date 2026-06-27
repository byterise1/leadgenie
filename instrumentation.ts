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
    const crypto = await import('crypto');

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

    const SITE_URL = process.env.SITE_URL
      || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null)
      || 'https://LeadsAdd-production.up.railway.app';

    // Helper: create in-app notification only if user has the pref enabled
    async function notifyIfEnabled(
      db: typeof supabase,
      userId: string,
      pref: string,
      message: string,
      type: 'info' | 'warning' | 'error' = 'info',
      link?: string,
    ) {
      const { data: prof } = await db.from('profiles').select(pref).eq('id', userId).maybeSingle();
      if ((prof as Record<string, unknown> | null)?.[pref] === false) return;
      const payload: Record<string, unknown> = { user_id: userId, message, type };
      if (link) payload.link = link;
      const { error } = await db.from('notifications').insert(payload);
      if (error) console.error('[notification] insert failed:', error.message);
    }

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

      // Honour pause: if campaign was paused after this job was queued, skip silently.
      // Resume route will re-queue pending/active leads correctly.
      if (campaign.status === 'paused') {
        console.log(`[paused] ${campaign.name} is paused — skipping ${cl.lead?.email}`);
        return;
      }
      const step = campaign.email_steps.find((s: any) => s.step_number === stepNumber);
      if (!step) return;

      const accounts = campaign.campaign_accounts.map((ca: any) => ca.account).filter(Boolean);
      if (!accounts.length) return;

      // Follow-ups must use the SAME account that sent step 0 for this lead.
      // The scheduler passes accountId for step 0; we lock it for all follow-ups.
      let account;
      if (job.data.accountId) {
        account = accounts.find((a: any) => a.id === job.data.accountId);
      }
      if (!account) {
        // Step 0: round-robin from scheduler. Also fallback if account was removed from campaign.
        const accountIndex = typeof job.data.accountIndex === 'number' ? job.data.accountIndex : 0;
        account = accounts[accountIndex % accounts.length];
      }

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

      // Credits check only on step 0 (first email) — follow-ups are free
      const { data: profileData } = await supabase
        .from('profiles')
        .select('credits_used, credits_total')
        .eq('id', campaign.user_id)
        .single();
      const creditsUsed = profileData?.credits_used ?? 0;
      const creditsTotal = profileData?.credits_total ?? 100;

      if (stepNumber === 0 && creditsUsed >= creditsTotal) {
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

      // Idempotency: if this step was already sent (BullMQ retry after a partial failure),
      // skip to avoid sending duplicate emails
      const { count: alreadySentCount } = await supabase
        .from('sent_emails')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .eq('lead_id', lead.id)
        .eq('step_number', stepNumber);
      if ((alreadySentCount ?? 0) > 0) {
        console.log(`[idempotency] step ${stepNumber} already sent to ${lead.email} — skipping retry duplicate`);
        // Re-queue the next step in case it was lost (e.g. Redis blip between send and queue call)
        const _nextStep = stepNumber + 1;
        const _hasNext = campaign.email_steps.some((s: any) => s.step_number === _nextStep);
        if (_hasNext && cl.status === 'active') {
          const { count: _nextSent } = await supabase
            .from('sent_emails')
            .select('id', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .eq('lead_id', lead.id)
            .eq('step_number', _nextStep);
          if ((_nextSent ?? 0) === 0) {
            const { emailQueue: _eq } = await import('./lib/queue');
            const _nextStepData = campaign.email_steps.find((s: any) => s.step_number === _nextStep);
            const _delayMs = Math.max(0, adjustToWindow(Date.now() + (_nextStepData.delay_days || 1) * 60_000, campaign) - Date.now());
            await _eq.add('send', { campaignLeadId, stepNumber: _nextStep, accountId: account.id }, { delay: _delayMs });
            console.log(`[idempotency-requeue] queued step ${_nextStep} for ${lead.email}`);
          }
        }
        return;
      }

      // For follow-up steps: do a fresh reply check right before sending.
      // The initial status check above uses cached DB state; a reply may have arrived
      // between when the job was queued and when it fires (especially with short delays).
      if (stepNumber > 0) {
        const { count: replyCount } = await supabase
          .from('sent_emails')
          .select('id', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id)
          .eq('lead_id', lead.id)
          .not('replied_at', 'is', null);
        if ((replyCount ?? 0) > 0) {
          await supabase.from('campaign_leads').update({ status: 'replied' }).eq('id', campaignLeadId);
          console.log(`[skip-followup] ${lead.email} already replied — cancelling step ${stepNumber}`);
          return;
        }
      }

      const isReplyThread = stepNumber > 0 && step.thread_mode === 'reply';

      // For reply-in-thread follow-ups: look up step 0's message_id + subject
      let inReplyTo: string | undefined;
      let gmailThreadId: string | undefined;
      let originalSubject: string | undefined;
      if (isReplyThread) {
        // Fetch earliest step 0 row — use limit(1) + order to handle rare duplicate sends
        const { data: firstSent } = await supabase
          .from('sent_emails')
          .select('message_id, subject')
          .eq('campaign_id', campaign.id)
          .eq('lead_id', lead.id)
          .eq('step_number', 0)
          .order('sent_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (firstSent?.message_id) {
          if (account.type === 'gmail-oauth') {
            gmailThreadId = firstSent.message_id;
          } else {
            inReplyTo = firstSent.message_id;
          }
        }
        // Always capture original subject for reply steps — used even when threading fails
        originalSubject = firstSent?.subject || undefined;
      }

      // A/B variant selection: randomly pick A (base) or B/C... (ab_variants array)
      const abVariants: { subject: string; body: string }[] = Array.isArray(step.ab_variants) ? step.ab_variants : [];
      const hasAb = abVariants.length > 0 && abVariants[0]?.body?.trim();
      let chosenVariant = 'A';
      let chosenSubject = step.subject || '';
      let chosenBody = step.body || '';
      if (hasAb) {
        // 50/50 split: 0 = A, 1 = B
        const pick = Math.floor(Math.random() * (abVariants.length + 1));
        if (pick > 0) {
          chosenVariant = String.fromCharCode(65 + pick); // 'B', 'C', etc.
          chosenSubject = abVariants[pick - 1].subject || step.subject || '';
          chosenBody = abVariants[pick - 1].body || step.body || '';
        }
      }

      // Follow-up subject: ALWAYS use original step 0 subject for reply-in-thread steps.
      const subject = isReplyThread
        ? (originalSubject ?? replaceVars(chosenSubject, lead))
        : replaceVars(chosenSubject, lead);
      const rawBody = replaceVars(chosenBody, lead);

      // Insert sent_email record FIRST to get ID for tracking pixel + unsubscribe link
      const { data: sentEmail } = await supabase.from('sent_emails').insert({
        user_id: campaign.user_id,
        campaign_id: campaign.id,
        lead_id: lead.id,
        account_id: account.id,
        step_number: stepNumber,
        subject,
        sent_at: new Date().toISOString(),
        ab_variant: chosenVariant,
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
        ? `<img src="${SITE_URL}/api/track/open/${sentEmail.id}" width="1" height="1" alt="" border="0">`
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
        // Generate a stable Message-ID for step 0 so we control what's stored
        // and can reliably reference it in follow-up In-Reply-To headers
        const explicitMessageId = stepNumber === 0
          ? `<${crypto.randomUUID().replace(/-/g, '')}@leadgenie.app>`
          : undefined;

        const { threadId } = await sendEmail(account, {
          from: fromHeader,
          to: lead.email,
          subject,
          text: body,
          html: fullHtml,
          ...(explicitMessageId ? { messageId: explicitMessageId } : {}),
          ...(inReplyTo ? { inReplyTo, references: inReplyTo } : {}),
          ...(gmailThreadId ? { gmailThreadId, inReplyTo: gmailThreadId, references: gmailThreadId } : {}),
        });

        // What to store in message_id:
        // - Step 0 SMTP: our explicit Message-ID (used as In-Reply-To by follow-ups)
        // - Step 0 Gmail OAuth: threadId from API (used as gmailThreadId by follow-ups)
        // - Follow-up steps: don't overwrite step 0's stored value
        const storeMessageId = stepNumber === 0
          ? (account.type === 'gmail-oauth' ? threadId : explicitMessageId)
          : null;

        if (sentEmail?.id && storeMessageId) {
          await supabase.from('sent_emails').update({ message_id: storeMessageId }).eq('id', sentEmail.id);
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
            await notifyIfEnabled(supabase, campaign.user_id, 'notif_campaign_complete',
              `Campaign "${campaign.name}" has completed sending.`, 'info', `/dashboard/campaigns/${campaign.id}`);
          }
          return;
        }

        console.error(`⛔ Transient error [${lead.email}] code=${err?.code} responseCode=${err?.responseCode} msg=${err?.message}`);
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

      // Deduct 1 credit only on step 0 (first email) — follow-ups are free
      if (stepNumber === 0) {
        const { data: profRow } = await supabase.from('profiles').select('credits_used').eq('id', campaign.user_id).single();
        await supabase.from('profiles').update({ credits_used: (profRow?.credits_used || 0) + 1 }).eq('id', campaign.user_id);
      }

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
          await notifyIfEnabled(supabase, campaign.user_id, 'notif_campaign_complete',
            `Campaign "${campaign.name}" has completed sending.`, 'info', `/dashboard/campaigns/${campaign.id}`);
        }
      }

      if (hasNextStep) {
        const { emailQueue } = await import('./lib/queue');
        const nextStepData = campaign.email_steps.find((s: any) => s.step_number === nextStep);
        // TESTING: 1 unit = 1 minute. Change to 24*60*60*1000 before production launch.
        const DELAY_UNIT_MS = 60 * 1000;
        const rawDelayMs = (nextStepData.delay_days || 1) * DELAY_UNIT_MS;
        const targetFireMs = Date.now() + rawDelayMs;
        const adjustedFireMs = adjustToWindow(targetFireMs, campaign);
        const delayMs = Math.max(0, adjustedFireMs - Date.now());
        await emailQueue.add('send', { campaignLeadId, stepNumber: nextStep, accountId: account.id }, { delay: delayMs });
      }

      console.log(`✓ Sent step ${stepNumber} to ${lead.email}`);
    }, { connection, concurrency: 5 }).on('failed', (job, err) => {
      console.error(`❌ Job permanently failed after all retries | campaignLeadId=${job?.data?.campaignLeadId} | ${err?.message}`);
    });

    console.log('✅ Email worker started');

    // ── Server-side inbox sync (runs every 90s on Railway, no browser needed) ──
    const { Queue, Worker: SyncWorker } = await import('bullmq');
    const { getAccessToken, fetchImapReplies: imapFetch } = await import('./lib/mailer').then(async m => ({
      getAccessToken: m.getAccessToken,
      fetchImapReplies: (await import('./lib/imap-reader')).fetchImapReplies,
    }));

    const syncQueue = new Queue('inbox-sync', { connection });
    await syncQueue.upsertJobScheduler('sync-all-users', { every: 90_000 }, { name: 'sync', data: {} });

    const SYSTEM_PATTERNS = [
      'mailer-daemon', 'postmaster', 'noreply', 'no-reply', 'bounce',
      'delivery', 'auto-reply', 'autoreply', 'do-not-reply', 'donotreply',
      'notifications@', 'notification@',
    ];

    function cleanSnip(raw: string): string {
      return raw
        .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
        .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
    }

    async function gmailGet(path: string, token: string) {
      const res = await fetch(`https://gmail.googleapis.com${path}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return null;
      return res.json();
    }

    function hdr(headers: { name: string; value: string }[] | undefined, name: string) {
      return headers?.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
    }

    new SyncWorker('inbox-sync', async () => {
      // Fetch all connected, non-error accounts across all users
      const { data: accounts } = await supabase
        .from('email_accounts')
        .select('*')
        .neq('status', 'error');

      if (!accounts?.length) return;

      for (const account of accounts) {
        try {
          if (account.type === 'gmail-oauth') {
            // ── Gmail OAuth path ─────────────────────────────────────────────
            let token: string;
            try { token = await getAccessToken(account); } catch (e: any) {
              console.error(`[inbox-sync] token refresh failed for ${account.email}:`, e.message);
              continue;
            }

            // Helper: process a detected reply for a sent email row
            async function processReply(sent: any, replyMsg: any, replySnippet: string) {
              const fromHeader = hdr(replyMsg.payload?.headers, 'From');
              const dateHeader = hdr(replyMsg.payload?.headers, 'Date');
              const subjectHeader = hdr(replyMsg.payload?.headers, 'Subject') || sent.subject;
              const match = fromHeader.match(/^(.+?)\s*<(.+?)>$/);
              const fromName = (match ? match[1].replace(/"/g, '').trim() : fromHeader) || '';
              const fromEmail = (match ? match[2].trim() : fromHeader) || '';
              const receivedAt = dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString();

              const { data: existing } = await supabase
                .from('inbox_threads').select('id')
                .eq('user_id', account.user_id)
                .eq('lead_id', sent.lead_id)
                .eq('campaign_id', sent.campaign_id)
                .maybeSingle();

              if (!existing) {
                await supabase.from('inbox_threads').insert({
                  user_id: account.user_id, campaign_id: sent.campaign_id,
                  lead_id: sent.lead_id, account_id: account.id,
                  subject: subjectHeader, last_message: cleanSnip(replySnippet || ''),
                  from_email: fromEmail, from_name: fromName,
                  status: 'new', read: false, received_at: receivedAt,
                });
                await notifyIfEnabled(supabase, account.user_id, 'notif_new_reply',
                  `New reply from ${fromName || fromEmail} — "${subjectHeader}"`,
                  'info', '/dashboard/inbox');
              }
              await supabase.from('sent_emails').update({ replied_at: receivedAt }).eq('id', sent.id);
              if (sent.lead_id && sent.campaign_id) {
                await supabase.from('campaign_leads').update({ status: 'replied' })
                  .eq('lead_id', sent.lead_id).eq('campaign_id', sent.campaign_id);
              }
              console.log(`[inbox-sync] ✓ Reply recorded from ${fromEmail} → campaign ${sent.campaign_id}`);
            }

            // ── Path 1: stored threadId lookup ───────────────────────────────
            const { data: sentEmails } = await supabase
              .from('sent_emails')
              .select('id, message_id, lead_id, campaign_id, subject')
              .eq('account_id', account.id)
              .not('message_id', 'is', null)
              .is('replied_at', null)
              .limit(30);

            const handledThreadIds = new Set<string>();

            for (const sent of (sentEmails || [])) {
              try {
                const thread = await gmailGet(
                  `/gmail/v1/users/me/threads/${sent.message_id}?format=metadata&metadataHeaders=From,Subject,Date`,
                  token,
                );
                if (!thread?.messages || thread.messages.length <= 1) continue;
                handledThreadIds.add(sent.message_id);

                const reply = thread.messages.slice(1).find((m: any) => {
                  if (m.labelIds?.includes('SENT')) return false;
                  const from = (hdr(m.payload?.headers, 'From') || '').toLowerCase();
                  if (!from || from.includes(account.email.toLowerCase())) return false;
                  return !SYSTEM_PATTERNS.some(p => from.includes(p));
                });
                if (!reply) continue;

                if (hdr(reply.payload?.headers, 'Date')) {
                  const sentTime = new Date(hdr(thread.messages[0].payload?.headers, 'Date')).getTime();
                  if (new Date(hdr(reply.payload?.headers, 'Date')).getTime() <= sentTime) continue;
                }

                await processReply(sent, reply, reply.snippet || '');
              } catch (e: any) {
                console.error(`[inbox-sync] thread check error for ${account.email}:`, e.message);
              }
            }

            // ── Path 2: scan Gmail INBOX for unread replies (catches cases where ──
            // ── threadId wasn't stored or message_id column update was missed)  ──
            try {
              const inboxRes = await gmailGet(
                `/gmail/v1/users/me/messages?labelIds=INBOX,UNREAD&maxResults=25`,
                token,
              );
              for (const msgRef of (inboxRes?.messages || [])) {
                try {
                  const msg = await gmailGet(
                    `/gmail/v1/users/me/messages/${msgRef.id}?format=metadata&metadataHeaders=From,Subject,Date`,
                    token,
                  );
                  if (!msg) continue;
                  if (handledThreadIds.has(msg.threadId)) continue; // already handled above

                  const fromRaw = hdr(msg.payload?.headers, 'From');
                  const fromEmailMatch = fromRaw.match(/<(.+?)>/);
                  const fromEmail = (fromEmailMatch ? fromEmailMatch[1] : fromRaw).toLowerCase().trim();
                  if (!fromEmail || fromEmail === account.email.toLowerCase()) continue;
                  if (SYSTEM_PATTERNS.some(p => fromEmail.includes(p))) continue;

                  // Find the lead with this email address
                  const { data: leadRow } = await supabase
                    .from('leads')
                    .select('id')
                    .eq('user_id', account.user_id)
                    .ilike('email', fromEmail)
                    .maybeSingle();
                  if (!leadRow) continue;

                  // Find the most recent sent email to this lead that hasn't been replied to
                  const { data: sentRow } = await supabase
                    .from('sent_emails')
                    .select('id, lead_id, campaign_id, subject')
                    .eq('account_id', account.id)
                    .eq('lead_id', leadRow.id)
                    .is('replied_at', null)
                    .order('sent_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                  if (!sentRow) continue;

                  // Backfill threadId so future syncs use the faster path
                  if (msg.threadId) {
                    await supabase.from('sent_emails').update({ message_id: msg.threadId }).eq('id', sentRow.id);
                    handledThreadIds.add(msg.threadId);
                  }

                  await processReply(sentRow, msg, msg.snippet || '');
                } catch { /* skip individual message */ }
              }
            } catch { /* skip inbox scan errors */ }

          } else if (account.imap_host || account.smtp_host || account.type === 'gmail-app') {
            // ── IMAP path (Gmail App Password, Titan, Zoho, Custom SMTP) ────
            // Auto-derive IMAP host from SMTP host if not explicitly set
            // e.g. smtp.titan.email → imap.titan.email, smtp.zoho.com → imap.zoho.com
            const imapHost = account.imap_host
              || (account.smtp_host ? account.smtp_host.replace(/^smtp\./i, 'imap.') : 'imap.gmail.com');
            const imapPort = account.imap_port || 993;

            const { data: sentEmails } = await supabase
              .from('sent_emails')
              .select('id, message_id, lead_id, campaign_id, subject')
              .eq('account_id', account.id)
              .not('message_id', 'is', null)
              .is('replied_at', null)
              .limit(50);

            if (!sentEmails?.length) continue;

            const replies = await imapFetch(
              {
                imap_host: imapHost,
                imap_port: imapPort,
                smtp_user: account.smtp_user || account.email,
                smtp_pass: account.smtp_pass,
                email: account.email,
              },
              sentEmails.map((s: any) => s.message_id),
            );

            for (const reply of replies) {
              if (SYSTEM_PATTERNS.some(p => reply.fromEmail.toLowerCase().includes(p))) continue;
              const sent = sentEmails.find((s: any) => s.message_id === reply.inReplyTo);
              if (!sent) continue;

              const { data: existing } = await supabase
                .from('inbox_threads').select('id')
                .eq('user_id', account.user_id)
                .eq('lead_id', sent.lead_id)
                .eq('campaign_id', sent.campaign_id)
                .maybeSingle();

              if (!existing) {
                await supabase.from('inbox_threads').insert({
                  user_id: account.user_id, campaign_id: sent.campaign_id,
                  lead_id: sent.lead_id, account_id: account.id,
                  subject: reply.subject || sent.subject,
                  last_message: reply.snippet || `Reply from ${reply.fromEmail}`,
                  from_email: reply.fromEmail, from_name: reply.fromName,
                  status: 'new', read: false, received_at: reply.receivedAt,
                });
                await notifyIfEnabled(supabase, account.user_id, 'notif_new_reply',
                  `New reply from ${reply.fromName || reply.fromEmail} — "${reply.subject || sent.subject}"`,
                  'info', '/dashboard/inbox');
              } else if (reply.snippet && existing.id) {
                // Backfill snippet for threads that were created before snippet support
                await supabase.from('inbox_threads')
                  .update({ last_message: reply.snippet })
                  .eq('id', existing.id)
                  .like('last_message', 'Reply from %');
              }

              await supabase.from('sent_emails').update({ replied_at: reply.receivedAt }).eq('id', sent.id);
              if (sent.lead_id && sent.campaign_id) {
                await supabase.from('campaign_leads').update({ status: 'replied' })
                  .eq('lead_id', sent.lead_id).eq('campaign_id', sent.campaign_id);
              }
            }
          }
        } catch (err) {
          console.error(`[sync-worker] error for ${account.email}:`, (err as Error).message);
        }
      }
    }, { connection, concurrency: 1 });

    console.log('✅ Inbox sync worker started (every 90s)');

    // ── Warmup worker (runs every 6 hours) ──────────────────────────────────
    const warmupQueue = new Queue('warmup', { connection });
    await warmupQueue.upsertJobScheduler('warmup-daily', { every: 6 * 60 * 60_000 }, { name: 'warmup', data: {} });

    // Fire immediately on first startup if no warmup emails exist yet
    const { count: warmupCount } = await supabase.from('warmup_emails').select('id', { count: 'exact', head: true });
    if ((warmupCount ?? 0) === 0) {
      await warmupQueue.add('warmup-bootstrap', {}, { delay: 5000 }); // 5s delay to let worker register first
      console.log('[warmup] No prior warmup emails found — triggering bootstrap run in 5s');
    }

    // Paired templates: each entry = { subject, body, reply }
    // Reply is contextually matched to the initial email topic
    const WARMUP_PAIRS: { subject: string; body: string; reply: string }[] = [
      {
        subject: 'Quick question about Q3 planning',
        body: 'Hi,\n\nHope your Q3 is going well. I had a quick question about how your team is structuring priorities for the rest of the quarter — are you focusing more on growth or efficiency?\n\nWould love to hear your thoughts.\n\nBest',
        reply: 'Good question! We\'re leaning toward efficiency this quarter — trying to tighten up processes before pushing growth again. How about your side?',
      },
      {
        subject: 'Saw your LinkedIn post — had to reach out',
        body: 'Hi,\n\nI came across your recent post and it really resonated with me. The point about building systems before scaling was something I\'ve been thinking about a lot lately.\n\nWould love to connect and exchange ideas sometime.\n\nBest regards',
        reply: 'Thanks for reaching out! That post got a lot of engagement — clearly it struck a chord. Happy to connect and chat more about it.',
      },
      {
        subject: 'Referral from a mutual connection',
        body: 'Hello,\n\nA mutual colleague suggested I reach out to you. They mentioned you\'ve done some interesting work in the ops space and thought we\'d have a lot to talk about.\n\nLooking forward to connecting.\n\nWarm regards',
        reply: 'Great to hear from you! Always happy to connect with people in the same space. What kind of work are you focused on right now?',
      },
      {
        subject: 'Following up on last week\'s conference',
        body: 'Hi,\n\nIt was great seeing you at the conference last week. I\'ve been thinking about the panel discussion on AI in sales — some really eye-opening perspectives.\n\nWanted to follow up and stay in touch.\n\nCheers',
        reply: 'Great connecting with you too! That panel was one of the highlights for me. The bit about AI replacing SDRs was controversial but probably not far off.',
      },
      {
        subject: 'Thoughts on the market shift?',
        body: 'Hello,\n\nWith everything happening in the market right now, I\'m curious how your team is adapting. We\'ve been seeing a real shift in buyer behavior over the last 6 months.\n\nWould love to hear how you\'re navigating it.\n\nBest',
        reply: 'Definitely feeling it on our end too. Buyers are taking longer to decide and asking a lot more questions before committing. We\'ve had to rethink our whole nurture sequence.',
      },
      {
        subject: 'Collaboration opportunity?',
        body: 'Hi,\n\nI\'ve been following your work for a while and think there could be a really interesting collaboration opportunity between our teams.\n\nWould you be open to a quick 20-min call to explore?\n\nBest regards',
        reply: 'Appreciate you reaching out! Always open to exploring collaborations. Send me some times that work for you and we\'ll find a slot.',
      },
      {
        subject: 'Re: the article you shared',
        body: 'Hello,\n\nI saw the article you shared about outbound strategies and found it really useful — especially the part about personalization at scale.\n\nDo you have any resources you\'d recommend on that topic?\n\nThanks',
        reply: 'Glad it was helpful! For personalization at scale, I\'d recommend checking out some of the work coming out of the Pavilion community. Lots of good frameworks there.',
      },
      {
        subject: 'Quick intro — we work in similar spaces',
        body: 'Hi,\n\nI was looking through my network and noticed we work in overlapping spaces. I\'d love to stay connected and share notes on what\'s working.\n\nNo agenda — just think it\'d be valuable to know each other.\n\nWarm regards',
        reply: 'Totally agree — always good to build those peer connections. What\'s your focus area within the space? I work mostly on the go-to-market side.',
      },
      {
        subject: 'Hiring insight — curious about your approach',
        body: 'Hello,\n\nWe\'re in the middle of scaling our team and I\'ve been researching how companies our size approach the first sales hire.\n\nHave you been through that stage? Would love any perspective.\n\nBest',
        reply: 'Been through it twice! The biggest mistake is hiring before the process is repeatable. Happy to share what worked for us if you want to jump on a call.',
      },
      {
        subject: 'Loved your take on cold email',
        body: 'Hi,\n\nI read your thoughts on cold email and you\'re spot on — most people over-engineer the copy and forget that deliverability is half the battle.\n\nAre you still experimenting with warm-up strategies?\n\nCheers',
        reply: 'Yes, actively! Warmup has become non-negotiable for us. We saw a 30% improvement in inbox rates just by being more systematic about it. What are you using?',
      },
      {
        subject: 'Interesting webinar coming up',
        body: 'Hello,\n\nI\'m running a small virtual session next month on pipeline generation — keeping it to 20 people max to keep it actionable.\n\nThought you might find it useful. Would you want a spot?\n\nBest regards',
        reply: 'That sounds really interesting — I\'d definitely be up for joining. What topics are you planning to cover? Send over the details when you have them.',
      },
      {
        subject: 'Checking in — how\'s business?',
        body: 'Hi,\n\nHope things are going well on your end. We\'ve had a busy few months and I\'ve been meaning to check in with a few people I respect in the industry.\n\nHow are things looking for you heading into the next quarter?\n\nBest',
        reply: 'Things are actually going really well, thanks for asking! We had a strong close to last quarter and momentum is carrying over. How about you?',
      },
      {
        subject: 'Intro from a shared connection',
        body: 'Hello,\n\nHope you don\'t mind me reaching out — we have a few shared connections and I\'ve heard your name come up more than once in conversations about B2B sales.\n\nWould love to find some time to connect.\n\nWarm regards',
        reply: 'Small world! Always happy to connect with people who come recommended. What\'s the best way to get 20 minutes on your calendar?',
      },
      {
        subject: 'Your framework makes a lot of sense',
        body: 'Hi,\n\nI\'ve been implementing a framework similar to what you described and the results have been promising. We\'re seeing faster cycles and better conversion.\n\nCurious if you\'ve tested this across different industries.\n\nThanks',
        reply: 'Great to hear you\'re seeing results! We\'ve tested it in SaaS and professional services mostly. Manufacturing was trickier — longer cycles needed more touchpoints.',
      },
      {
        subject: 'Partnership idea — worth a chat?',
        body: 'Hello,\n\nI\'ve been thinking about a potential partnership angle between what your company does and what we\'re building.\n\nI think there\'s a complementary fit that could benefit both sides. Worth a quick conversation?\n\nBest',
        reply: 'Interesting — I\'m always open to exploring partnerships that make sense. Can you send a quick overview of what you have in mind? Happy to jump on a call after.',
      },
      {
        subject: 'How are you handling the AI wave?',
        body: 'Hi,\n\nCurious how your team is thinking about AI tools in your workflow. We\'ve been testing a few things and the results are... mixed.\n\nWould love to compare notes.\n\nCheers',
        reply: 'Ha — mixed is the right word! We\'ve had some great wins with AI for research and first drafts, but it still needs a human eye before anything goes out. What tools are you trying?',
      },
      {
        subject: 'Saw your company is hiring',
        body: 'Hello,\n\nNoticed you\'re scaling the team — congrats! Growth mode is exciting but also a lot to manage.\n\nWe\'ve helped teams in similar situations streamline their onboarding and ramp time. Happy to share some notes if useful.\n\nBest regards',
        reply: 'Thanks! Yes, it\'s a great problem to have but definitely keeps us on our toes. I\'d be interested in hearing what you\'ve seen work for onboarding. Let\'s find some time.',
      },
      {
        subject: 'Re: the podcast episode',
        body: 'Hi,\n\nI listened to the episode you were on last week — really solid insights on building a repeatable outbound motion. The bit about ICP definition was especially timely for us.\n\nDo you have a newsletter or resource list I could follow?\n\nBest',
        reply: 'Thanks so much — that was a fun one to record! I do have a newsletter, I\'ll send you the link. Also happy to chat more about the ICP stuff if it\'s relevant to what you\'re working through.',
      },
      {
        subject: 'Feedback request — would love your thoughts',
        body: 'Hello,\n\nI\'m putting together a short guide on outbound best practices and wanted to gather input from a few practitioners I respect.\n\nWould you be willing to answer 2-3 quick questions? It\'ll take under 5 minutes.\n\nThank you',
        reply: 'Happy to help! Send over the questions and I\'ll get back to you this week. Always glad to contribute to useful resources in the community.',
      },
      {
        subject: 'Just wanted to say — great work',
        body: 'Hi,\n\nI don\'t say this enough, but your content has genuinely helped me think differently about pipeline. The frameworks you share are practical and not just theoretical.\n\nKeep it up — it makes a difference.\n\nBest regards',
        reply: 'That genuinely made my day — thank you. It\'s great to hear the content is actually useful and not just adding to the noise. Let me know if there\'s ever a topic you\'d find helpful.',
      },
    ];

    // Reply pool — extracted from pairs so replies sound contextual, not generic
    const WARMUP_REPLIES = WARMUP_PAIRS.map(p => p.reply);

    // 30-day ramp: slow start → build → maintain at 40/day
    const WARMUP_DAILY_TARGETS = [
      0,  2,  3,  4,  5,  6,  7,  8,  10, 12,  // days 0-9
      14, 16, 18, 20, 22, 24, 26, 28, 30, 32,  // days 10-19
      34, 36, 38, 40, 40, 40, 40, 40, 40, 40, 40, // days 20-30
    ];

    function warmupDailyTarget(day: number): number {
      if (day <= 0) return 2;
      if (day >= 30) return 40;
      return WARMUP_DAILY_TARGETS[day] ?? 40;
    }

    async function gmailModify(msgId: string, addLabels: string[], removeLabels: string[], token: string) {
      try {
        await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}/modify`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ addLabelIds: addLabels, removeLabelIds: removeLabels }),
          signal: AbortSignal.timeout(8000),
        });
      } catch { /* non-fatal */ }
    }

    async function gmailSearch(q: string, token: string): Promise<{ id: string }[]> {
      try {
        const res = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=20`,
          { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) },
        );
        if (!res.ok) return [];
        const data = await res.json();
        return data.messages || [];
      } catch { return []; }
    }

    new SyncWorker('warmup', async () => {
      // Business-hours gate: only run warmup between 07:00–21:00 UTC.
      // Competitors (Instantly, Lemwarm) never send warmup outside daytime hours.
      const utcHour = new Date().getUTCHours();
      if (utcHour < 7 || utcHour >= 21) {
        console.log(`[warmup] Outside business hours (UTC ${utcHour}h) — skipping cycle`);
        return;
      }

      // Reset sent_today only for accounts that haven't run today yet (first cycle of the day).
      // Subsequent 6h cycles skip the reset so the count stays visible all day.
      const todayDate = new Date().toISOString().slice(0, 10);
      await supabase.from('email_accounts').update({ sent_today: 0 })
        .eq('warmup_enabled', true)
        .neq('status', 'error')
        .or(`warmup_last_run_date.is.null,warmup_last_run_date.lt.${todayDate}`);

      const { data: allWarmupAccounts } = await supabase
        .from('email_accounts')
        .select('id, user_id, email, type, smtp_host, smtp_port, smtp_user, smtp_pass, imap_host, imap_port, warmup_day, warmup_target, health_score, sent_today, is_pool_account, warmup_pool_mode, warmup_last_run_date')
        .eq('warmup_enabled', true)
        .neq('status', 'error');

      if (!allWarmupAccounts || allWarmupAccounts.length < 2) {
        console.log(`[warmup] Skipping: only ${allWarmupAccounts?.length ?? 0} warmup-enabled account(s) in system — need ≥2 to cross-send. Add pool accounts at /dashboard/admin/warmup.`);
        return;
      }

      console.log(`[warmup] Pool: ${allWarmupAccounts.length} accounts (pool: ${allWarmupAccounts.filter(a => a.is_pool_account).length}, users: ${allWarmupAccounts.filter(a => !a.is_pool_account).length})`);

      const { sendEmail, getAccessToken } = await import('./lib/mailer');

      // Track pairs sent this cycle — prevents A→B and B→A in the same run
      const sentPairs = new Set<string>();

      // Batch DB updates — collect all changes, flush at end to reduce DB round-trips
      const accountUpdates = new Map<string, { warmup_day: number; health_score: number; sent_today: number; warmup_last_run_date?: string; warmup_enabled?: boolean }>();
      const warmupEmailRows: { from_account_id: string; to_account_id: string; subject: string; body: string; sent_at: string }[] = [];
      const errorAccountIds = new Set<string>();

      // ── PHASE 1: SEND warmup emails (parallel batches of 10) ─────────────
      const BATCH_SIZE = 10;
      for (let b = 0; b < allWarmupAccounts.length; b += BATCH_SIZE) {
        const batch = allWarmupAccounts.slice(b, b + BATCH_SIZE);
        await Promise.all(batch.map(async account => {
          try {
            // Random start offset per account (0–8 min) so all accounts don't fire simultaneously
            await new Promise(r => setTimeout(r, Math.random() * 8 * 60 * 1000));

            const todayStr = new Date().toISOString().slice(0, 10);
            if (account.warmup_last_run_date === todayStr) return; // already ran today
            const day = (account.warmup_day ?? 0) + 1;
            const emailsToday = warmupDailyTarget(day);

            // Filter eligible peers based on pool mode
            let pool: typeof allWarmupAccounts;
            if (account.is_pool_account) {
              pool = allWarmupAccounts.filter(a => a.id !== account.id);
            } else {
              const mode = account.warmup_pool_mode || 'admin_pool';
              if (mode === 'user_to_user') {
                pool = allWarmupAccounts.filter(a => a.id !== account.id && !a.is_pool_account);
              } else if (mode === 'both') {
                pool = allWarmupAccounts.filter(a => a.id !== account.id);
              } else {
                // admin_pool (default): use admin pool accounts
                const adminPool = allWarmupAccounts.filter(a => a.id !== account.id && a.is_pool_account);
                if (adminPool.length > 0) {
                  pool = adminPool;
                } else {
                  // Fallback: use other warmup-enabled user accounts if admin pool is empty
                  pool = allWarmupAccounts.filter(a => a.id !== account.id && !a.is_pool_account);
                  if (pool.length > 0) console.log(`[warmup] ${account.email}: admin pool empty, falling back to user_to_user (${pool.length} peers)`);
                }
              }
            }
            if (pool.length === 0) {
              console.warn(`[warmup] ${account.email}: no eligible pool (mode: ${account.warmup_pool_mode || 'admin_pool'}, total warmup accounts: ${allWarmupAccounts.length}) — add pool accounts or enable warmup on more accounts`);
              return;
            }

            let sent = 0;
            // Shuffle pool so send order is random
            const shuffled = [...pool].sort(() => Math.random() - 0.5);

            for (let i = 0; i < emailsToday; i++) {
              // Spread emails naturally across a 3h window, proportional to daily count.
              // 2 emails → ~90 min apart; 40 emails → ~4.5 min apart. ±50% jitter.
              if (i > 0) {
                const baseMs = (3 * 60 * 60 * 1000) / emailsToday;
                await new Promise(r => setTimeout(r, baseMs * (0.75 + Math.random() * 0.5)));
              }
              // Pick a recipient that hasn't already received from this account
              // AND hasn't sent to this account this cycle (no connect-back)
              const toAccount = shuffled.find(a => {
                const fwd = `${account.id}→${a.id}`;
                const rev = `${a.id}→${account.id}`;
                return !sentPairs.has(fwd) && !sentPairs.has(rev);
              }) || shuffled[i % shuffled.length]; // fallback if all pairs used

              const pair = WARMUP_PAIRS[Math.floor(Math.random() * WARMUP_PAIRS.length)];
              const { subject, body } = pair;
              const pairKey = `${account.id}→${toAccount.id}`;

              try {
                await sendEmail(
                  { id: account.id, type: account.type, email: account.email, smtp_host: account.smtp_host, smtp_port: account.smtp_port, smtp_user: account.smtp_user, smtp_pass: account.smtp_pass },
                  { from: account.email, to: toAccount.email, subject, text: `${body}\n--warmup-ping--`, html: `<p>${body.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p><span style="display:none;font-size:0">--warmup-ping--</span>` }
                );
                sentPairs.add(pairKey);
                warmupEmailRows.push({ from_account_id: account.id, to_account_id: toAccount.id, subject, body, sent_at: new Date().toISOString() });
                sent++;
              } catch (e: any) {
                console.error(`[warmup-send] ${account.email} → ${toAccount.email}: ${e.message}`);
                if (e.responseCode === 535 || e.code === 'EAUTH') {
                  errorAccountIds.add(account.id);
                  break;
                }
              }
            }

            // Health target curve: 50→98 over days 1-14, 98→100 over days 15-30, 100 after.
            // Use Math.max so score never decreases if already ahead.
            const healthTarget = day <= 14
              ? Math.round(50 + (day / 14) * 48)        // day 14 = 98%
              : day <= 30
                ? Math.round(98 + ((day - 14) / 16) * 2) // day 30 = 100%
                : 100;
            const newHealth = sent > 0 ? Math.max(account.health_score ?? 50, healthTarget) : (account.health_score ?? 50);
            // Auto-stop when warmup_day first reaches warmup_target. If user re-enables after
            // completion (warmup_day already >= target), keep running at maintenance 40/day.
            const target = account.warmup_target ?? 30;
            const justCompleted = (account.warmup_day ?? 0) < target && day >= target;
            accountUpdates.set(account.id, {
              warmup_day: day,
              health_score: newHealth,
              sent_today: sent,
              warmup_last_run_date: new Date().toISOString().slice(0, 10),
              ...(justCompleted ? { warmup_enabled: false, status: 'active' } : {}),
            });
            console.log(`[warmup-send] ${account.email} day=${day}${justCompleted ? ' (COMPLETE)' : ''} sent=${sent}/${emailsToday} score=${newHealth}`);
          } catch (e: any) {
            console.error(`[warmup-send] ${account.email}: ${e.message}`);
          }
        }));
      }

      // Flush batched warmup_emails inserts (chunks of 100)
      for (let i = 0; i < warmupEmailRows.length; i += 100) {
        await supabase.from('warmup_emails').insert(warmupEmailRows.slice(i, i + 100));
      }

      // Flush account updates individually (Supabase upsert can't bulk-update different values)
      const completedAccounts = allWarmupAccounts.filter(a => {
        const upd = accountUpdates.get(a.id);
        return upd?.warmup_enabled === false && (upd?.warmup_day ?? 0) >= (a.warmup_target ?? 30);
      });

      // Build warmup_history rows — one per account per day (upsert by email+date)
      const today = new Date().toISOString().slice(0, 10);
      const historyRows = Array.from(accountUpdates.entries())
        .map(([id, upd]) => {
          const acc = allWarmupAccounts.find(a => a.id === id);
          if (!acc) return null;
          return {
            account_id: id,
            email: acc.email,
            user_id: acc.user_id,
            date: today,
            day_number: upd.warmup_day,
            emails_sent: upd.sent_today,
            health_score: upd.health_score,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      await Promise.all([
        ...Array.from(accountUpdates.entries()).map(([id, upd]) =>
          supabase.from('email_accounts').update(upd).eq('id', id)
        ),
        ...Array.from(errorAccountIds).map(id =>
          supabase.from('email_accounts').update({ status: 'error', warmup_enabled: false }).eq('id', id)
        ),
        ...completedAccounts.map(a =>
          supabase.from('notifications').insert({
            user_id: a.user_id,
            message: `${a.email} warmup complete! ${a.warmup_target ?? 30}-day program done — health is ${accountUpdates.get(a.id)?.health_score ?? 100}%. Re-enable warmup to keep the reputation warm.`,
            type: 'info',
          })
        ),
        // Persist daily warmup history (upsert so re-runs don't duplicate)
        historyRows.length > 0
          ? supabase.from('warmup_history').upsert(historyRows, { onConflict: 'email,date' })
          : Promise.resolve(),
      ]);

      // ── PHASE 2: RECEIVE — rescue from spam, mark-read, auto-reply ───────
      for (const account of allWarmupAccounts) {
        try {
          if (account.type === 'gmail-oauth') {
            // Gmail API path
            let token: string;
            try { token = await getAccessToken({ id: account.id, type: account.type, email: account.email, smtp_pass: account.smtp_pass }); }
            catch { continue; }

            const messages = await gmailSearch('"--warmup-ping--" newer_than:2d', token);
            for (const msg of messages) {
              try {
                const detail = await gmailGet(`/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From,Subject`, token);
                if (!detail) continue;
                const isSent = detail.labelIds?.includes('SENT');
                if (isSent) continue;
                const inSpam = detail.labelIds?.includes('SPAM');
                const unread = detail.labelIds?.includes('UNREAD');
                const addLabels = inSpam ? ['INBOX'] : [];
                const removeLabels = [...(inSpam ? ['SPAM'] : []), ...(unread ? ['UNREAD'] : [])];
                if (addLabels.length || removeLabels.length) await gmailModify(msg.id, addLabels, removeLabels, token);

                if (unread && Math.random() < 0.25) {
                  const hdrs = detail.payload?.headers || [];
                  const fromH = hdrs.find((h: any) => h.name === 'From')?.value || '';
                  const subjH = hdrs.find((h: any) => h.name === 'Subject')?.value || '';
                  const toEmail = fromH.match(/<(.+?)>/)?.at(1) || fromH.trim();
                  if (toEmail && toEmail !== account.email) {
                    const replyText = WARMUP_REPLIES[Math.floor(Math.random() * WARMUP_REPLIES.length)];
                    await sendEmail(
                      { id: account.id, type: account.type, email: account.email, smtp_pass: account.smtp_pass },
                      { from: account.email, to: toEmail, subject: `Re: ${subjH}`, text: replyText, html: `<p>${replyText}</p>` }
                    );
                  }
                }
              } catch { /* skip single message error */ }
            }

          } else {
            // IMAP path (gmail-app, smtp)
            const imapHost = account.imap_host || (account.type === 'gmail-app' ? 'imap.gmail.com' : null);
            if (!imapHost) continue;

            const { ImapFlow } = await import('imapflow');
            const imapConfig: any = {
              host: imapHost, port: account.imap_port || 993, secure: true,
              auth: { user: account.smtp_user || account.email, pass: account.smtp_pass },
              logger: false, tls: { rejectUnauthorized: false }, connectionTimeout: 15000, socketTimeout: 20000,
            };
            if (process.env.SMTP_PROXY) imapConfig.proxy = process.env.SMTP_PROXY;

            const client = new ImapFlow(imapConfig);
            let replyTarget: { toEmail: string; subject: string } | null = null;

            try {
              await client.connect();

              // Rescue from spam
              const spamFolders = account.type === 'gmail-app' ? ['[Gmail]/Spam'] : ['Junk', 'Spam', '[Gmail]/Spam'];
              for (const folder of spamFolders) {
                try {
                  const spamLock = await client.getMailboxLock(folder);
                  try {
                    const uids = await client.search({ since: new Date(Date.now() - 3 * 86400_000), body: '--warmup-ping--' }, { uid: true });
                    if (uids && (uids as number[]).length > 0) {
                      await client.messageMove(uids as number[], 'INBOX', { uid: true });
                      console.log(`[warmup-receive] rescued ${(uids as number[]).length} from spam: ${account.email}`);
                    }
                  } finally { spamLock.release(); }
                  break;
                } catch { /* folder not found, try next */ }
              }

              // Mark inbox warmup emails as read + grab reply candidate
              const inboxLock = await client.getMailboxLock('INBOX');
              try {
                const uids = await client.search({ since: new Date(Date.now() - 2 * 86400_000), body: '--warmup-ping--', seen: false }, { uid: true });
                if (uids && (uids as number[]).length > 0) {
                  await client.messageFlagsAdd(uids as number[], ['\\Seen'], { uid: true });
                  if (Math.random() < 0.25) {
                    for await (const msg of client.fetch((uids as number[]).slice(0, 1), { envelope: true }, { uid: true })) {
                      const from = msg.envelope?.from?.[0];
                      const fromEmail = from?.address || '';
                      const subject = msg.envelope?.subject || '';
                      if (fromEmail && fromEmail !== account.email) replyTarget = { toEmail: fromEmail, subject };
                    }
                  }
                }
              } finally { inboxLock.release(); }

              await client.logout();
            } catch (e: any) {
              console.error(`[warmup-receive] IMAP ${account.email}: ${e.message}`);
              try { await client.logout(); } catch { }
            }

            if (replyTarget) {
              const replyText = WARMUP_REPLIES[Math.floor(Math.random() * WARMUP_REPLIES.length)];
              try {
                await sendEmail(
                  { id: account.id, type: account.type, email: account.email, smtp_host: account.smtp_host, smtp_port: account.smtp_port, smtp_user: account.smtp_user, smtp_pass: account.smtp_pass },
                  { from: account.email, to: replyTarget.toEmail, subject: `Re: ${replyTarget.subject}`, text: replyText, html: `<p>${replyText}</p>` }
                );
              } catch { /* non-fatal */ }
            }
          }
        } catch (e: any) {
          console.error(`[warmup-receive] ${account.email}: ${e.message}`);
        }
      }

    }, { connection, concurrency: 1 });

    console.log('✅ Warmup worker started (every 6h)');

    // ── Validation worker ────────────────────────────────────────────────────────
    new Worker('lead-validation', async (job) => {
      const { runValidationJob } = await import('./lib/run-validation-job');
      try {
        await runValidationJob(supabase, job.data.jobId, job.data.userId);
      } catch (err: any) {
        await supabase.from('lead_import_jobs')
          .update({ status: 'failed', progress: 0 })
          .eq('id', job.data.jobId);
        throw err;
      }
    }, { connection, concurrency: 2 })
      .on('completed', j => console.log(`✓ Validation job ${j.id} done`))
      .on('failed', (j, err) => console.error(`✗ Validation job ${j?.id} failed:`, err?.message));

    console.log('✅ Validation worker started');
  }
}

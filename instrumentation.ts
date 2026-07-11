// Campaign sending-window/timezone helpers moved to lib/campaign-scheduling.ts —
// shared by the (now-simplified) campaign start route and the campaign-scheduler
// worker below, which replaced the old "snap a pre-computed delay into the window"
// approach with a live per-cycle window check (isWithinSendingWindow).

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.REDIS_URL) {
    const { Worker } = await import('bullmq');
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const { sendEmail, replaceVars } = await import('./lib/mailer');
    const crypto = await import('crypto');
    const { PRODUCTION_STEP_DELAY_UNIT_MS, jitterMs, isWithinSendingWindow, computeFollowupWeightPct, allocateCapacity, checkCampaignAutoComplete } = await import('./lib/campaign-scheduling');

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

      // Enforce per-account daily limit across all campaigns — capped by the adaptive
      // warmup-aware ceiling so a still-warming or unhealthy mailbox can't be pushed
      // to full campaign volume just because the user set a high daily_limit.
      const todayUTC = new Date();
      todayUTC.setUTCHours(0, 0, 0, 0);
      const { count: sentTodayCount } = await supabase
        .from('sent_emails')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', account.id)
        .gte('sent_at', todayUTC.toISOString());

      const { detectProvider, campaignDailyCap } = await import('./lib/warmup-health');
      const adaptiveCap = campaignDailyCap({
        provider: detectProvider(account),
        warmupDay: account.warmup_day ?? 0,
        health: account.health_score ?? 50,
        warmupEnabled: !!account.warmup_enabled,
        alreadyWarmedUp: !!account.already_warmed_up,
      });
      const accountDailyLimit = account.warmup_paused ? 0 : Math.min(account.daily_limit ?? 50, adaptiveCap);
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

      // Enforce campaign daily limit across ALL steps (not just step 0)
      // Auto mode: no separate campaign-level ceiling — bounded solely by the
      // per-account daily-limit check above (already warmup/health-aware).
      // Manual mode: today's behavior, a stored hard ceiling.
      const campaignDailyLimit = campaign.daily_limit_mode === 'manual' ? (campaign.daily_limit ?? 50) : Infinity;
      const { count: campaignSentToday } = await supabase
        .from('sent_emails')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .gte('sent_at', todayUTC.toISOString());
      if ((campaignSentToday ?? 0) >= campaignDailyLimit) {
        if (!job.data.isRequeued) {
          const { emailQueue: eq } = await import('./lib/queue');
          await eq.add('send', { ...job.data, isRequeued: true }, {
            delay: 25 * 60 * 60 * 1000,
            attempts: 3,
            backoff: { type: 'exponential', delay: 60000 },
          });
          console.log(`⏸ Campaign "${campaign.name}" at daily limit (${campaignDailyLimit}/day), requeueing in 25h`);
        } else {
          console.log(`⚠ Campaign "${campaign.name}" still at daily limit after requeue — skipping`);
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
        // Make sure the lead's DB state actually advanced past this step (e.g. a Redis
        // blip could have lost the post-send update below) — if not, fix it here so the
        // campaign-scheduler worker can pick up the next step on its own next cycle.
        // No longer re-queues a delayed job directly — that model is retired.
        const _nextStep = stepNumber + 1;
        const _hasNext = campaign.email_steps.some((s: any) => s.step_number === _nextStep);
        if (cl.status === 'active' && (cl.current_step ?? 0) <= stepNumber) {
          const _nextStepData = campaign.email_steps.find((s: any) => s.step_number === _nextStep);
          const _stepDelayUnitMs = campaign.step_delay_unit_ms ?? PRODUCTION_STEP_DELAY_UNIT_MS;
          const _nextDelayDays = _nextStepData?.delay_days ?? 1;
          const _rawDelayMs = _nextDelayDays * _stepDelayUnitMs;
          const _nextSendAt = _hasNext
            ? new Date(Date.now() + _rawDelayMs + jitterMs(_stepDelayUnitMs, _nextDelayDays === 0)).toISOString()
            : null;
          await supabase.from('campaign_leads').update({
            current_step: _nextStep,
            // Kept in sync with current_step on every write so a step edit later
            // (add/remove/reorder) can resolve this lead's true position by stable
            // ID instead of a step_number that may have shifted.
            current_step_id: _hasNext ? (_nextStepData?.id ?? null) : null,
            status: _hasNext ? 'active' : 'completed',
            next_send_at: _nextSendAt,
            account_id: account.id,
          }).eq('id', campaignLeadId);
          console.log(`[idempotency-fix] advanced ${lead.email} to step ${_nextStep}`);
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
          await checkCampaignAutoComplete(campaign.id);
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

      // Follow-up subject: ALWAYS use original step 0 subject for reply-in-thread
      // steps, prefixed "Re: " (once — guards against a triple-nested "Re: Re: Re:"
      // if step 0's own subject already started with it) so it reads like a real
      // mail-client reply instead of literally repeating the original subject verbatim.
      function withReplyPrefix(s: string): string {
        return /^re:/i.test(s.trim()) ? s : `Re: ${s}`;
      }
      const subject = isReplyThread
        ? withReplyPrefix(originalSubject ?? replaceVars(chosenSubject, lead))
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
        // Generate a stable Message-ID for EVERY step, not just step 0 — a reply to
        // a follow-up has to be matchable too. Previously only step 0 got one, which
        // meant a reply to a follow-up (a different message than step 0) could never
        // be matched via In-Reply-To during inbox sync, since the follow-up's own ID
        // was never captured or stored — a real, silent "reply not counted" bug.
        const explicitMessageId = `<${crypto.randomUUID().replace(/-/g, '')}@leadgenie.app>`;

        const { threadId } = await sendEmail(account, {
          from: fromHeader,
          to: lead.email,
          subject,
          text: body,
          html: fullHtml,
          messageId: explicitMessageId,
          ...(inReplyTo ? { inReplyTo, references: inReplyTo } : {}),
          ...(gmailThreadId ? { gmailThreadId, inReplyTo: gmailThreadId, references: gmailThreadId } : {}),
        });

        // What to store in message_id:
        // - Gmail OAuth: threadId from the API for step 0 only (used as gmailThreadId
        //   by follow-ups). Later steps don't need their own stored ID — Gmail's
        //   inbox-sync path checks the whole THREAD for new messages, not a specific
        //   message-id, so it already catches a reply to any message in the thread.
        // - SMTP/IMAP/Gmail App Password: every step's own explicit ID, so a reply to
        //   ANY step — not just step 0 — can be matched during inbox sync.
        const storeMessageId = account.type === 'gmail-oauth'
          ? (stepNumber === 0 ? threadId : null)
          : explicitMessageId;

        if (sentEmail?.id && storeMessageId) {
          await supabase.from('sent_emails').update({ message_id: storeMessageId }).eq('id', sentEmail.id);
        }
      } catch (err: any) {
        if (sentEmail?.id) await supabase.from('sent_emails').delete().eq('id', sentEmail.id);

        const code = err.responseCode as number | undefined;

        // Auth failure (535 = SMTP auth failed / Gmail API config error, 401 = Gmail API unauthorized)
        if (code === 535 || code === 401 || err.code === 'EAUTH') {
          await supabase.from('email_accounts').update({ status: 'error' }).eq('id', account.id);
          await supabase.from('email_account_events').insert({ account_id: account.id, event_type: 'auth_error', meta: { message: err.message } });

          // Name the specific healthy sibling mailbox absorbing this campaign's
          // sends, rather than a vague "other mailboxes will pick up" — same
          // selection logic the scheduler/retry route use, so the name is
          // actually accurate to what happens next.
          const others = accounts.filter((a: any) => a.id !== account.id);
          const { computeAccountRemaining } = await import('./lib/campaign-scheduling');
          const remaining = others.length ? await computeAccountRemaining(others) : new Map();
          const takeoverId = [...remaining.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
          const takeoverAccount = takeoverId ? others.find((a: any) => a.id === takeoverId) : null;
          const routingMsg = takeoverAccount
            ? ` Sends are automatically rerouting to ${takeoverAccount.email}.`
            : others.length
              ? ` No other healthy sending account is currently available — sends are paused until this is resolved.`
              : ` This is the only sending account on this campaign — sends are paused until this is resolved.`;

          await supabase.from('notifications').insert({
            user_id: campaign.user_id,
            message: `Sending account ${account.email} has an error: ${err.message}.${routingMsg}`,
            type: 'error',
            link: `/dashboard/campaigns/${campaign.id}`,
          });
          console.error(`🔐 Auth/config failure for ${account.email}: ${err.message}`);
          return;
        }

        // Hard bounce (5xx delivery failure) — don't retry
        if (typeof code === 'number' && code >= 550) {
          await Promise.all([
            supabase.from('leads').update({ status: 'bounced' }).eq('id', lead.id),
            supabase.from('campaign_leads').update({ status: 'bounced' }).eq('id', campaignLeadId),
            supabase.from('email_account_events').insert({ account_id: account.id, event_type: 'bounce', meta: { code } }),
          ]);
          console.log(`⛔ Bounced: ${lead.email} (${code})`);
          await checkCampaignAutoComplete(campaign.id);
          return;
        }

        console.error(`⛔ Transient error [${lead.email}] code=${err?.code} responseCode=${err?.responseCode} msg=${err?.message}`);
        throw err; // Transient error → BullMQ retries
      }

      const nextStep = stepNumber + 1;
      const hasNextStep = campaign.email_steps.some((s: any) => s.step_number === nextStep);

      // Next follow-up's due time — base delay for that step, plus jitter so it doesn't
      // land at the exact same clock time every day. The campaign-scheduler worker picks
      // this lead up once next_send_at arrives; nothing here re-queues a job directly.
      let nextSendAt: string | null = null;
      let nextStepData: any = null;
      if (hasNextStep) {
        nextStepData = campaign.email_steps.find((s: any) => s.step_number === nextStep);
        const stepDelayUnitMs = campaign.step_delay_unit_ms ?? PRODUCTION_STEP_DELAY_UNIT_MS;
        // ?? not || — a real delay_days:0 ("Same day") must stay 0, not get
        // silently promoted to 1 by a falsy-value fallback.
        const nextDelayDays = nextStepData.delay_days ?? 1;
        const rawDelayMs = nextDelayDays * stepDelayUnitMs;
        nextSendAt = new Date(Date.now() + rawDelayMs + jitterMs(stepDelayUnitMs, nextDelayDays === 0)).toISOString();
      }

      await supabase.from('campaign_leads').update({
        current_step: nextStep,
        // Kept in sync with current_step on every write so a step edit later
        // (add/remove/reorder) can resolve this lead's true position by stable
        // ID instead of a step_number that may have shifted.
        current_step_id: hasNextStep ? (nextStepData?.id ?? null) : null,
        last_sent_at: new Date().toISOString(),
        status: hasNextStep ? 'active' : 'completed',
        next_send_at: nextSendAt,
        // Persist the sending mailbox so every later step in this thread reuses it —
        // the scheduler no longer has a job-to-job chain to carry this forward.
        account_id: account.id,
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
        await checkCampaignAutoComplete(campaign.id);
      }

      console.log(`✓ Sent step ${stepNumber} to ${lead.email}`);
    }, { connection, concurrency: 5 }).on('failed', (job, err) => {
      console.error(`❌ Job permanently failed after all retries | campaignLeadId=${job?.data?.campaignLeadId} | ${err?.message}`);
    });

    console.log('✅ Email worker started');

    // ── Campaign scheduler — the Smart Priority Engine (runs every 2 minutes) ──
    // Decides, live each cycle, what actually sends for every active campaign:
    // due follow-ups always get first claim on today's capacity (weighted Auto/
    // Manual per campaign), whatever's left goes to new leads — new leads are
    // never fully starved, and nothing ever exceeds a mailbox's or the campaign's
    // real daily cap. Replaces the old "pre-schedule everything with a fixed
    // delay at launch time" model — see start/route.ts and the removed
    // self-chaining logic above.
    {
      const { Queue, Worker: SyncWorker } = await import('bullmq');
      const { detectProvider, campaignDailyCap } = await import('./lib/warmup-health');
      const { emailQueue: schedulerQueue } = await import('./lib/queue');

      const campaignSchedulerQueue = new Queue('campaign-scheduler', { connection });
      await campaignSchedulerQueue.upsertJobScheduler('campaign-scheduler', { every: 2 * 60_000 }, { name: 'schedule', data: {} });

      new SyncWorker('campaign-scheduler', async () => {
        const { data: activeCampaigns } = await supabase
          .from('campaigns')
          .select('id, name, user_id, daily_limit, daily_limit_mode, from_hour, to_hour, timezone, active_days, min_delay_secs, max_delay_secs, followup_priority_mode, followup_weight_pct, campaign_accounts(account:email_accounts(*))')
          .eq('status', 'active');

        if (!activeCampaigns?.length) return;

        // Per-account send pacing, persisted to email_accounts.next_dispatch_at
        // so it survives across this worker's 2-minute cycles (previously a
        // single cursorMs reset to 0 every cycle, which meant sends landed
        // roughly every 2 minutes regardless of the campaign's configured
        // delay, and every mailbox in a campaign was serialized onto one
        // shared clock instead of pacing independently). Shared across every
        // campaign in this pass so two campaigns using the same mailbox can't
        // double-book it. Seeded lazily from the DB the first time an account
        // is touched this pass.
        const dispatchReservation = new Map<string, number>();
        const SAFE_CYCLE_SPAN_MS = 100_000; // cycle is 120s; leaves a 20s buffer
        const reservationFor = (acc: any): number => {
          if (!dispatchReservation.has(acc.id)) {
            dispatchReservation.set(acc.id, acc.next_dispatch_at ? new Date(acc.next_dispatch_at).getTime() : 0);
          }
          return dispatchReservation.get(acc.id)!;
        };
        const isPacingEligible = (acc: any) => reservationFor(acc) - Date.now() <= SAFE_CYCLE_SPAN_MS;

        for (const campaign of activeCampaigns as any[]) {
          try {
            if (!isWithinSendingWindow(campaign)) continue;

            const linkedAccounts = (campaign.campaign_accounts ?? []).map((ca: any) => ca.account).filter(Boolean);
            if (!linkedAccounts.length) continue;
            const accountsById = new Map<string, any>(linkedAccounts.map((a: any) => [a.id, a]));

            const todayUTC = new Date();
            todayUTC.setUTCHours(0, 0, 0, 0);

            // Per-account real remaining capacity today — health-aware, warmup-safe,
            // same ceiling the email-sending worker itself enforces at send time.
            const accountRemaining = new Map<string, number>();
            for (const acc of linkedAccounts) {
              if (acc.warmup_paused || (acc.health_score ?? 50) < 35 || acc.status === 'error') continue;
              const cap = campaignDailyCap({
                provider: detectProvider(acc), warmupDay: acc.warmup_day ?? 0,
                health: acc.health_score ?? 50, warmupEnabled: !!acc.warmup_enabled, alreadyWarmedUp: !!acc.already_warmed_up,
              });
              if (cap === 0) continue;
              const { count: sentToday } = await supabase
                .from('sent_emails').select('id', { count: 'exact', head: true })
                .eq('account_id', acc.id).gte('sent_at', todayUTC.toISOString());
              const remaining = Math.max(0, Math.min(acc.daily_limit ?? 50, cap) - (sentToday ?? 0));
              if (remaining > 0) accountRemaining.set(acc.id, remaining);
            }
            if (accountRemaining.size === 0) continue;

            const totalAccountCapacity = Array.from(accountRemaining.values()).reduce((s, v) => s + v, 0);

            const { count: campaignSentToday } = await supabase
              .from('sent_emails').select('id', { count: 'exact', head: true })
              .eq('campaign_id', campaign.id).gte('sent_at', todayUTC.toISOString());
            // Auto mode: the live sum of connected accounts' warmup-aware capacity
            // IS the ceiling — no stored number to drift out of sync as accounts
            // are added/removed or health changes. Manual mode: today's behavior.
            const campaignRemaining = campaign.daily_limit_mode === 'manual'
              ? Math.max(0, (campaign.daily_limit ?? 50) - (campaignSentToday ?? 0))
              : totalAccountCapacity;

            const remainingCapacity = Math.min(totalAccountCapacity, campaignRemaining);
            if (remainingCapacity <= 0) continue;

            // Candidate pool: eligibility (reply/bounce/unsubscribe) is baked into
            // this query, not a later step — an ineligible lead never enters the
            // pool that gets prioritized and sent, full stop.
            const nowIso = new Date().toISOString();
            const [{ data: dueFollowupsRaw }, { data: newLeadsRaw }] = await Promise.all([
              supabase.from('campaign_leads')
                .select('id, current_step, account_id, lead:leads(status)')
                .eq('campaign_id', campaign.id).eq('status', 'active')
                .or(`next_send_at.is.null,next_send_at.lte.${nowIso}`),
              supabase.from('campaign_leads')
                .select('id, lead:leads(status)')
                .eq('campaign_id', campaign.id).eq('status', 'pending'),
            ]);

            const stillEligible = (rows: any[] | null) =>
              (rows ?? []).filter(r => r.lead?.status !== 'unsubscribed' && r.lead?.status !== 'bounced');
            const followupsDue = stillEligible(dueFollowupsRaw);
            const newLeads = stillEligible(newLeadsRaw);
            if (followupsDue.length === 0 && newLeads.length === 0) continue;

            const weightPct = computeFollowupWeightPct({
              mode: (campaign.followup_priority_mode as 'auto' | 'manual') ?? 'auto',
              manualWeightPct: campaign.followup_weight_pct,
              dueFollowupCount: followupsDue.length,
              remainingCapacity,
            });
            const { followupsToSend, newToSend } = allocateCapacity({
              followupsDue, newLeads, remainingCapacity, followupWeightPct: weightPct,
            });
            if (followupsToSend.length === 0 && newToSend.length === 0) continue;

            // Pace each mailbox independently using its own persisted reservation
            // (dispatchReservation/next_dispatch_at) rather than a single shared
            // clock — every account in this campaign can be paced at the
            // campaign's configured gap AT THE SAME TIME, instead of every
            // mailbox being serialized onto one global cursor (the root cause of
            // both "sends every ~2min instead of the configured 10-20min gap"
            // and multi-mailbox campaigns never actually using their combined
            // capacity). An account not yet due within this cycle's safe window
            // is simply skipped — its lead stays due and is picked up by a later
            // cycle once the account's cooldown has actually elapsed.
            const minDelayMs = Math.max(10_000, (campaign.min_delay_secs || 60) * 1000);
            const maxDelayMs = Math.max(minDelayMs + 1000, (campaign.max_delay_secs || 300) * 1000);
            const jobs: { name: string; data: Record<string, unknown>; opts: Record<string, unknown> }[] = [];
            const touchedAccountIds = new Set<string>();

            const reserve = (accId: string): number => {
              const acc = accountsById.get(accId);
              const now = Date.now();
              const reservation = reservationFor(acc);
              const delay = Math.max(0, reservation - now);
              const nextReservation = Math.max(now, reservation) + minDelayMs + Math.floor(Math.random() * (maxDelayMs - minDelayMs));
              dispatchReservation.set(accId, nextReservation);
              touchedAccountIds.add(accId);
              return delay;
            };

            for (const cl of followupsToSend as any[]) {
              // Locked mailbox for this thread, as long as it's still pacing-eligible
              // this cycle. Falls back to whichever eligible account currently has
              // the most room, either because the sticky one is still cooling down
              // or because the lead somehow reached a follow-up with no persisted
              // account_id.
              const stickyId = cl.account_id && accountRemaining.has(cl.account_id) && isPacingEligible(accountsById.get(cl.account_id))
                ? cl.account_id : undefined;
              const fallback = [...accountRemaining.entries()]
                .filter(([id]) => isPacingEligible(accountsById.get(id)))
                .sort((a, b) => b[1] - a[1])[0];
              const accId: string | undefined = stickyId ?? fallback?.[0];
              const room = accId ? accountRemaining.get(accId) : undefined;
              if (!accId || !room || room <= 0) continue;
              accountRemaining.set(accId, room - 1);
              jobs.push({
                name: 'send',
                data: { campaignLeadId: cl.id, stepNumber: cl.current_step, accountId: accId },
                opts: { delay: reserve(accId), attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
              });
            }

            for (const cl of newToSend as any[]) {
              // Least-loaded pacing-eligible mailbox gets the new lead — avoids
              // overbooking a mailbox past its cap or past its cooldown.
              const [accId, room] = [...accountRemaining.entries()]
                .filter(([id]) => isPacingEligible(accountsById.get(id)))
                .sort((a, b) => b[1] - a[1])[0] ?? [];
              if (!accId || !room || room <= 0) continue;
              accountRemaining.set(accId, room - 1);
              jobs.push({
                name: 'send',
                data: { campaignLeadId: cl.id, stepNumber: 0, accountId: accId },
                opts: { delay: reserve(accId), attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
              });
            }

            if (jobs.length) {
              await schedulerQueue.addBulk(jobs as any);
              if (touchedAccountIds.size) {
                await Promise.all([...touchedAccountIds].map(async accId => {
                  const { error } = await supabase.from('email_accounts')
                    .update({ next_dispatch_at: new Date(dispatchReservation.get(accId)!).toISOString() })
                    .eq('id', accId);
                  if (error) console.error(`[campaign-scheduler] failed to persist pacing for account ${accId} (has the 20260710_pacing_and_auto_limit migration run?):`, error.message);
                }));
              }
              console.log(`[campaign-scheduler] "${campaign.name ?? campaign.id}": ${followupsToSend.length} followup(s) + ${newToSend.length} new queued (weight=${weightPct}%, capacity=${remainingCapacity})`);
            }
          } catch (e: any) {
            console.error(`[campaign-scheduler] campaign ${campaign.id} error:`, e.message);
          }
        }
      }, { connection, concurrency: 1 });

      console.log('✅ Campaign scheduler worker started (every 2 min)');
    }

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
                await checkCampaignAutoComplete(sent.campaign_id);
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
                await checkCampaignAutoComplete(sent.campaign_id);
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

    // Gmail label IDs are per-mailbox and not fixed strings (unlike STARRED/INBOX/SPAM) —
    // find or create a "Warmup" label once per account, cached for the process lifetime.
    const _warmupLabelIdCache = new Map<string, string>();
    async function getOrCreateWarmupLabelId(accountEmail: string, token: string): Promise<string | null> {
      if (_warmupLabelIdCache.has(accountEmail)) return _warmupLabelIdCache.get(accountEmail)!;
      try {
        const listRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
          headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000),
        });
        if (listRes.ok) {
          const list = await listRes.json();
          const existing = (list.labels || []).find((l: any) => l.name === 'Warmup');
          if (existing?.id) { _warmupLabelIdCache.set(accountEmail, existing.id); return existing.id; }
        }
        const createRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Warmup', labelListVisibility: 'labelShow', messageListVisibility: 'show' }),
          signal: AbortSignal.timeout(8000),
        });
        if (createRes.ok) {
          const created = await createRes.json();
          if (created?.id) { _warmupLabelIdCache.set(accountEmail, created.id); return created.id; }
        }
      } catch { /* non-fatal — label action just gets skipped */ }
      return null;
    }

    // ── Event log helper — every signal that feeds the health formula ─────────
    async function logAccountEvent(accountId: string, eventType: string, meta: Record<string, unknown> = {}) {
      try {
        await supabase.from('email_account_events').insert({ account_id: accountId, event_type: eventType, meta });
      } catch (e: any) {
        console.error(`[warmup-event] insert failed (${eventType}):`, e.message);
      }
    }

    async function fetchEventCounts(accountId: string, sinceMs: number) {
      const { data } = await supabase
        .from('email_account_events')
        .select('event_type')
        .eq('account_id', accountId)
        .gte('created_at', new Date(sinceMs).toISOString());
      const counts = { sent7d: 0, spam7d: 0, bounce7d: 0, reply7d: 0, open7d: 0, authError7d: 0 };
      for (const row of data || []) {
        if (row.event_type === 'sent') counts.sent7d++;
        else if (row.event_type === 'spam_placement') counts.spam7d++;
        else if (row.event_type === 'bounce') counts.bounce7d++;
        else if (row.event_type === 'reply') counts.reply7d++;
        else if (row.event_type === 'open') counts.open7d++;
        else if (row.event_type === 'auth_error') counts.authError7d++;
      }
      return counts;
    }

    // Columns that exist regardless of whether 20260705_warmup_phase1.sql has run yet.
    const LEGACY_SAFE_ACCOUNT_KEYS = new Set([
      'warmup_day', 'health_score', 'sent_today', 'warmup_last_run_date', 'warmup_enabled', 'status',
    ]);

    // Update an email_accounts row, degrading gracefully if the Phase 1 migration's
    // columns don't exist yet — persists at least the legacy fields instead of losing
    // the whole update (which would otherwise silently stall warmup_day/health_score/sent_today).
    async function safeUpdateAccount(id: string, upd: Record<string, unknown>) {
      const { error } = await supabase.from('email_accounts').update(upd).eq('id', id);
      if (error) {
        const legacyOnly: Record<string, unknown> = {};
        for (const k of Object.keys(upd)) if (LEGACY_SAFE_ACCOUNT_KEYS.has(k)) legacyOnly[k] = upd[k];
        if (Object.keys(legacyOnly).length > 0) {
          await supabase.from('email_accounts').update(legacyOnly).eq('id', id);
        }
      }
    }

    async function safeUpsertHistory(rows: Record<string, unknown>[]) {
      if (rows.length === 0) return;
      const { error } = await supabase.from('warmup_history').upsert(rows, { onConflict: 'email,date' });
      if (error) {
        const legacyRows = rows.map(r => {
          const { account_id, email, user_id, date, day_number, emails_sent, health_score } = r as any;
          return { account_id, email, user_id, date, day_number, emails_sent, health_score };
        });
        await supabase.from('warmup_history').upsert(legacyRows, { onConflict: 'email,date' });
      }
    }

    // Delayed per-message engagement — gives warmup a realistic "read a while later,
    // maybe reply, maybe star/archive" pattern instead of an instant scripted reply.
    const engageQueue = new Queue('warmup-engage', { connection });

    function pickEngageDelayMs(): number {
      const bucket = Math.random();
      if (bucket < 0.25) return (30 + Math.random() * 90) * 1000;            // 30s–2min: quick glance
      if (bucket < 0.65) return (2 + Math.random() * 18) * 60 * 1000;        // 2–20min: normal check
      return (20 + Math.random() * 220) * 60 * 1000;                        // 20min–4h: busy day
    }

    new SyncWorker('warmup-engage', async (job: any) => {
      const { fromAccountId, toAccountId, subject, chainDepth = 0 } = job.data;
      const { sendEmail, getAccessToken } = await import('./lib/mailer');

      const [{ data: toAcc }, { data: fromAcc }] = await Promise.all([
        supabase.from('email_accounts').select('*').eq('id', toAccountId).maybeSingle(),
        supabase.from('email_accounts').select('*').eq('id', fromAccountId).maybeSingle(),
      ]);
      if (!toAcc || !fromAcc || toAcc.status === 'error' || fromAcc.status === 'error') return;

      let landedInSpam = false;
      let engaged = false;
      let starred = false;
      let archived = false;
      let labelled = false;
      let replyTarget: { toEmail: string; subject: string } | null = null;

      try {
        if (toAcc.type === 'gmail-oauth') {
          let token: string;
          try { token = await getAccessToken({ id: toAcc.id, type: toAcc.type, email: toAcc.email, smtp_pass: toAcc.smtp_pass }); }
          catch { return; }

          const messages = await gmailSearch(`"--warmup-ping--" from:${fromAcc.email} newer_than:2d`, token);
          for (const msg of messages.slice(0, 1)) {
            const detail = await gmailGet(`/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From,Subject`, token);
            if (!detail) continue;
            const inSpam = detail.labelIds?.includes('SPAM');
            const unread = detail.labelIds?.includes('UNREAD');
            if (inSpam) { landedInSpam = true; await gmailModify(msg.id, ['INBOX'], ['SPAM'], token); }
            if (unread) await gmailModify(msg.id, [], ['UNREAD'], token);
            engaged = true;

            // Occasional "importance" actions — star, archive, or label, never more than one
            const importanceRoll = Math.random();
            if (importanceRoll < 0.1) {
              await gmailModify(msg.id, ['STARRED'], [], token);
              starred = true;
            } else if (importanceRoll < 0.25) {
              await gmailModify(msg.id, [], ['INBOX'], token);
              archived = true;
            } else if (importanceRoll < 0.35) {
              const labelId = await getOrCreateWarmupLabelId(toAcc.email, token);
              if (labelId) { await gmailModify(msg.id, [labelId], [], token); labelled = true; }
            }

            if (Math.random() < 0.3 && chainDepth < 4) {
              const subjH = detail.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || subject;
              replyTarget = { toEmail: fromAcc.email, subject: subjH };
            }
          }
        } else {
          const imapHost = toAcc.imap_host || (toAcc.type === 'gmail-app' ? 'imap.gmail.com' : null);
          if (imapHost) {
            const { ImapFlow } = await import('imapflow');
            const imapConfig: any = {
              host: imapHost, port: toAcc.imap_port || 993, secure: true,
              auth: { user: (toAcc.smtp_user || toAcc.email).trim(), pass: (toAcc.smtp_pass || '').trim() },
              logger: false, tls: { rejectUnauthorized: false }, connectionTimeout: 15000, socketTimeout: 20000,
            };
            if (process.env.SMTP_PROXY) imapConfig.proxy = process.env.SMTP_PROXY;
            const client = new ImapFlow(imapConfig);
            try {
              await client.connect();

              const spamFolders = toAcc.type === 'gmail-app' ? ['[Gmail]/Spam'] : ['Junk', 'Spam', '[Gmail]/Spam'];
              for (const folder of spamFolders) {
                try {
                  const lock = await client.getMailboxLock(folder);
                  try {
                    const uids = await client.search({ since: new Date(Date.now() - 3 * 86400_000), body: '--warmup-ping--' }, { uid: true }) as number[];
                    if (uids?.length > 0) {
                      landedInSpam = true;
                      await client.messageMove(uids, 'INBOX', { uid: true });
                    }
                  } finally { lock.release(); }
                  break;
                } catch { /* folder not found, try next */ }
              }

              const inboxLock = await client.getMailboxLock('INBOX');
              try {
                const uids = await client.search({ since: new Date(Date.now() - 2 * 86400_000), body: '--warmup-ping--', seen: false }, { uid: true }) as number[];
                if (uids?.length > 0) {
                  await client.messageFlagsAdd(uids, ['\\Seen'], { uid: true });
                  engaged = true;
                  // IMAP has no universal "archive folder" or custom keyword support across
                  // providers — only the star-equivalent (\Flagged) is reliable here.
                  if (Math.random() < 0.1) {
                    await client.messageFlagsAdd(uids.slice(0, 1), ['\\Flagged'], { uid: true });
                    starred = true;
                  }
                  if (Math.random() < 0.3 && chainDepth < 4) {
                    for await (const msg of client.fetch(uids.slice(0, 1), { envelope: true }, { uid: true })) {
                      replyTarget = { toEmail: fromAcc.email, subject: msg.envelope?.subject || subject };
                    }
                  }
                }
              } finally { inboxLock.release(); }

              await client.logout();
            } catch (e: any) {
              console.error(`[warmup-engage] IMAP ${toAcc.email}: ${e.message}`);
              try { await client.logout(); } catch { /* already closed */ }
            }
          }
        }
      } catch (e: any) {
        console.error(`[warmup-engage] ${toAcc.email}: ${e.message}`);
      }

      // Every signal below is credited to fromAccountId — it's fromAccountId's
      // reputation being measured, not the recipient's.
      if (landedInSpam) {
        await logAccountEvent(fromAccountId, 'spam_placement', { via: toAcc.email });
        await logAccountEvent(fromAccountId, 'rescued_from_spam', { via: toAcc.email });
        await supabase.from('email_accounts').update({ spam_count: (fromAcc.spam_count ?? 0) + 1 }).eq('id', fromAccountId);
      }
      if (engaged) {
        await logAccountEvent(fromAccountId, 'open', { via: toAcc.email });
        await supabase.from('email_accounts').update({ open_count: (fromAcc.open_count ?? 0) + 1 }).eq('id', fromAccountId);
      }
      if (starred) await logAccountEvent(fromAccountId, 'star', { via: toAcc.email });
      if (archived) await logAccountEvent(fromAccountId, 'archive', { via: toAcc.email });
      if (labelled) await logAccountEvent(fromAccountId, 'label', { via: toAcc.email, label: 'Warmup' });

      if (replyTarget) {
        const replyText = WARMUP_REPLIES[Math.floor(Math.random() * WARMUP_REPLIES.length)];
        try {
          await sendEmail(
            { id: toAcc.id, type: toAcc.type, email: toAcc.email, smtp_host: toAcc.smtp_host, smtp_port: toAcc.smtp_port, smtp_user: toAcc.smtp_user, smtp_pass: toAcc.smtp_pass },
            { from: toAcc.email, to: replyTarget.toEmail, subject: `Re: ${replyTarget.subject}`, text: `${replyText}\n--warmup-ping--`, html: `<p>${replyText}</p><span style="display:none;font-size:0">--warmup-ping--</span>` }
          );
          await logAccountEvent(fromAccountId, 'reply', { via: toAcc.email });
          await supabase.from('email_accounts').update({ reply_count: (fromAcc.reply_count ?? 0) + 1 }).eq('id', fromAccountId);

          // Multi-step thread: reverse direction, 2-5 messages total per conversation
          if (chainDepth < 4) {
            await engageQueue.add('engage', {
              fromAccountId: toAccountId, toAccountId: fromAccountId,
              subject: replyTarget.subject, chainDepth: chainDepth + 1,
            }, { delay: pickEngageDelayMs() });
          }
        } catch (e: any) {
          console.error(`[warmup-engage] reply send failed ${toAcc.email} → ${replyTarget.toEmail}: ${e.message}`);
        }
      }
    }, { connection, concurrency: 3 });

    console.log('✅ Warmup engagement worker started (delayed reads/replies/star/archive)');

    new SyncWorker('warmup', async (job: any) => {
      const isManual = job?.data?.manual === true;

      // Business-hours gate: only run warmup between 07:00–21:00 UTC.
      // Manual "Run Now" from admin bypasses this gate.
      const utcHour = new Date().getUTCHours();
      if (!isManual && (utcHour < 7 || utcHour >= 21)) {
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

      // Phase 1 migration (20260705_warmup_phase1.sql) adds the columns below. If it hasn't
      // been run yet, PostgREST errors on the whole select — fall back to the pre-migration
      // column set so warmup keeps running (with the new scoring simply defaulting) instead
      // of going dark until someone runs the SQL.
      let allWarmupAccounts: any[] | null = null;
      const fullSelect = await supabase
        .from('email_accounts')
        .select('id, user_id, email, type, smtp_host, smtp_port, smtp_user, smtp_pass, imap_host, imap_port, warmup_day, warmup_target, health_score, sent_today, is_pool_account, warmup_pool_mode, warmup_last_run_date, spf_status, dkim_status, dmarc_status, domain_checked_at, warmup_paused, warmup_pause_reason, warmup_paused_at, consecutive_stable_days, bounce_count, spam_count, reply_count, open_count, auth_error_count')
        .eq('warmup_enabled', true)
        .neq('status', 'error');

      if (fullSelect.error) {
        console.warn(`[warmup] Extended columns unavailable (${fullSelect.error.message}) — has supabase/migrations/20260705_warmup_phase1.sql been run? Falling back to legacy column set for this cycle.`);
        const fallback = await supabase
          .from('email_accounts')
          .select('id, user_id, email, type, smtp_host, smtp_port, smtp_user, smtp_pass, imap_host, imap_port, warmup_day, warmup_target, health_score, sent_today, is_pool_account, warmup_pool_mode, warmup_last_run_date')
          .eq('warmup_enabled', true)
          .neq('status', 'error');
        allWarmupAccounts = fallback.data;
      } else {
        allWarmupAccounts = fullSelect.data;
      }

      if (!allWarmupAccounts || allWarmupAccounts.length < 2) {
        console.log(`[warmup] Skipping: only ${allWarmupAccounts?.length ?? 0} warmup-enabled account(s) in system — need ≥2 to cross-send. Add pool accounts at /dashboard/admin/warmup.`);
        return;
      }

      console.log(`[warmup] Pool: ${allWarmupAccounts.length} accounts (pool: ${allWarmupAccounts.filter(a => a.is_pool_account).length}, users: ${allWarmupAccounts.filter(a => !a.is_pool_account).length})`);

      const { sendEmail } = await import('./lib/mailer');
      const { detectProvider, computeHealthScore, dailySendCap, shouldPause, canRecover, isWarmupComplete, isWeekendUTC, WEEKEND_MULTIPLIER } = await import('./lib/warmup-health');
      const { checkDomainAuth } = await import('./lib/domain-health');

      // Track pairs sent this cycle — prevents A→B and B→A in the same run
      const sentPairs = new Set<string>();
      const today = new Date().toISOString().slice(0, 10);

      // ── PHASE 1: SEND warmup emails (parallel batches of 10) ─────────────
      // Each account's result (email row, day/health update, history row) is written
      // to the DB immediately after that account finishes — not batched up and flushed
      // once at the end of the whole cycle. A worker restart/redeploy mid-cycle (which
      // happens routinely on deploy) would otherwise lose already-sent accounts' results
      // even though the emails had actually gone out.
      const BATCH_SIZE = 10;
      for (let b = 0; b < allWarmupAccounts.length; b += BATCH_SIZE) {
        const batch = allWarmupAccounts.slice(b, b + BATCH_SIZE);
        await Promise.all(batch.map(async account => {
          try {
            // Random start offset per account (0–8 min) so all accounts don't fire simultaneously
            // Skipped for manual "Run Now" so admin sees results immediately
            if (!isManual) {
              await new Promise(r => setTimeout(r, Math.random() * 8 * 60 * 1000));
            }

            const todayStr = new Date().toISOString().slice(0, 10);
            // Skip accounts that already ran today — except on manual trigger (allow re-run)
            const alreadyRanToday = !isManual && account.warmup_last_run_date === todayStr;

            // ── Domain auth check — at most once every 7 days per account ──
            const needsAuthCheck = !account.domain_checked_at
              || (Date.now() - new Date(account.domain_checked_at).getTime()) > 7 * 86400_000;
            let spfStatus = account.spf_status || 'unknown';
            let dkimStatus = account.dkim_status || 'unknown';
            let dmarcStatus = account.dmarc_status || 'unknown';
            if (needsAuthCheck) {
              try {
                const auth = await checkDomainAuth(account.email);
                spfStatus = auth.spf; dkimStatus = auth.dkim; dmarcStatus = auth.dmarc;
              } catch { /* keep previous status on lookup failure */ }
            }
            const domainAuthAllPass = spfStatus === 'pass' && dkimStatus === 'pass' && dmarcStatus === 'pass';

            // ── Pause / recovery check ──
            const events7d = await fetchEventCounts(account.id, Date.now() - 7 * 86400_000);
            let paused = !!account.warmup_paused;
            let dayAdjustment = 0;

            if (paused) {
              const events3d = await fetchEventCounts(account.id, Date.now() - 3 * 86400_000);
              if (canRecover({ sent: events3d.sent7d, bounce: events3d.bounce7d, spam: events3d.spam7d }, account.warmup_paused_at)) {
                paused = false;
                dayAdjustment = -5; // recovery mode: step back and re-ramp instead of resuming at full volume
                await supabase.from('notifications').insert({
                  user_id: account.user_id,
                  message: `${account.email} recovered — warmup resuming at reduced volume to rebuild reputation safely.`,
                  type: 'info',
                });
              }
            }

            if (paused || alreadyRanToday) {
              // Still compute health from existing signals so the dashboard stays live even
              // while paused/idle, but don't advance day or send anything.
              const health = computeHealthScore({
                events: events7d, domainAuth: { spf: spfStatus, dkim: dkimStatus, dmarc: dmarcStatus },
                consecutiveStableDays: account.consecutive_stable_days ?? 0, warmupDay: account.warmup_day ?? 0,
                hasAuthErrorNow: false,
              });
              await safeUpdateAccount(account.id, {
                health_score: health.score, spf_status: spfStatus, dkim_status: dkimStatus, dmarc_status: dmarcStatus,
                domain_checked_at: needsAuthCheck ? new Date().toISOString() : account.domain_checked_at,
                last_health_calc_at: new Date().toISOString(),
              });
              // Keep today's already-written history row in sync with the live score.
              // Without this, only the FIRST cycle of the day ever writes warmup_history,
              // so later cycles keep recalculating a higher live health_score while the
              // dashboard's Stats tab stays frozen at the morning's number — a real
              // inconsistency users can actually see (Accounts tab vs Stats tab disagreeing
              // on the same account, same day). No-ops harmlessly if today has no row yet.
              await supabase.from('warmup_history').update({
                health_score: health.score,
                inbox_rate: health.factors.inboxRate,
                spam_rate: health.factors.spamRate,
                bounce_rate: health.factors.bounceRate,
              }).eq('email', account.email).eq('date', today);
              return;
            }

            const day = Math.max(0, (account.warmup_day ?? 0) + 1 + dayAdjustment);
            const provider = detectProvider(account);
            const priorHealth = account.health_score ?? 50;
            const weekendFactor = isWeekendUTC() ? WEEKEND_MULTIPLIER : 1;
            const emailsToday = Math.max(isWeekendUTC() ? 0 : 1, Math.round(
              dailySendCap({ provider, warmupDay: day, health: priorHealth, domainAuthAllPass }) * weekendFactor
            ));

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
            if (pool.length === 0 || emailsToday === 0) {
              if (pool.length === 0) console.warn(`[warmup] ${account.email}: no eligible pool (mode: ${account.warmup_pool_mode || 'admin_pool'}, total warmup accounts: ${allWarmupAccounts.length}) — add pool accounts or enable warmup on more accounts`);
              await safeUpdateAccount(account.id, {
                spf_status: spfStatus, dkim_status: dkimStatus, dmarc_status: dmarcStatus,
                domain_checked_at: needsAuthCheck ? new Date().toISOString() : account.domain_checked_at,
              });
              return;
            }

            let sent = 0;
            let hasAuthErrorNow = false;
            // Shuffle pool so send order is random
            const shuffled = [...pool].sort(() => Math.random() - 0.5);

            // Spread sends across whatever's left of today's business-hours window
            // (07:00–21:00 UTC) instead of a fixed block, so timing looks organic.
            const endOfWindowMs = new Date(new Date().setUTCHours(21, 0, 0, 0)).getTime();
            const remainingWindowMs = Math.max(15 * 60 * 1000, endOfWindowMs - Date.now());

            for (let i = 0; i < emailsToday; i++) {
              if (i > 0) {
                const baseMs = remainingWindowMs / emailsToday;
                await new Promise(r => setTimeout(r, baseMs * (0.5 + Math.random())));
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
                // Written immediately so a mid-cycle crash can't lose an email that
                // actually went out (previously batched to a single flush at cycle end).
                await supabase.from('warmup_emails').insert({ from_account_id: account.id, to_account_id: toAccount.id, subject, body, sent_at: new Date().toISOString() });
                await engageQueue.add('engage', { fromAccountId: account.id, toAccountId: toAccount.id, subject, chainDepth: 0 }, { delay: pickEngageDelayMs() });
                await logAccountEvent(account.id, 'sent', {});
                sent++;
              } catch (e: any) {
                console.error(`[warmup-send] ${account.email} → ${toAccount.email}: ${e.message}`);
                if (e.responseCode === 535 || e.code === 'EAUTH') {
                  hasAuthErrorNow = true;
                  await logAccountEvent(account.id, 'auth_error', { message: e.message });
                  break;
                }
              }
            }

            const events7dAfterSend = { ...events7d, sent7d: events7d.sent7d + sent };
            const health = computeHealthScore({
              events: events7dAfterSend, domainAuth: { spf: spfStatus, dkim: dkimStatus, dmarc: dmarcStatus },
              consecutiveStableDays: account.consecutive_stable_days ?? 0, warmupDay: day,
              hasAuthErrorNow,
            });

            const pauseCheck = shouldPause(events7dAfterSend, hasAuthErrorNow);
            const willPause = pauseCheck.pause;
            if (willPause && !account.warmup_paused) {
              // Name the specific healthy sibling account absorbing each linked
              // active campaign's sends, same selection logic as the scheduler/
              // retry route — only runs on this pause transition (rare), not the
              // routine 6h cycle, so the extra lookups are cheap.
              const { data: links } = await supabase
                .from('campaign_accounts')
                .select('campaign:campaigns(id, name, status, campaign_accounts(account:email_accounts(*)))')
                .eq('account_id', account.id);
              const activeCampaigns = (links ?? [])
                .map((l: any) => l.campaign)
                .filter((c: any) => c && c.status === 'active');

              let routingMsg = '';
              if (activeCampaigns.length) {
                const { computeAccountRemaining } = await import('./lib/campaign-scheduling');
                const perCampaign: string[] = [];
                for (const camp of activeCampaigns as any[]) {
                  const siblings = (camp.campaign_accounts ?? []).map((ca: any) => ca.account).filter((a: any) => a && a.id !== account.id);
                  const remaining = siblings.length ? await computeAccountRemaining(siblings) : new Map();
                  const takeoverId = [...remaining.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
                  const takeover = takeoverId ? siblings.find((a: any) => a.id === takeoverId) : null;
                  perCampaign.push(takeover
                    ? `"${camp.name}" will route to ${takeover.email}`
                    : `"${camp.name}" has no other healthy account — sends will pause until recovery`);
                }
                routingMsg = ` ${perCampaign.join('; ')}.`;
              }

              await supabase.from('notifications').insert({
                user_id: account.user_id,
                message: `${account.email} warmup paused: ${pauseCheck.reason}.${routingMsg}`,
                type: 'warning',
              });
            }

            const newConsecutiveStable = health.score >= 80 && !willPause
              ? (account.consecutive_stable_days ?? 0) + 1
              : 0;

            // Completion: health-and-stability based, not just "day X reached"
            const target = account.warmup_target ?? 30;
            const recentHistory = await supabase
              .from('warmup_history').select('health_score').eq('email', account.email)
              .order('date', { ascending: false }).limit(5);
            const recentScores = [health.score, ...((recentHistory.data || []).map((r: any) => r.health_score))];
            const complete = isWarmupComplete(recentScores.reverse(), day, Math.min(14, target));

            // Write this account's result now — immediately after it finishes, not
            // deferred to a batch flush after every other account in the cycle is done.
            await safeUpdateAccount(account.id, {
              warmup_day: day,
              health_score: health.score,
              sent_today: sent,
              warmup_last_run_date: new Date().toISOString().slice(0, 10),
              spf_status: spfStatus, dkim_status: dkimStatus, dmarc_status: dmarcStatus,
              domain_checked_at: needsAuthCheck ? new Date().toISOString() : account.domain_checked_at,
              consecutive_stable_days: newConsecutiveStable,
              warmup_paused: willPause,
              warmup_pause_reason: willPause ? pauseCheck.reason : null,
              warmup_paused_at: willPause && !account.warmup_paused ? new Date().toISOString() : (willPause ? account.warmup_paused_at : null),
              last_health_calc_at: new Date().toISOString(),
              ...(complete ? { warmup_enabled: false, status: 'active' } : {}),
            });
            if (hasAuthErrorNow) {
              await supabase.from('email_accounts').update({ status: 'error', warmup_enabled: false }).eq('id', account.id);
            }
            if (complete) {
              await supabase.from('notifications').insert({
                user_id: account.user_id,
                message: `${account.email} warmup complete! Health has stayed 90+ for several days straight — safe to lean on for campaigns. Re-enable warmup any time to keep the reputation warm.`,
                type: 'info',
              });
            }

            // Persist today's history row immediately too (upsert so re-runs don't duplicate)
            await safeUpsertHistory([{
              account_id: account.id,
              email: account.email,
              user_id: account.user_id,
              date: today,
              day_number: day,
              emails_sent: sent,
              health_score: health.score,
              paused: willPause,
              inbox_rate: health.factors.inboxRate,
              spam_rate: health.factors.spamRate,
              bounce_rate: health.factors.bounceRate,
            }]);

            console.log(`[warmup-send] ${account.email} day=${day}${complete ? ' (COMPLETE)' : ''}${willPause ? ' (PAUSED)' : ''} sent=${sent}/${emailsToday} score=${health.score} inbox=${health.factors.inboxRate ?? '—'}%`);
          } catch (e: any) {
            console.error(`[warmup-send] ${account.email}: ${e.message}`);
          }
        }));
      }

      // ── PHASE 2: backstop spam sweep — catches anything a delayed engage job missed
      // (e.g. a worker restart). Primary engagement now happens via warmup-engage jobs.
      for (const account of allWarmupAccounts) {
        try {
          if (account.type !== 'gmail-oauth') {
            const imapHost = account.imap_host || (account.type === 'gmail-app' ? 'imap.gmail.com' : null);
            if (!imapHost) continue;
            const { ImapFlow } = await import('imapflow');
            const imapConfig: any = {
              host: imapHost, port: account.imap_port || 993, secure: true,
              auth: { user: (account.smtp_user || account.email).trim(), pass: (account.smtp_pass || '').trim() },
              logger: false, tls: { rejectUnauthorized: false }, connectionTimeout: 15000, socketTimeout: 20000,
            };
            if (process.env.SMTP_PROXY) imapConfig.proxy = process.env.SMTP_PROXY;
            const client = new ImapFlow(imapConfig);
            try {
              await client.connect();
              const spamFolders = account.type === 'gmail-app' ? ['[Gmail]/Spam'] : ['Junk', 'Spam', '[Gmail]/Spam'];
              for (const folder of spamFolders) {
                try {
                  const lock = await client.getMailboxLock(folder);
                  try {
                    const uids = await client.search({ since: new Date(Date.now() - 5 * 86400_000), body: '--warmup-ping--' }, { uid: true }) as number[];
                    if (uids?.length > 0) {
                      await client.messageMove(uids, 'INBOX', { uid: true });
                      console.log(`[warmup-backstop] rescued ${uids.length} stragglers from spam: ${account.email}`);
                    }
                  } finally { lock.release(); }
                  break;
                } catch { /* folder not found, try next */ }
              }
              await client.logout();
            } catch (e: any) {
              console.error(`[warmup-backstop] IMAP ${account.email}: ${e.message}`);
              try { await client.logout(); } catch { /* already closed */ }
            }
          }
        } catch (e: any) {
          console.error(`[warmup-backstop] ${account.email}: ${e.message}`);
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

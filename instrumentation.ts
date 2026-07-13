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
    const { notifyUserByEmail } = await import('./lib/resend');

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
          await notifyUserByEmail({
            userId: campaign.user_id,
            subject: `You've used all your email credits`,
            bodyHtml: `<p style="font-size:15px;color:#111;line-height:1.5">You've used all ${creditsTotal} email credits. Upgrade your plan or add more credits to keep your campaigns sending.</p>`,
            link: `/dashboard/billing`,
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
          .select('message_id, gmail_thread_id, subject')
          .eq('campaign_id', campaign.id)
          .eq('lead_id', lead.id)
          .eq('step_number', 0)
          .order('sent_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        // message_id is now ALWAYS the real RFC822 Message-ID regardless of
        // account type — this is what makes the RECIPIENT's own mail client
        // correctly thread the reply (In-Reply-To/References must reference
        // an actual Message-ID the recipient has seen; Gmail's internal
        // threadId is never transmitted to them and means nothing on their
        // end). gmail_thread_id is separate and ADDITIONAL for gmail-oauth
        // only — it's what makes the SENDING account's own Gmail Sent view
        // also show it threaded, via the API's threadId parameter. Both are
        // set together below, not either/or.
        if (firstSent?.message_id) inReplyTo = firstSent.message_id;
        if (account.type === 'gmail-oauth' && firstSent?.gmail_thread_id) gmailThreadId = firstSent.gmail_thread_id;
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

        const { threadId, sentMessageId } = await sendEmail(account, {
          from: fromHeader,
          to: lead.email,
          subject,
          text: body,
          html: fullHtml,
          messageId: explicitMessageId,
          // inReplyTo/references (a real RFC822 Message-ID) and gmailThreadId
          // (Gmail's internal API bookkeeping) are independent and both get
          // passed when applicable — NEVER let gmailThreadId overwrite
          // inReplyTo/references. Real bug, found live: the raw Gmail
          // threadId (a bare hex string, not RFC822 format) was previously
          // being used AS the In-Reply-To/References header value for
          // gmail-oauth follow-ups — meaningless to the RECIPIENT's mail
          // client (Gmail's threadId is never transmitted to them, it only
          // organizes the SENDER's own Sent view), so the recipient's own
          // client had nothing valid to thread against and showed the
          // follow-up as an unrelated new conversation.
          ...(inReplyTo ? { inReplyTo, references: inReplyTo } : {}),
          ...(gmailThreadId ? { gmailThreadId } : {}),
          // Gmail's API silently OVERWRITES any custom Message-ID we send —
          // confirmed live by pulling a real sent thread's headers, it always
          // assigns its own <CAxxxx@mail.gmail.com> one. So our fabricated
          // explicitMessageId is never what the recipient's client actually
          // received. Only step 0 needs the real one fetched back — every
          // follow-up always threads against step 0 specifically (see the
          // firstSent query above, always .eq('step_number', 0)), never a
          // chain of prior steps, so nothing else ever reads a later step's ID.
          ...(account.type === 'gmail-oauth' && stepNumber === 0 ? { captureRealMessageId: true } : {}),
        });

        // message_id is the real RFC822 Message-ID whenever we have one —
        // for gmail-oauth step 0 that's what Gmail itself actually assigned
        // (see captureRealMessageId above; our own fabricated ID is never
        // what shipped), for everything else it's our own explicitMessageId,
        // which SMTP submission (nodemailer, non-API) does preserve as-is.
        // This is what In-Reply-To/References on the NEXT follow-up (and
        // IMAP inbox-sync matching) key off of.
        // gmail_thread_id is separate, gmail-oauth only, step 0 only (that's
        // the only row any follow-up ever looks up) — Gmail's own internal
        // thread bookkeeping, used for the gmailThreadId API parameter and
        // by inbox-sync's Path 1 thread-lookup, never for header values.
        const updates: Record<string, unknown> = { message_id: sentMessageId || explicitMessageId };
        if (account.type === 'gmail-oauth' && stepNumber === 0 && threadId) {
          updates.gmail_thread_id = threadId;
        }
        if (sentEmail?.id) {
          await supabase.from('sent_emails').update(updates).eq('id', sentEmail.id);
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
          await notifyUserByEmail({
            userId: campaign.user_id,
            subject: `Sending account ${account.email} needs attention`,
            bodyHtml: `<p style="font-size:15px;color:#111;line-height:1.5">Your sending account <strong>${account.email}</strong> has an error: ${err.message}.${routingMsg}</p>`,
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
          .select('id, name, user_id, daily_limit, daily_limit_mode, from_hour, to_hour, timezone, active_days, min_delay_secs, max_delay_secs, followup_priority_mode, followup_weight_pct, campaign_accounts(account:email_accounts(*)), email_steps(step_number, thread_mode)')
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

            const stepThreadModeByNumber = new Map<number, string>(
              (campaign.email_steps ?? []).map((s: any) => [s.step_number, s.thread_mode])
            );

            for (const cl of followupsToSend as any[]) {
              // Locked mailbox for this thread, as long as it's still pacing-eligible
              // this cycle. Falling back to a DIFFERENT account mid-thread is only
              // safe when there's no continuity to protect, OR the sticky account is
              // genuinely unavailable today (unhealthy/paused/error/no capacity left —
              // not in accountRemaining at all), matching the existing automatic
              // mailbox failover behavior (a permanently broken mailbox must still
              // hand off, or the lead gets stuck forever). What must NOT fall back:
              // a 'reply' step whose sticky account is perfectly healthy and simply
              // mid-cooldown from a recent send THIS CYCLE (in accountRemaining, just
              // not isPacingEligible yet) — switching mailboxes there would send a
              // "reply" from a different address than the original email in that
              // thread, broken-looking to the recipient and a real spam-trigger
              // pattern — found live via a real campaign where exactly this happened
              // to 2 leads. That case is simply skipped this cycle instead (self-heals
              // next cycle once the cooldown clears).
              const threadMode = stepThreadModeByNumber.get(cl.current_step);
              const stickyInPlay = !!cl.account_id && accountRemaining.has(cl.account_id);
              const stickyEligible = stickyInPlay && isPacingEligible(accountsById.get(cl.account_id));
              const stickyId = stickyEligible ? cl.account_id : undefined;
              const canFallback = !cl.account_id || threadMode !== 'reply' || !stickyInPlay;
              const fallback = canFallback
                ? [...accountRemaining.entries()].filter(([id]) => isPacingEligible(accountsById.get(id))).sort((a, b) => b[1] - a[1])[0]
                : undefined;
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

              // Atomic upsert, not check-then-insert — the old pattern raced
              // under concurrent worker execution (e.g. two instances briefly
              // overlapping during a deploy restart), producing duplicate
              // inbox_threads rows for one real reply. ignoreDuplicates:true
              // maps to INSERT ... ON CONFLICT DO NOTHING; .select() then
              // returns the row only if THIS call actually inserted it, so
              // the notification only fires once regardless of how many
              // concurrent callers raced for the same reply.
              const { data: inserted } = await supabase
                .from('inbox_threads')
                .upsert({
                  user_id: account.user_id, campaign_id: sent.campaign_id,
                  lead_id: sent.lead_id, account_id: account.id,
                  subject: subjectHeader, last_message: cleanSnip(replySnippet || ''),
                  from_email: fromEmail, from_name: fromName,
                  status: 'new', read: false, received_at: receivedAt,
                }, { onConflict: 'user_id,lead_id,campaign_id', ignoreDuplicates: true })
                .select('id');

              if (inserted && inserted.length > 0) {
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
            // Reads gmail_thread_id specifically — Gmail's internal API thread
            // ID, distinct from message_id (which is now always the real
            // RFC822 Message-ID, used for In-Reply-To/References headers and
            // the IMAP path below, never a valid input to Gmail's threads.get).
            const { data: sentEmails } = await supabase
              .from('sent_emails')
              .select('id, gmail_thread_id, lead_id, campaign_id, subject')
              .eq('account_id', account.id)
              .not('gmail_thread_id', 'is', null)
              .is('replied_at', null)
              .limit(30);

            const handledThreadIds = new Set<string>();

            for (const sent of (sentEmails || [])) {
              try {
                const thread = await gmailGet(
                  `/gmail/v1/users/me/threads/${sent.gmail_thread_id}?format=metadata&metadataHeaders=From,Subject,Date`,
                  token,
                );
                if (!thread?.messages || thread.messages.length <= 1) continue;
                handledThreadIds.add(sent.gmail_thread_id);

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
                    await supabase.from('sent_emails').update({ gmail_thread_id: msg.threadId }).eq('id', sentRow.id);
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

              // Atomic upsert, not check-then-insert — see the matching
              // gmail-oauth fix above for why (this exact pattern raced
              // under concurrent worker execution, confirmed live with 3
              // duplicate rows for one real reply). ignoreDuplicates:true
              // + .select() returns the row only if THIS call inserted it.
              const { data: inserted } = await supabase
                .from('inbox_threads')
                .upsert({
                  user_id: account.user_id, campaign_id: sent.campaign_id,
                  lead_id: sent.lead_id, account_id: account.id,
                  subject: reply.subject || sent.subject,
                  last_message: reply.snippet || `Reply from ${reply.fromEmail}`,
                  from_email: reply.fromEmail, from_name: reply.fromName,
                  status: 'new', read: false, received_at: reply.receivedAt,
                }, { onConflict: 'user_id,lead_id,campaign_id', ignoreDuplicates: true })
                .select('id');

              if (inserted && inserted.length > 0) {
                await notifyIfEnabled(supabase, account.user_id, 'notif_new_reply',
                  `New reply from ${reply.fromName || reply.fromEmail} — "${reply.subject || sent.subject}"`,
                  'info', '/dashboard/inbox');
              } else if (reply.snippet) {
                // Thread already existed (this was a conflict, not an insert)
                // — backfill snippet for threads created before snippet
                // support. Safe to run redundantly under concurrent callers,
                // it's an idempotent UPDATE, not a row-creating operation.
                await supabase.from('inbox_threads')
                  .update({ last_message: reply.snippet })
                  .eq('user_id', account.user_id).eq('lead_id', sent.lead_id).eq('campaign_id', sent.campaign_id)
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

    // Paired templates: each entry = { subject, body, arc }. arc[0] = the
    // first reply, arc[1] = a follow-up, arc[2] = a closing message — a real
    // multi-turn conversation on the SAME topic (question → reply → follow-up
    // → closing) instead of generic "Hi/Thanks/Bye" filler. chainDepth (0-3)
    // indexes directly into arc when a thread continues.
    const WARMUP_PAIRS: { subject: string; body: string; arc: [string, string, string] }[] = [
      {
        subject: 'Quick question about Q3 planning',
        body: 'Hi,\n\nHope your Q3 is going well. I had a quick question about how your team is structuring priorities for the rest of the quarter — are you focusing more on growth or efficiency?\n\nWould love to hear your thoughts.\n\nBest',
        arc: [
          'Good question! We\'re leaning toward efficiency this quarter — trying to tighten up processes before pushing growth again. How about your side?',
          'We started with a full process audit actually — found a lot of manual steps that were eating time for no real benefit. Slow going but worth it.',
          'Anyway, good talking through this — let\'s catch up again once Q4 planning kicks off.',
        ],
      },
      {
        subject: 'Saw your LinkedIn post — had to reach out',
        body: 'Hi,\n\nI came across your recent post and it really resonated with me. The point about building systems before scaling was something I\'ve been thinking about a lot lately.\n\nWould love to connect and exchange ideas sometime.\n\nBest regards',
        arc: [
          'Thanks for reaching out! That post got a lot of engagement — clearly it struck a chord. Happy to connect and chat more about it.',
          'Funny enough I\'m mid-way through applying that same idea to our own onboarding flow right now. Slower than I\'d like but the payoff is real.',
          'Great chatting — I\'ll ping you once we\'ve got real results to compare notes on.',
        ],
      },
      {
        subject: 'Referral from a mutual connection',
        body: 'Hello,\n\nA mutual colleague suggested I reach out to you. They mentioned you\'ve done some interesting work in the ops space and thought we\'d have a lot to talk about.\n\nLooking forward to connecting.\n\nWarm regards',
        arc: [
          'Great to hear from you! Always happy to connect with people in the same space. What kind of work are you focused on right now?',
          'Mostly process design and tooling right now — trying to cut down the number of handoffs between teams.',
          'Sounds like a good problem to be solving. Let\'s stay in touch either way.',
        ],
      },
      {
        subject: 'Following up on last week\'s conference',
        body: 'Hi,\n\nIt was great seeing you at the conference last week. I\'ve been thinking about the panel discussion on AI in sales — some really eye-opening perspectives.\n\nWanted to follow up and stay in touch.\n\nCheers',
        arc: [
          'Great connecting with you too! That panel was one of the highlights for me. The bit about AI replacing SDRs was controversial but probably not far off.',
          'Still thinking about that one honestly. I don\'t think it\'s replacement so much as everyone\'s job quietly getting more technical.',
          'Well put. Good seeing you there — let\'s grab time at the next one too.',
        ],
      },
      {
        subject: 'Thoughts on the market shift?',
        body: 'Hello,\n\nWith everything happening in the market right now, I\'m curious how your team is adapting. We\'ve been seeing a real shift in buyer behavior over the last 6 months.\n\nWould love to hear how you\'re navigating it.\n\nBest',
        arc: [
          'Definitely feeling it on our end too. Buyers are taking longer to decide and asking a lot more questions before committing. We\'ve had to rethink our whole nurture sequence.',
          'Same here — added a couple of extra touchpoints just to answer objections earlier instead of at the end.',
          'Makes sense. Appreciate you sharing — helpful to compare notes on this one.',
        ],
      },
      {
        subject: 'Collaboration opportunity?',
        body: 'Hi,\n\nI\'ve been following your work for a while and think there could be a really interesting collaboration opportunity between our teams.\n\nWould you be open to a quick 20-min call to explore?\n\nBest regards',
        arc: [
          'Appreciate you reaching out! Always open to exploring collaborations. Send me some times that work for you and we\'ll find a slot.',
          'Just sent an invite for next week — let me know if none of those times work.',
          'Perfect, got it on my calendar. Talk soon.',
        ],
      },
      {
        subject: 'Re: the article you shared',
        body: 'Hello,\n\nI saw the article you shared about outbound strategies and found it really useful — especially the part about personalization at scale.\n\nDo you have any resources you\'d recommend on that topic?\n\nThanks',
        arc: [
          'Glad it was helpful! For personalization at scale, I\'d recommend checking out some of the work coming out of the Pavilion community. Lots of good frameworks there.',
          'Just checked it out, exactly what I was looking for. Appreciate the pointer.',
          'Anytime — always happy to pass along good resources.',
        ],
      },
      {
        subject: 'Quick intro — we work in similar spaces',
        body: 'Hi,\n\nI was looking through my network and noticed we work in overlapping spaces. I\'d love to stay connected and share notes on what\'s working.\n\nNo agenda — just think it\'d be valuable to know each other.\n\nWarm regards',
        arc: [
          'Totally agree — always good to build those peer connections. What\'s your focus area within the space? I work mostly on the go-to-market side.',
          'Mostly the same actually, with a bit more focus on retention lately.',
          'Nice overlap — let\'s keep each other posted on what\'s working.',
        ],
      },
      {
        subject: 'Hiring insight — curious about your approach',
        body: 'Hello,\n\nWe\'re in the middle of scaling our team and I\'ve been researching how companies our size approach the first sales hire.\n\nHave you been through that stage? Would love any perspective.\n\nBest',
        arc: [
          'Been through it twice! The biggest mistake is hiring before the process is repeatable. Happy to share what worked for us if you want to jump on a call.',
          'That lines up with what I\'ve been hearing elsewhere too. Would definitely take you up on that call.',
          'Sounds good, I\'ll send a couple of times over.',
        ],
      },
      {
        subject: 'Loved your take on cold email',
        body: 'Hi,\n\nI read your thoughts on cold email and you\'re spot on — most people over-engineer the copy and forget that deliverability is half the battle.\n\nAre you still experimenting with warm-up strategies?\n\nCheers',
        arc: [
          'Yes, actively! Warmup has become non-negotiable for us. We saw a 30% improvement in inbox rates just by being more systematic about it. What are you using?',
          'Been testing a mix of approaches honestly, still figuring out what sticks long term.',
          'Same boat — always evolving. Good talking shop on this.',
        ],
      },
      {
        subject: 'Interesting webinar coming up',
        body: 'Hello,\n\nI\'m running a small virtual session next month on pipeline generation — keeping it to 20 people max to keep it actionable.\n\nThought you might find it useful. Would you want a spot?\n\nBest regards',
        arc: [
          'That sounds really interesting — I\'d definitely be up for joining. What topics are you planning to cover? Send over the details when you have them.',
          'Just sent the agenda over — let me know if the timing works.',
          'Got it, I\'m in. Looking forward to it.',
        ],
      },
      {
        subject: 'Checking in — how\'s business?',
        body: 'Hi,\n\nHope things are going well on your end. We\'ve had a busy few months and I\'ve been meaning to check in with a few people I respect in the industry.\n\nHow are things looking for you heading into the next quarter?\n\nBest',
        arc: [
          'Things are actually going really well, thanks for asking! We had a strong close to last quarter and momentum is carrying over. How about you?',
          'Similar story here honestly — steady growth, no complaints.',
          'Good to hear. Let\'s catch up properly again soon.',
        ],
      },
      {
        subject: 'Intro from a shared connection',
        body: 'Hello,\n\nHope you don\'t mind me reaching out — we have a few shared connections and I\'ve heard your name come up more than once in conversations about B2B sales.\n\nWould love to find some time to connect.\n\nWarm regards',
        arc: [
          'Small world! Always happy to connect with people who come recommended. What\'s the best way to get 20 minutes on your calendar?',
          'Just sent an invite over — happy to move it if it doesn\'t work.',
          'Perfect, see you then.',
        ],
      },
      {
        subject: 'Your framework makes a lot of sense',
        body: 'Hi,\n\nI\'ve been implementing a framework similar to what you described and the results have been promising. We\'re seeing faster cycles and better conversion.\n\nCurious if you\'ve tested this across different industries.\n\nThanks',
        arc: [
          'Great to hear you\'re seeing results! We\'ve tested it in SaaS and professional services mostly. Manufacturing was trickier — longer cycles needed more touchpoints.',
          'That tracks with what we\'re seeing too on the longer-cycle side.',
          'Glad it\'s useful — keep me posted on how it goes.',
        ],
      },
      {
        subject: 'Partnership idea — worth a chat?',
        body: 'Hello,\n\nI\'ve been thinking about a potential partnership angle between what your company does and what we\'re building.\n\nI think there\'s a complementary fit that could benefit both sides. Worth a quick conversation?\n\nBest',
        arc: [
          'Interesting — I\'m always open to exploring partnerships that make sense. Can you send a quick overview of what you have in mind? Happy to jump on a call after.',
          'Sent a short doc over — let me know your initial thoughts.',
          'Sounds promising, let\'s find time to dig in further.',
        ],
      },
      {
        subject: 'How are you handling the AI wave?',
        body: 'Hi,\n\nCurious how your team is thinking about AI tools in your workflow. We\'ve been testing a few things and the results are... mixed.\n\nWould love to compare notes.\n\nCheers',
        arc: [
          'Ha — mixed is the right word! We\'ve had some great wins with AI for research and first drafts, but it still needs a human eye before anything goes out. What tools are you trying?',
          'Similar experience honestly — great for a starting point, not so great unsupervised.',
          'Exactly the balance we\'re trying to strike too. Good comparing notes.',
        ],
      },
      {
        subject: 'Saw your company is hiring',
        body: 'Hello,\n\nNoticed you\'re scaling the team — congrats! Growth mode is exciting but also a lot to manage.\n\nWe\'ve helped teams in similar situations streamline their onboarding and ramp time. Happy to share some notes if useful.\n\nBest regards',
        arc: [
          'Thanks! Yes, it\'s a great problem to have but definitely keeps us on our toes. I\'d be interested in hearing what you\'ve seen work for onboarding. Let\'s find some time.',
          'Just sent a couple of times over — whichever works best for you.',
          'Great, looking forward to it.',
        ],
      },
      {
        subject: 'Re: the podcast episode',
        body: 'Hi,\n\nI listened to the episode you were on last week — really solid insights on building a repeatable outbound motion. The bit about ICP definition was especially timely for us.\n\nDo you have a newsletter or resource list I could follow?\n\nBest',
        arc: [
          'Thanks so much — that was a fun one to record! I do have a newsletter, I\'ll send you the link. Also happy to chat more about the ICP stuff if it\'s relevant to what you\'re working through.',
          'Just subscribed, thanks for sending that over.',
          'Glad it was useful — talk soon.',
        ],
      },
      {
        subject: 'Feedback request — would love your thoughts',
        body: 'Hello,\n\nI\'m putting together a short guide on outbound best practices and wanted to gather input from a few practitioners I respect.\n\nWould you be willing to answer 2-3 quick questions? It\'ll take under 5 minutes.\n\nThank you',
        arc: [
          'Happy to help! Send over the questions and I\'ll get back to you this week. Always glad to contribute to useful resources in the community.',
          'Just sent my answers over — hope they\'re useful.',
          'Really appreciate you taking the time on this.',
        ],
      },
      {
        subject: 'Just wanted to say — great work',
        body: 'Hi,\n\nI don\'t say this enough, but your content has genuinely helped me think differently about pipeline. The frameworks you share are practical and not just theoretical.\n\nKeep it up — it makes a difference.\n\nBest regards',
        arc: [
          'That genuinely made my day — thank you. It\'s great to hear the content is actually useful and not just adding to the noise. Let me know if there\'s ever a topic you\'d find helpful.',
          'Actually, a piece on early-stage pipeline reviews would be really useful if you ever get to it.',
          'Noted — adding that to the list. Thanks again for the kind words.',
        ],
      },
    ];

    // Lightweight greeting/signoff variant pools applied to reply-chain
    // messages (the original opening email already has its own baked-in
    // greeting/signoff per pair above) — adds send-to-send variation on top
    // of the arc content itself so no two threads read identically.
    const REPLY_GREETINGS = ['', 'Hi,\n\n', 'Hey,\n\n', ''];
    const REPLY_SIGNOFFS = ['', '\n\nBest', '\n\nThanks', '\n\nCheers', ''];

    function formatArcMessage(text: string): string {
      const greeting = REPLY_GREETINGS[Math.floor(Math.random() * REPLY_GREETINGS.length)];
      const signoff = REPLY_SIGNOFFS[Math.floor(Math.random() * REPLY_SIGNOFFS.length)];
      return `${greeting}${text}${signoff}`;
    }

    // Reply pool — fallback for the rare case a pairIndex isn't available
    // (e.g. a legacy already-queued job from before this change deployed)
    const WARMUP_REPLIES = WARMUP_PAIRS.map(p => p.arc[0]);

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

    // Recipient-side stats for Trust Score / abuse detection (lib/warmup-trust.ts) —
    // "how good a network CITIZEN is this account," not its own send-side health.
    // pingsReceived/opensAsRecipient/unreachable all look at this account as a
    // TARGET other accounts pinged, not as a sender.
    async function fetchRecipientStats(accountId: string, accountEmail: string, sinceMs: number) {
      const sinceIso = new Date(sinceMs).toISOString();
      const [pingsRes, unreachableRes, engagedRes] = await Promise.all([
        supabase.from('warmup_emails').select('id', { count: 'exact', head: true }).eq('to_account_id', accountId).gte('sent_at', sinceIso),
        supabase.from('email_account_events').select('id', { count: 'exact', head: true }).eq('account_id', accountId).eq('event_type', 'recipient_unreachable').gte('created_at', sinceIso),
        // 'open'/'reply' events are credited to the SENDER's account_id with
        // meta.via holding the recipient's email — the only way to measure
        // "did people who pinged THIS account see engagement back" is by
        // matching on that email field, not account_id.
        supabase.from('email_account_events').select('id', { count: 'exact', head: true }).in('event_type', ['open', 'reply']).eq('meta->>via', accountEmail).gte('created_at', sinceIso),
      ]);
      return {
        pingsReceived7d: pingsRes.count ?? 0,
        unreachableCount7d: unreachableRes.count ?? 0,
        opensAsRecipient7d: engagedRes.count ?? 0,
      };
    }

    // Trust Score + Automatic Abuse Detection + Reputation Protection
    // (lib/warmup-trust.ts). Returns the fields to merge into the caller's
    // own safeUpdateAccount() call — no separate DB write here, avoids
    // double-writing the same row every cycle.
    async function computeTrustFields(account: any, healthScore: number, isBlacklisted: boolean, computedDailyCap: number): Promise<Record<string, unknown>> {
      const { computeTrustScore, detectAbuse, shouldIsolateFromNetwork, canRejoinNetwork } = await import('./lib/warmup-trust');
      const recipientStats = await fetchRecipientStats(account.id, account.email, Date.now() - 7 * 86400_000);
      const accountAgeDays = account.created_at ? (Date.now() - new Date(account.created_at).getTime()) / 86400_000 : 0;

      const abuse = detectAbuse({
        pingsReceived7d: recipientStats.pingsReceived7d,
        unreachableCount7d: recipientStats.unreachableCount7d,
        opensAsRecipient7d: recipientStats.opensAsRecipient7d,
        sentToday: account.sent_today ?? 0,
        computedDailyCap,
      });
      let abuseFlagCount = account.abuse_flag_count ?? 0;
      if (abuse.flagged) {
        abuseFlagCount += 1;
        for (const reason of abuse.reasons) await logAccountEvent(account.id, 'abuse_flag', { reason });
      }

      const trustScore = computeTrustScore({
        accountAgeDays, healthScore,
        pingsReceived7d: recipientStats.pingsReceived7d,
        opensAsRecipient7d: recipientStats.opensAsRecipient7d,
        unreachableCount7d: recipientStats.unreachableCount7d,
        abuseFlagCount,
        isBlacklisted,
      });

      const fields: Record<string, unknown> = { trust_score: trustScore, abuse_flag_count: abuseFlagCount };

      if (account.network_isolated) {
        if (canRejoinNetwork({ trustScore, healthScore, isBlacklisted, isolatedAt: account.network_isolated_at ?? null })) {
          fields.network_isolated = false;
          fields.network_isolation_reason = null;
          fields.network_isolated_at = null;
          fields.abuse_flag_count = 0; // clean slate on recovery — an old count shouldn't immediately re-trigger isolation
          await supabase.from('notifications').insert({
            user_id: account.user_id,
            message: `${account.email} rejoined the shared warmup network — trust and health signals recovered.`,
            type: 'info',
          });
        }
      } else {
        const isolation = shouldIsolateFromNetwork({ trustScore, healthScore, isBlacklisted, abuseFlagCount });
        if (isolation.isolate) {
          fields.network_isolated = true;
          fields.network_isolation_reason = isolation.reason;
          fields.network_isolated_at = new Date().toISOString();
          await supabase.from('notifications').insert({
            user_id: account.user_id,
            message: `${account.email} isolated from the shared warmup network: ${isolation.reason}`,
            type: 'warning',
          });
        }
      }

      return fields;
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
      const { fromAccountId, toAccountId, subject, chainDepth = 0, pairIndex } = job.data;
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
      // First recipient-side signal (everything else in this worker is
      // credited to the SENDER) — feeds Trust Score / abuse detection: does
      // pairing with this account as a recipient actually work, or is its
      // mailbox unreachable/broken? Only meaningful if we never managed to
      // engage at all this cycle (checked after the try/catch below).
      let unreachable = false;

      try {
        if (toAcc.type === 'gmail-oauth') {
          let token: string | null = null;
          try { token = await getAccessToken({ id: toAcc.id, type: toAcc.type, email: toAcc.email, smtp_pass: toAcc.smtp_pass }); }
          catch { unreachable = true; }

          if (token) {
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
          }
        } else {
          const imapHost = toAcc.imap_host || (toAcc.type === 'gmail-app' ? 'imap.gmail.com' : null);
          if (!imapHost) unreachable = true;
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
              unreachable = true;
              console.error(`[warmup-engage] IMAP ${toAcc.email}: ${e.message}`);
              try { await client.logout(); } catch { /* already closed */ }
            }
          }
        }
      } catch (e: any) {
        unreachable = true;
        console.error(`[warmup-engage] ${toAcc.email}: ${e.message}`);
      }

      // Recipient-side signal, credited to toAccountId — feeds Trust Score /
      // abuse detection (see lib/warmup-trust.ts). Only logged if we truly
      // never managed to engage at all this cycle, so a partial failure
      // after a successful check-in doesn't get flagged as unreachable.
      if (unreachable && !engaged) {
        await logAccountEvent(toAccountId, 'recipient_unreachable', { via: fromAcc.email });
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
        // Arc-aware: chainDepth (0-3) indexes directly into the ORIGINAL
        // pair's arc, so a thread reads as one coherent conversation
        // (question → reply → follow-up → closing) instead of a random
        // unrelated line each turn. Falls back to a random pick only if
        // pairIndex is missing (a legacy already-queued job from before
        // this shipped) or the depth exceeds the authored arc length.
        const arc = typeof pairIndex === 'number' ? WARMUP_PAIRS[pairIndex]?.arc : undefined;
        const arcText = arc?.[Math.min(chainDepth, arc.length - 1)];
        const replyText = formatArcMessage(arcText ?? WARMUP_REPLIES[Math.floor(Math.random() * WARMUP_REPLIES.length)]);
        try {
          await sendEmail(
            { id: toAcc.id, type: toAcc.type, email: toAcc.email, smtp_host: toAcc.smtp_host, smtp_port: toAcc.smtp_port, smtp_user: toAcc.smtp_user, smtp_pass: toAcc.smtp_pass },
            { from: toAcc.email, to: replyTarget.toEmail, subject: `Re: ${replyTarget.subject}`, text: `${replyText}\n--warmup-ping--`, html: `<p>${replyText.replace(/\n/g, '<br>')}</p><span style="display:none;font-size:0">--warmup-ping--</span>` }
          );
          await logAccountEvent(fromAccountId, 'reply', { via: toAcc.email });
          await supabase.from('email_accounts').update({ reply_count: (fromAcc.reply_count ?? 0) + 1 }).eq('id', fromAccountId);

          // Multi-step thread: reverse direction, 2-5 messages total per conversation
          if (chainDepth < 4) {
            await engageQueue.add('engage', {
              fromAccountId: toAccountId, toAccountId: fromAccountId,
              subject: replyTarget.subject, chainDepth: chainDepth + 1, pairIndex,
            }, { delay: pickEngageDelayMs() });
          }
        } catch (e: any) {
          console.error(`[warmup-engage] reply send failed ${toAcc.email} → ${replyTarget.toEmail}: ${e.message}`);
        }
      }
    }, { connection, concurrency: 3 });

    console.log('✅ Warmup engagement worker started (delayed reads/replies/star/archive)');

    // ── Shared warmup helpers ───────────────────────────────────────────────
    // Used by both the main 6h cycle worker below AND the decoupled
    // 'warmup-send' follow-up worker. Splitting same-day sends across
    // independent queued jobs (instead of awaiting long in-process pacing
    // delays inside one held-open job) is what makes this scale to
    // hundreds/thousands of mailboxes — a real production bug traced to
    // exactly the opposite design: a single BullMQ job stayed "active" for
    // 10+ hours for any account with a high daily send volume, blocking
    // every other account's cycle behind it. Each helper here re-reads
    // whatever it needs fresh rather than trusting anything computed
    // earlier in the day, since a decoupled per-send job can run hours
    // after the cycle that scheduled it.
    const WU_BASE_COLS = 'id, user_id, email, type, smtp_host, smtp_port, smtp_user, smtp_pass, imap_host, imap_port, warmup_day, warmup_target, health_score, sent_today, is_pool_account, warmup_pool_mode, warmup_last_run_date, status, warmup_enabled';
    const WU_PHASE1_COLS = 'spf_status, dkim_status, dmarc_status, domain_checked_at, warmup_paused, warmup_pause_reason, warmup_paused_at, consecutive_stable_days, bounce_count, spam_count, reply_count, open_count, auth_error_count';
    const WU_PHASE23_COLS = 'domain, join_shared_network, blacklist_status, blacklist_details, blacklist_checked_at, mx_status';
    const WU_TRUST_COLS = 'trust_score, network_isolated, network_isolation_reason, network_isolated_at, abuse_flag_count';

    async function fetchWarmupAccountOne(accountId: string): Promise<any | null> {
      const tier3 = await supabase.from('email_accounts').select(`${WU_BASE_COLS}, ${WU_PHASE1_COLS}, ${WU_PHASE23_COLS}, ${WU_TRUST_COLS}`).eq('id', accountId).maybeSingle();
      if (!tier3.error) return tier3.data;
      const tier2 = await supabase.from('email_accounts').select(`${WU_BASE_COLS}, ${WU_PHASE1_COLS}, ${WU_PHASE23_COLS}`).eq('id', accountId).maybeSingle();
      if (!tier2.error) return tier2.data;
      const tier1 = await supabase.from('email_accounts').select(`${WU_BASE_COLS}, ${WU_PHASE1_COLS}`).eq('id', accountId).maybeSingle();
      if (!tier1.error) return tier1.data;
      const tier0 = await supabase.from('email_accounts').select(WU_BASE_COLS).eq('id', accountId).maybeSingle();
      return tier0.data;
    }

    async function toPairingCandidate(a: any): Promise<{ id: string; domain: string | null; provider: import('./lib/warmup-health').Provider; source: 'admin' | 'shared'; trustScore?: number }> {
      const { detectProvider } = await import('./lib/warmup-health');
      return {
        id: a.id,
        domain: a.domain || (a.email?.split('@')[1]?.toLowerCase() ?? null),
        provider: detectProvider(a),
        source: a.is_pool_account ? 'admin' : 'shared',
        trustScore: typeof a.trust_score === 'number' ? a.trust_score : undefined,
      };
    }

    // Admin-pool / shared-network candidate context. Pass an already-fetched
    // account list to avoid a duplicate query (the main cycle already has
    // one); omit it to fetch fresh (used by the decoupled send worker).
    async function loadWarmupPoolContext(preFetched?: any[]) {
      const { computeNetworkBalance } = await import('./lib/warmup-pairing');
      let accounts = preFetched;
      if (!accounts) {
        const { data } = await supabase.from('email_accounts')
          .select(`${WU_BASE_COLS}, ${WU_PHASE1_COLS}, ${WU_PHASE23_COLS}, ${WU_TRUST_COLS}`)
          .eq('warmup_enabled', true).neq('status', 'error');
        accounts = data ?? [];
      }
      const isEligiblePairingTarget = (a: any) => !a.warmup_paused && !a.network_isolated && a.blacklist_status !== 'listed';
      const adminPoolAccounts = accounts.filter(a => a.is_pool_account && isEligiblePairingTarget(a));
      const sharedNetworkAccounts = accounts.filter(a => !a.is_pool_account && a.join_shared_network !== false && isEligiblePairingTarget(a));
      const dynamicBalance = computeNetworkBalance(sharedNetworkAccounts.length, adminPoolAccounts.length);
      const accountsById = new Map(accounts.map(a => [a.id, a]));
      return { accounts, adminPoolAccounts, sharedNetworkAccounts, dynamicBalance, accountsById };
    }

    // Which pool ONE account draws partners from — honors admin overrides
    // (warmup_pool_mode) and the account's own shared-network opt-in, same
    // precedence rules everywhere this is evaluated.
    function poolForAccount(account: any, ctx: { adminPoolAccounts: any[]; sharedNetworkAccounts: any[]; dynamicBalance: { sharedShare: number; adminShare: number } }) {
      // Excludes by email, not just account id — pre-existing duplicate rows
      // (same real mailbox connected under >1 user_id, from before "one
      // mailbox = one identity" was enforced; never retroactively cleaned
      // up) would otherwise let a mailbox get paired with a second DB row
      // pointing at its own inbox. A real case of this was caught live:
      // uaeshopify123@gmail.com sending a warmup ping to itself.
      const notSelf = (a: any) => a.id !== account.id && a.email?.toLowerCase() !== account.email?.toLowerCase();
      let pool: any[];
      let poolBalance = ctx.dynamicBalance;
      if (account.is_pool_account) {
        pool = [...ctx.adminPoolAccounts, ...ctx.sharedNetworkAccounts].filter(notSelf);
      } else {
        const mode = account.warmup_pool_mode || 'admin_pool';
        if (mode === 'user_to_user') {
          pool = ctx.sharedNetworkAccounts.filter(notSelf);
          poolBalance = { sharedShare: 1, adminShare: 0 };
        } else if (mode === 'both') {
          pool = [...ctx.adminPoolAccounts, ...ctx.sharedNetworkAccounts].filter(notSelf);
        } else if (account.join_shared_network === false) {
          pool = ctx.adminPoolAccounts.filter(notSelf);
          poolBalance = { sharedShare: 0, adminShare: 1 };
        } else {
          pool = [...ctx.adminPoolAccounts, ...ctx.sharedNetworkAccounts].filter(notSelf);
        }
      }
      return { pool, poolBalance };
    }

    async function fetchPairingHistoryForAccount(fromAccountId: string) {
      const { data } = await supabase.from('warmup_pairings').select('to_account_id, last_sent_at, send_count').eq('from_account_id', fromAccountId);
      const map = new Map<string, { lastSentAt: string | null; sendCount: number }>();
      for (const row of data ?? []) map.set(row.to_account_id, { lastSentAt: row.last_sent_at, sendCount: row.send_count ?? 0 });
      return map;
    }

    // Actual send + bookkeeping for ONE warmup ping. Never awaits anything
    // but the send itself and a handful of fast DB writes — this can never
    // be the thing holding a job open for hours (unlike the old inline
    // "sleep, then send, N times" loop it replaces).
    async function performWarmupSend(account: any, toAccount: any): Promise<{ ok: boolean; authError?: boolean; message?: string }> {
      const { sendEmail } = await import('./lib/mailer');
      const pairIndex = Math.floor(Math.random() * WARMUP_PAIRS.length);
      const pair = WARMUP_PAIRS[pairIndex];
      const { subject, body } = pair;
      try {
        await sendEmail(
          { id: account.id, type: account.type, email: account.email, smtp_host: account.smtp_host, smtp_port: account.smtp_port, smtp_user: account.smtp_user, smtp_pass: account.smtp_pass },
          { from: account.email, to: toAccount.email, subject, text: `${body}\n--warmup-ping--`, html: `<p>${body.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p><span style="display:none;font-size:0">--warmup-ping--</span>` }
        );
        await supabase.from('warmup_emails').insert({ from_account_id: account.id, to_account_id: toAccount.id, subject, body, sent_at: new Date().toISOString() });
        const { data: priorHist } = await supabase.from('warmup_pairings').select('send_count').eq('from_account_id', account.id).eq('to_account_id', toAccount.id).maybeSingle();
        const newSendCount = (priorHist?.send_count ?? 0) + 1;
        await supabase.from('warmup_pairings').upsert(
          { from_account_id: account.id, to_account_id: toAccount.id, last_sent_at: new Date().toISOString(), send_count: newSendCount },
          { onConflict: 'from_account_id,to_account_id' },
        );
        await engageQueue.add('engage', { fromAccountId: account.id, toAccountId: toAccount.id, subject, chainDepth: 0, pairIndex }, { delay: pickEngageDelayMs() });
        await logAccountEvent(account.id, 'sent', {});
        return { ok: true };
      } catch (e: any) {
        console.error(`[warmup-send] ${account.email} → ${toAccount.email}: ${e.message}`);
        if (e.responseCode === 535 || e.code === 'EAUTH') {
          await logAccountEvent(account.id, 'auth_error', { message: e.message });
          return { ok: false, authError: true, message: e.message };
        }
        return { ok: false, message: e.message };
      }
    }

    // End-of-day rollup for one account — health score, day advance, pause/
    // recovery, trust fields, history row, completion check. Re-reads the
    // account and its last-7-days events fresh (may run hours after the
    // cycle started, on a completely separate 'warmup-send' job).
    async function finalizeWarmupDay(accountId: string, day: number) {
      const { computeHealthScore, shouldPause, isWarmupComplete } = await import('./lib/warmup-health');
      const { AUTHORITATIVE_PAUSE_ZONE } = await import('./lib/blacklist-check');
      const account = await fetchWarmupAccountOne(accountId);
      if (!account) return;
      const events7d = await fetchEventCounts(accountId, Date.now() - 7 * 86400_000);
      const isBlacklisted = account.blacklist_status === 'listed';
      const isBlacklistedAuthoritative = isBlacklisted && account.blacklist_details?.[AUTHORITATIVE_PAUSE_ZONE] === true;
      const hasAuthErrorNow = account.status === 'error';
      const sent = account.sent_today ?? 0;

      const health = computeHealthScore({
        events: events7d, domainAuth: { spf: account.spf_status, dkim: account.dkim_status, dmarc: account.dmarc_status },
        consecutiveStableDays: account.consecutive_stable_days ?? 0, warmupDay: day,
        hasAuthErrorNow, isBlacklisted,
      });

      const pauseCheck = shouldPause(events7d, hasAuthErrorNow, isBlacklistedAuthoritative);
      const willPause = pauseCheck.pause;
      if (willPause && !account.warmup_paused) {
        const { data: links } = await supabase
          .from('campaign_accounts')
          .select('campaign:campaigns(id, name, status, campaign_accounts(account:email_accounts(*)))')
          .eq('account_id', accountId);
        const activeCampaigns = (links ?? [])
          .map((l: any) => l.campaign)
          .filter((c: any) => c && c.status === 'active');

        let routingMsg = '';
        if (activeCampaigns.length) {
          const { computeAccountRemaining } = await import('./lib/campaign-scheduling');
          const perCampaign: string[] = [];
          for (const camp of activeCampaigns as any[]) {
            const siblings = (camp.campaign_accounts ?? []).map((ca: any) => ca.account).filter((a: any) => a && a.id !== accountId);
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

      const target = account.warmup_target ?? 30;
      const today = new Date().toISOString().slice(0, 10);
      const recentHistory = await supabase
        .from('warmup_history').select('health_score').eq('email', account.email)
        .order('date', { ascending: false }).limit(5);
      const recentScores = [health.score, ...((recentHistory.data || []).map((r: any) => r.health_score))];
      const complete = isWarmupComplete(recentScores.reverse(), day, Math.min(14, target));

      const trustFields = await computeTrustFields({ ...account, sent_today: sent }, health.score, isBlacklisted, sent);

      await safeUpdateAccount(accountId, {
        warmup_day: day,
        health_score: health.score,
        warmup_last_run_date: today,
        ...trustFields,
        consecutive_stable_days: newConsecutiveStable,
        warmup_paused: willPause,
        warmup_pause_reason: willPause ? pauseCheck.reason : null,
        warmup_paused_at: willPause && !account.warmup_paused ? new Date().toISOString() : (willPause ? account.warmup_paused_at : null),
        last_health_calc_at: new Date().toISOString(),
        ...(complete ? { warmup_enabled: false, status: 'active' } : {}),
      });
      if (complete) {
        await supabase.from('notifications').insert({
          user_id: account.user_id,
          message: `${account.email} warmup complete! Health has stayed 90+ for several days straight — safe to lean on for campaigns. Re-enable warmup any time to keep the reputation warm.`,
          type: 'info',
        });
      }

      await safeUpsertHistory([{
        account_id: accountId,
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

      console.log(`[warmup-send] ${account.email} day=${day}${complete ? ' (COMPLETE)' : ''}${willPause ? ' (PAUSED)' : ''} sent=${sent} score=${health.score} inbox=${health.factors.inboxRate ?? '—'}%`);
    }

    // Same-day sends after the first are each their own independently
    // scheduled job (instead of an in-process sleep inside one held-open
    // job) — this is the actual scale fix. A cycle job now only ever does
    // ONE send per account before returning, regardless of that account's
    // total daily volume, so it finishes in seconds whether the fleet is
    // 8 mailboxes or 5,000.
    const warmupSendQueue = new Queue('warmup-send', { connection });

    new SyncWorker('warmup-send', async (job: any) => {
      const { accountId, day, isFinal } = job.data as { accountId: string; day: number; isFinal: boolean };
      const account = await fetchWarmupAccountOne(accountId);
      // Re-check current state — pause/disable/error may have happened since
      // this send was scheduled, possibly hours ago.
      if (!account || account.warmup_paused || account.warmup_enabled === false || account.status === 'error') {
        if (isFinal && account) await finalizeWarmupDay(accountId, day);
        return;
      }

      const { pickWarmupPartner } = await import('./lib/warmup-pairing');
      const ctx = await loadWarmupPoolContext();
      const { pool, poolBalance } = poolForAccount(account, ctx);
      if (pool.length > 0) {
        const history = await fetchPairingHistoryForAccount(accountId);
        const poolCandidates = await Promise.all(pool.map(toPairingCandidate));
        const fromCandidate = await toPairingCandidate(account);
        const picked = pickWarmupPartner(fromCandidate, poolCandidates, history, poolBalance) ?? poolCandidates[0];
        const toAccount = ctx.accountsById.get(picked.id);
        if (toAccount) {
          const result = await performWarmupSend(account, toAccount);
          if (result.ok) {
            await supabase.from('email_accounts').update({ sent_today: (account.sent_today ?? 0) + 1 }).eq('id', accountId);
          } else if (result.authError) {
            await supabase.from('email_accounts').update({ status: 'error', warmup_enabled: false }).eq('id', accountId);
          }
        }
      }
      if (isFinal) await finalizeWarmupDay(accountId, day);
    }, { connection, concurrency: 10 });

    console.log('✅ Warmup send-pacing worker started (decoupled same-day sends)');

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

      // Three-tier cascading fallback, oldest-migration-safe first. Each tier
      // adds columns from a LATER migration — if a later one hasn't been run
      // yet, PostgREST errors on the WHOLE select (not just the missing
      // column), so bundling a brand-new column into an already-working
      // select would silently regress everything that select used to
      // provide. Real bug once already: trust_score (Phase 2/3 follow-up,
      // 20260714_trust_and_isolation.sql) was briefly bundled into the same
      // select as domain/blacklist_status/mx_status (20260713 migrations,
      // already run in production) — until trust_score's own migration also
      // ran, that would have taken SPF/DKIM/DMARC/blacklist/MX display back
      // down with it. Keep each migration's columns in their own tier.
      let allWarmupAccounts: any[] | null = null;
      const PHASE1_COLS = 'spf_status, dkim_status, dmarc_status, domain_checked_at, warmup_paused, warmup_pause_reason, warmup_paused_at, consecutive_stable_days, bounce_count, spam_count, reply_count, open_count, auth_error_count';
      const PHASE23_COLS = 'domain, join_shared_network, blacklist_status, blacklist_details, blacklist_checked_at, mx_status';
      const TRUST_COLS = 'trust_score, network_isolated, network_isolation_reason, network_isolated_at, abuse_flag_count';
      const BASE_COLS = 'id, user_id, email, type, smtp_host, smtp_port, smtp_user, smtp_pass, imap_host, imap_port, warmup_day, warmup_target, health_score, sent_today, is_pool_account, warmup_pool_mode, warmup_last_run_date';

      const tier3 = await supabase.from('email_accounts')
        .select(`${BASE_COLS}, ${PHASE1_COLS}, ${PHASE23_COLS}, ${TRUST_COLS}`)
        .eq('warmup_enabled', true).neq('status', 'error');

      if (!tier3.error) {
        allWarmupAccounts = tier3.data;
      } else {
        console.warn(`[warmup] Trust/isolation columns unavailable (${tier3.error.message}) — has supabase/migrations/20260714_trust_and_isolation.sql been run? Falling back one tier for this cycle.`);
        const tier2 = await supabase.from('email_accounts')
          .select(`${BASE_COLS}, ${PHASE1_COLS}, ${PHASE23_COLS}`)
          .eq('warmup_enabled', true).neq('status', 'error');
        if (!tier2.error) {
          allWarmupAccounts = tier2.data;
        } else {
          console.warn(`[warmup] Phase 2/3 columns unavailable (${tier2.error.message}) — has supabase/migrations/20260713_shared_network_and_pairing.sql been run? Falling back one more tier for this cycle.`);
          const tier1 = await supabase.from('email_accounts')
            .select(`${BASE_COLS}, ${PHASE1_COLS}`)
            .eq('warmup_enabled', true).neq('status', 'error');
          if (!tier1.error) {
            allWarmupAccounts = tier1.data;
          } else {
            console.warn(`[warmup] Extended columns unavailable (${tier1.error.message}) — has supabase/migrations/20260705_warmup_phase1.sql been run? Falling back to legacy column set for this cycle.`);
            const tier0 = await supabase.from('email_accounts')
              .select(BASE_COLS)
              .eq('warmup_enabled', true).neq('status', 'error');
            allWarmupAccounts = tier0.data;
          }
        }
      }

      if (!allWarmupAccounts || allWarmupAccounts.length < 2) {
        console.log(`[warmup] Skipping: only ${allWarmupAccounts?.length ?? 0} warmup-enabled account(s) in system — need ≥2 to cross-send. Add pool accounts at /dashboard/admin/warmup.`);
        return;
      }

      console.log(`[warmup] Pool: ${allWarmupAccounts.length} accounts (pool: ${allWarmupAccounts.filter(a => a.is_pool_account).length}, users: ${allWarmupAccounts.filter(a => !a.is_pool_account).length})`);

      const { detectProvider, computeHealthScore, dailySendCap, canRecover, isWeekendUTC, WEEKEND_MULTIPLIER } = await import('./lib/warmup-health');
      const { checkDomainAuth } = await import('./lib/domain-health');
      const { pickWarmupPartner } = await import('./lib/warmup-pairing');
      const { checkBlacklists, AUTHORITATIVE_PAUSE_ZONE } = await import('./lib/blacklist-check');

      // Track pairs sent this cycle — prevents A→B and B→A in the same run
      const sentPairs = new Set<string>();
      const today = new Date().toISOString().slice(0, 10);

      // Dual-source network: Admin Pool (is_pool_account=true, always available)
      // + opt-in Shared User Network (join_shared_network!==false, non-pool).
      // Target share of pairings drawn from each scales with how large the
      // shared network actually is. Reputation Protection: paused,
      // network-isolated, or blacklisted accounts are excluded as pairing
      // TARGETS inside loadWarmupPoolContext — using each account's status
      // as of the START of this cycle, same convention as before.
      const poolCtx = await loadWarmupPoolContext(allWarmupAccounts);
      const { adminPoolAccounts, sharedNetworkAccounts, accountsById } = poolCtx;

      // Fetch fairness/recency history once per cycle — capped at
      // accounts*(accounts-1) rows regardless of how much send history
      // accumulates, so this stays a cheap single query even at 500+ accounts.
      const allAccountIds = allWarmupAccounts.map(a => a.id);
      const { data: pairingRows } = await supabase
        .from('warmup_pairings')
        .select('from_account_id, to_account_id, last_sent_at, send_count')
        .in('from_account_id', allAccountIds);
      const pairingHistory = new Map<string, Map<string, { lastSentAt: string | null; sendCount: number }>>();
      for (const row of pairingRows ?? []) {
        if (!pairingHistory.has(row.from_account_id)) pairingHistory.set(row.from_account_id, new Map());
        pairingHistory.get(row.from_account_id)!.set(row.to_account_id, { lastSentAt: row.last_sent_at, sendCount: row.send_count ?? 0 });
      }
      function historyFor(fromId: string) {
        if (!pairingHistory.has(fromId)) pairingHistory.set(fromId, new Map());
        return pairingHistory.get(fromId)!;
      }

      // ── PHASE 1: SEND warmup emails (parallel batches of 10) ─────────────
      // Each account's result (email row, day/health update, history row) is written
      // to the DB immediately after that account finishes — not batched up and flushed
      // once at the end of the whole cycle. A worker restart/redeploy mid-cycle (which
      // happens routinely on deploy) would otherwise lose already-sent accounts' results
      // even though the emails had actually gone out.
      const BATCH_SIZE = 25;
      for (let b = 0; b < allWarmupAccounts.length; b += BATCH_SIZE) {
        const batch = allWarmupAccounts.slice(b, b + BATCH_SIZE);
        await Promise.all(batch.map(async account => {
          // Temporary step-by-step tracing while chasing a real production
          // hang (jobs stuck permanently "active" in BullMQ for specific
          // accounts, cause not yet fully isolated). Cheap no-op cost;
          // remove once the hang is confirmed fixed and stays fixed.
          const _t0 = Date.now();
          const trace = (step: string) => console.log(`[warmup-trace] ${account.email} ${step} +${Date.now() - _t0}ms`);
          trace('start');
          try {
            // Random start offset per account (0–8 min) so all accounts don't fire simultaneously
            // Skipped for manual "Run Now" so admin sees results immediately
            if (!isManual) {
              await new Promise(r => setTimeout(r, Math.random() * 8 * 60 * 1000));
            }
            trace('after-start-offset');

            const todayStr = new Date().toISOString().slice(0, 10);
            // Skip accounts that already ran today — except on manual trigger (allow re-run)
            const alreadyRanToday = !isManual && account.warmup_last_run_date === todayStr;

            // ── Domain auth + blacklist check — at most once every 7 days per
            // account. Blacklist piggybacks on the exact same cadence rather
            // than its own schedule — public DNSBL zones are meant for
            // real-time filtering lookups, not scheduled bulk monitoring, so
            // reusing this gate keeps automated querying within free/fair use.
            const needsAuthCheck = !account.domain_checked_at
              || (Date.now() - new Date(account.domain_checked_at).getTime()) > 7 * 86400_000;
            // Blacklist/MX checking piggybacks on the SAME 7-day cadence as
            // SPF/DKIM/DMARC (see above) — but that cadence was already
            // running for weeks on existing accounts before this feature
            // shipped, so domain_checked_at could already be recent for them,
            // silently deferring their very FIRST blacklist/MX check up to 7
            // days out. Force it once immediately (blacklist_checked_at is
            // only ever null before a check has genuinely run at all) so
            // existing accounts don't wait a week for a brand-new capability.
            const needsBlacklistCheck = needsAuthCheck || !account.blacklist_checked_at;
            let spfStatus = account.spf_status || 'unknown';
            let dkimStatus = account.dkim_status || 'unknown';
            let dmarcStatus = account.dmarc_status || 'unknown';
            let mxStatus = account.mx_status || 'unknown';
            let blacklistStatus = account.blacklist_status || 'unknown';
            let blacklistDetails = account.blacklist_details || {};
            if (needsAuthCheck) {
              try {
                const auth = await checkDomainAuth(account.email);
                spfStatus = auth.spf; dkimStatus = auth.dkim; dmarcStatus = auth.dmarc; mxStatus = auth.mx;
              } catch { /* keep previous status on lookup failure */ }
            }
            trace('after-domain-auth');
            if (needsBlacklistCheck) {
              try {
                const bl = await checkBlacklists({ email: account.email, accountType: account.type, smtpHost: account.smtp_host });
                blacklistStatus = bl.status; blacklistDetails = bl.details;
              } catch { /* keep previous status on lookup failure */ }
            }
            trace('after-blacklist');
            const domainAuthAllPass = spfStatus === 'pass' && dkimStatus === 'pass' && dmarcStatus === 'pass';
            const isBlacklisted = blacklistStatus === 'listed';
            const isBlacklistedAuthoritative = isBlacklisted && blacklistDetails?.[AUTHORITATIVE_PAUSE_ZONE] === true;

            // ── Pause / recovery check ──
            const events7d = await fetchEventCounts(account.id, Date.now() - 7 * 86400_000);
            trace('after-events7d');
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

            trace(`pause-check paused=${paused} alreadyRanToday=${alreadyRanToday}`);
            if (paused || alreadyRanToday) {
              // Still compute health from existing signals so the dashboard stays live even
              // while paused/idle, but don't advance day or send anything.
              const health = computeHealthScore({
                events: events7d, domainAuth: { spf: spfStatus, dkim: dkimStatus, dmarc: dmarcStatus },
                consecutiveStableDays: account.consecutive_stable_days ?? 0, warmupDay: account.warmup_day ?? 0,
                hasAuthErrorNow: false, isBlacklisted,
              });
              trace('early-return: before trustFields');
              const trustFields = await computeTrustFields(account, health.score, isBlacklisted, 0);
              trace('early-return: after trustFields, before write');
              await safeUpdateAccount(account.id, {
                health_score: health.score, spf_status: spfStatus, dkim_status: dkimStatus, dmarc_status: dmarcStatus, mx_status: mxStatus,
                blacklist_status: blacklistStatus, blacklist_details: blacklistDetails,
                blacklist_checked_at: needsBlacklistCheck ? new Date().toISOString() : account.blacklist_checked_at,
                domain_checked_at: needsAuthCheck ? new Date().toISOString() : account.domain_checked_at,
                last_health_calc_at: new Date().toISOString(),
                ...trustFields,
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
              trace('early-return: done');
              return;
            }

            const day = Math.max(0, (account.warmup_day ?? 0) + 1 + dayAdjustment);
            const provider = detectProvider(account);
            const priorHealth = account.health_score ?? 50;
            const weekendFactor = isWeekendUTC() ? WEEKEND_MULTIPLIER : 1;
            const emailsToday = Math.max(isWeekendUTC() ? 0 : 1, Math.round(
              dailySendCap({ provider, warmupDay: day, health: priorHealth, domainAuthAllPass }) * weekendFactor
            ));

            // Domain/blacklist results are written NOW rather than only at the
            // very end of this account's processing — for a high-volume
            // account the rest of today's sends happen via decoupled jobs
            // that may finish hours from now, and the dashboard shouldn't
            // show stale auth/blacklist status until then.
            await supabase.from('email_accounts').update({
              spf_status: spfStatus, dkim_status: dkimStatus, dmarc_status: dmarcStatus, mx_status: mxStatus,
              blacklist_status: blacklistStatus, blacklist_details: blacklistDetails,
              blacklist_checked_at: needsBlacklistCheck ? new Date().toISOString() : account.blacklist_checked_at,
              domain_checked_at: needsAuthCheck ? new Date().toISOString() : account.domain_checked_at,
            }).eq('id', account.id);

            // Dual-source candidate pool + balance for THIS account — honors
            // admin overrides (warmup_pool_mode) and the account's own
            // shared-network opt-in.
            const { pool, poolBalance } = poolForAccount(account, poolCtx);
            trace(`pool-built size=${pool.length} emailsToday=${emailsToday}`);
            if (pool.length === 0 || emailsToday === 0) {
              if (pool.length === 0) console.warn(`[warmup] ${account.email}: no eligible pool (mode: ${account.warmup_pool_mode || 'admin_pool'}, join_shared_network: ${account.join_shared_network !== false}, total warmup accounts: ${allWarmupAccounts.length}) — add pool accounts or enable warmup on more accounts`);
              trace('empty-pool-return: done');
              return;
            }
            const poolCandidates = await Promise.all(pool.map(toPairingCandidate));

            // Only the FIRST send of the day happens synchronously here,
            // using the same-cycle sentPairs dedup (meaningful only across
            // accounts processed together in this same fast pass). Any
            // remaining sends for accounts with a higher daily cap are each
            // scheduled as an independent 'warmup-send' job instead of an
            // in-process sleep — this account's own processing time is now
            // bounded to "one send" regardless of whether emailsToday is 1
            // or 50, which is what keeps this whole cycle job fast (seconds,
            // not hours) at any fleet size.
            const eligibleCandidates = poolCandidates.filter(c => {
              const fwd = `${account.id}→${c.id}`;
              const rev = `${c.id}→${account.id}`;
              return !sentPairs.has(fwd) && !sentPairs.has(rev);
            });
            const fromCandidate = await toPairingCandidate(account);
            const picked = pickWarmupPartner(fromCandidate, eligibleCandidates, historyFor(account.id), poolBalance)
              ?? poolCandidates[0];
            const toAccount = picked ? accountsById.get(picked.id) : undefined;

            let authError = false;
            if (toAccount) {
              const pairKey = `${account.id}→${toAccount.id}`;
              sentPairs.add(pairKey);
              trace(`send[0] → ${toAccount.email} starting`);
              const result = await performWarmupSend(account, toAccount);
              trace(`send[0] ${result.ok ? 'done' : 'failed: ' + result.message}`);
              if (result.ok) {
                historyFor(account.id).set(toAccount.id, { lastSentAt: new Date().toISOString(), sendCount: (historyFor(account.id).get(toAccount.id)?.sendCount ?? 0) + 1 });
                await supabase.from('email_accounts').update({ sent_today: (account.sent_today ?? 0) + 1 }).eq('id', account.id);
              } else {
                sentPairs.delete(pairKey);
                if (result.authError) {
                  authError = true;
                  await supabase.from('email_accounts').update({ status: 'error', warmup_enabled: false }).eq('id', account.id);
                }
              }
            }

            if (authError || emailsToday <= 1) {
              trace('finalize: same job');
              await finalizeWarmupDay(account.id, day);
            } else {
              // Spread remaining sends across whatever's left of today's
              // business-hours window (07:00–21:00 UTC), same pacing feel as
              // before — but each one is its own delayed job, not an await
              // inside this one.
              const endOfWindowMs = new Date(new Date().setUTCHours(21, 0, 0, 0)).getTime();
              const remainingWindowMs = Math.max(15 * 60 * 1000, endOfWindowMs - Date.now());
              const baseMs = remainingWindowMs / emailsToday;
              let cumulativeDelay = 0;
              for (let i = 1; i < emailsToday; i++) {
                cumulativeDelay += baseMs * (0.5 + Math.random());
                await warmupSendQueue.add('send', { accountId: account.id, day, isFinal: i === emailsToday - 1 }, { delay: Math.round(cumulativeDelay) });
              }
              trace(`scheduled ${emailsToday - 1} follow-up sends`);
            }
            trace('done');
          } catch (e: any) {
            trace(`threw: ${e.message}`);
            console.error(`[warmup-send] ${account.email}: ${e.message}`);
          }
        }));
      }

      // ── PHASE 2: backstop spam sweep — catches anything a delayed engage job missed
      // (e.g. a worker restart). Primary engagement now happens via warmup-engage jobs.
      // Parallelized in the same bounded batches as Phase 1 — a fully
      // sequential per-account IMAP connect+search+move loop would itself
      // become a scale bottleneck at hundreds/thousands of mailboxes even
      // with each connection individually timeout-bounded.
      for (let b = 0; b < allWarmupAccounts.length; b += BATCH_SIZE) {
        const sweepBatch = allWarmupAccounts.slice(b, b + BATCH_SIZE);
        await Promise.all(sweepBatch.map(async (account) => {
        try {
          if (account.type !== 'gmail-oauth') {
            const imapHost = account.imap_host || (account.type === 'gmail-app' ? 'imap.gmail.com' : null);
            if (!imapHost) return;
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
        }));
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

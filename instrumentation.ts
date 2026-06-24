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

      // Credits check only on step 1 — follow-ups and warmup emails are free
      const { data: profileData } = await supabase
        .from('profiles')
        .select('credits_used, credits_total')
        .eq('id', campaign.user_id)
        .single();
      const creditsUsed = profileData?.credits_used ?? 0;
      const creditsTotal = profileData?.credits_total ?? 100;

      if (stepNumber === 1 && creditsUsed >= creditsTotal) {
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
      const isReplyThread = stepNumber > 0 && step.thread_mode === 'reply';

      // For reply-in-thread follow-ups: look up step 0's message_id for this lead
      let inReplyTo: string | undefined;
      if (isReplyThread) {
        const { data: firstSent } = await supabase
          .from('sent_emails')
          .select('message_id')
          .eq('campaign_id', campaign.id)
          .eq('lead_id', lead.id)
          .eq('step_number', 0)
          .not('message_id', 'is', null)
          .maybeSingle();
        if (firstSent?.message_id) inReplyTo = firstSent.message_id;
      }

      // Reply mode sends with no subject (thread subject comes from original email)
      const subject = isReplyThread && inReplyTo ? '' : replaceVars(step.subject || '', lead);
      const rawBody = replaceVars(step.body, lead);

      // Insert sent_email record FIRST to get ID for tracking pixel + unsubscribe link
      const { data: sentEmail } = await supabase.from('sent_emails').insert({
        user_id: campaign.user_id,
        campaign_id: campaign.id,
        lead_id: lead.id,
        account_id: account.id,
        step_number: stepNumber,
        subject,
        sent_at: new Date().toISOString(),
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
          ...(inReplyTo ? { inReplyTo, references: inReplyTo } : {}),
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

      // Deduct 1 credit only on step 1 (first email) — follow-ups are free
      if (stepNumber === 1) {
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
        // TEST MODE: 1 unit = 1 minute. Change to 24*60*60*1000 before launch.
        const DELAY_UNIT_MS = 60 * 1000;
        const rawDelayMs = (nextStepData.delay_days || 1) * DELAY_UNIT_MS;
        const targetFireMs = Date.now() + rawDelayMs;
        const adjustedFireMs = adjustToWindow(targetFireMs, campaign);
        const delayMs = Math.max(0, adjustedFireMs - Date.now());
        await emailQueue.add('send', { campaignLeadId, stepNumber: nextStep }, { delay: delayMs });
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
            try { token = await getAccessToken(account); } catch { continue; }

            const { data: sentEmails } = await supabase
              .from('sent_emails')
              .select('id, message_id, lead_id, campaign_id, subject')
              .eq('account_id', account.id)
              .not('message_id', 'is', null)
              .is('replied_at', null)
              .limit(30);

            for (const sent of (sentEmails || [])) {
              try {
                const thread = await gmailGet(
                  `/gmail/v1/users/me/threads/${sent.message_id}?format=metadata&metadataHeaders=From,Subject,Date`,
                  token,
                );
                if (!thread?.messages || thread.messages.length <= 1) continue;

                const reply = thread.messages.slice(1).find((m: any) => {
                  const from = hdr(m.payload?.headers, 'From').toLowerCase();
                  if (from.includes(account.email.toLowerCase())) return false;
                  return !SYSTEM_PATTERNS.some(p => from.includes(p));
                });
                if (!reply) continue;

                const fromHeader = hdr(reply.payload?.headers, 'From');
                const dateHeader = hdr(reply.payload?.headers, 'Date');
                const subjectHeader = hdr(reply.payload?.headers, 'Subject') || sent.subject;

                if (dateHeader) {
                  const sentTime = new Date(hdr(thread.messages[0].payload?.headers, 'Date')).getTime();
                  if (new Date(dateHeader).getTime() <= sentTime) continue;
                }

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
                    subject: subjectHeader, last_message: cleanSnip(reply.snippet || ''),
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
              } catch { /* skip single thread error */ }
            }

          } else if (account.imap_host || account.type === 'gmail-app') {
            // ── IMAP path (Gmail App Password, Titan, Zoho, Custom SMTP) ────
            const imapHost = account.imap_host || 'imap.gmail.com';
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

    const WARMUP_SUBJECTS = [
      'Quick follow-up', 'Checking in', 'Thoughts on this?',
      'Following up from our conversation', 'Hope this finds you well',
      'A question for you', 'Reaching out', 'Wanted to connect',
      'Re: our conversation', 'Just circling back',
    ];
    const WARMUP_BODIES = [
      'Hi,\n\nJust wanted to follow up and see if you had a chance to look at my previous message.\n\nBest regards',
      'Hello,\n\nHope you are having a great week. I wanted to touch base regarding our previous discussion.\n\nThank you',
      'Hi there,\n\nI hope this email finds you well. I wanted to check in and see how things are going.\n\nBest',
      'Hello,\n\nThanks for your time. I wanted to reach out and continue our conversation from last week.\n\nRegards',
      'Hi,\n\nI wanted to follow up on my earlier email. Please let me know if you have any questions.\n\nBest wishes',
      'Hey,\n\nJust checking in to see if everything is going well on your end. Let me know if there is anything I can help with.\n\nCheers',
    ];
    const WARMUP_REPLIES = [
      'Thanks, I\'ll take a look at this.',
      'Got it, thanks for reaching out!',
      'Appreciate the follow-up.',
      'Thanks for the message, will circle back soon.',
      'Noted, I\'ll get back to you shortly.',
      'Received, thank you!',
      'Thanks for checking in.',
      'I appreciate you following up.',
    ];

    function warmupDailyTarget(day: number, target: number): number {
      if (day <= 0) return 2;
      const ramp = Math.floor(target * (Math.min(day, 30) / 30));
      return Math.max(2, Math.min(ramp, target));
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
      // Reset sent_today at the start of each 6h cycle so the counter is per-cycle not cumulative
      await supabase.from('email_accounts').update({ sent_today: 0 })
        .eq('warmup_enabled', true).neq('status', 'error');

      const { data: allWarmupAccounts } = await supabase
        .from('email_accounts')
        .select('id, user_id, email, type, smtp_host, smtp_port, smtp_user, smtp_pass, imap_host, imap_port, warmup_day, warmup_target, health_score, sent_today, is_pool_account, warmup_pool_mode')
        .eq('warmup_enabled', true)
        .neq('status', 'error');

      if (!allWarmupAccounts || allWarmupAccounts.length < 2) return;

      console.log(`[warmup] Pool: ${allWarmupAccounts.length} accounts`);

      const { sendEmail, getAccessToken } = await import('./lib/mailer');

      // ── PHASE 1: SEND warmup emails ──────────────────────────────────────
      for (const account of allWarmupAccounts) {
        try {
          const day = (account.warmup_day ?? 0) + 1;
          const target = account.warmup_target ?? 40;
          const emailsToday = warmupDailyTarget(day, target);

          // Filter eligible peers based on pool mode
          // Admin pool accounts warm with everyone; user accounts filter by warmup_pool_mode
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
              // admin_pool (default)
              pool = allWarmupAccounts.filter(a => a.id !== account.id && a.is_pool_account);
            }
          }
          if (pool.length === 0) continue;

          let sent = 0;
          for (let i = 0; i < emailsToday; i++) {
            const toAccount = pool[Math.floor(Math.random() * pool.length)];
            const subject = WARMUP_SUBJECTS[Math.floor(Math.random() * WARMUP_SUBJECTS.length)];
            const body = WARMUP_BODIES[Math.floor(Math.random() * WARMUP_BODIES.length)];

            try {
              await sendEmail(
                { id: account.id, type: account.type, email: account.email, smtp_host: account.smtp_host, smtp_port: account.smtp_port, smtp_user: account.smtp_user, smtp_pass: account.smtp_pass },
                { from: account.email, to: toAccount.email, subject: `[warmup] ${subject}`, text: body, html: `<p>${body.replace(/\n/g, '<br>')}</p>` }
              );
              await supabase.from('warmup_emails').insert({ from_account_id: account.id, to_account_id: toAccount.id, subject, body, sent_at: new Date().toISOString() });
              sent++;
            } catch (e: any) {
              console.error(`[warmup-send] ${account.email} → ${toAccount.email}: ${e.message}`);
              if (e.responseCode === 535 || e.code === 'EAUTH') {
                await supabase.from('email_accounts').update({ status: 'error', warmup_enabled: false }).eq('id', account.id);
                break;
              }
            }
          }

          const newHealth = Math.min(100, Math.round((account.health_score ?? 50) + (sent / Math.max(emailsToday, 1)) * 2));
          await supabase.from('email_accounts').update({
            warmup_day: day,
            health_score: newHealth,
            sent_today: (account.sent_today ?? 0) + sent,
          }).eq('id', account.id);

          console.log(`[warmup-send] ${account.email} day=${day} sent=${sent}/${emailsToday} score=${newHealth}`);
        } catch (e: any) {
          console.error(`[warmup-send] ${account.email}: ${e.message}`);
        }
      }

      // ── PHASE 2: RECEIVE — rescue from spam, mark-read, auto-reply ───────
      for (const account of allWarmupAccounts) {
        try {
          if (account.type === 'gmail-oauth') {
            // Gmail API path
            let token: string;
            try { token = await getAccessToken({ id: account.id, type: account.type, email: account.email, smtp_pass: account.smtp_pass }); }
            catch { continue; }

            const messages = await gmailSearch('subject:[warmup] newer_than:2d', token);
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
                    const uids = await client.search({ since: new Date(Date.now() - 3 * 86400_000), subject: '[warmup]' }, { uid: true });
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
                const uids = await client.search({ since: new Date(Date.now() - 2 * 86400_000), subject: '[warmup]', seen: false }, { uid: true });
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
      await runValidationJob(supabase, job.data.jobId, job.data.userId);
    }, { connection, concurrency: 2 })
      .on('completed', j => console.log(`✓ Validation job ${j.id} done`))
      .on('failed', (j, err) => console.error(`✗ Validation job ${j?.id} failed:`, err.message));

    console.log('✅ Validation worker started');
  }
}

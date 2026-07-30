import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, recordRateLimitHit } from '@/lib/rate-limit';
import { verifyAccountCredentials } from '@/lib/account-verify';

type BulkEntry = { email: string; smtp_pass?: string };

// Bulk connect for IMAP/SMTP mailboxes sharing the same host settings (e.g. a
// batch of Titan mailboxes across several domains, one password per row or one
// shared password for all). Not for gmail-oauth (each needs its own Google
// consent) or gmail-app (each needs its own per-account App Password flow).
//
// Each entry is credential-verified BEFORE it counts toward anything or gets
// saved — mirrors the single-add path's new verify-then-insert order, just
// batched with low concurrency so a large list doesn't hammer the mail
// provider (an 8-way parallel burst during an earlier manual test on this
// exact kind of list looked enough like abuse to raise suspicion of an IP
// block, even though it turned out not to be the real cause that time).
const CONCURRENCY = 3;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = user.id;

  const body = await req.json();
  const { type, smtp_host, smtp_port, imap_host, imap_port, shared_password, join_shared_network } = body;
  const entries: BulkEntry[] = Array.isArray(body.entries) ? body.entries : [];

  if (type !== 'imap' && type !== 'smtp') {
    return NextResponse.json({ error: 'Bulk add only supports IMAP/SMTP mailboxes.' }, { status: 400 });
  }
  if (!smtp_host || !entries.length) {
    return NextResponse.json({ error: 'smtp_host and at least one entry are required.' }, { status: 400 });
  }
  if (entries.length > 100) {
    return NextResponse.json({ error: 'Max 100 mailboxes per bulk request.' }, { status: 400 });
  }

  const rate = await checkRateLimit(userId, 'email_account_bulk_add');
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many mailboxes added in a short time — please wait a bit and try again.' }, { status: 429 });
  }

  const joinSharedNetwork = join_shared_network !== false;
  const DEFAULT_DAILY_LIMIT = 50;
  const NEW_ACCOUNT_START_HEALTH = 50;

  async function processOne(entry: BulkEntry): Promise<{ email: string; ok: boolean; error?: string }> {
    const email = entry.email?.trim();
    const pass = (entry.smtp_pass ?? shared_password ?? '').trim();
    if (!email) return { email: entry.email || '(blank)', ok: false, error: 'missing email' };
    if (!pass) return { email, ok: false, error: 'missing password' };

    const { data: dup } = await supabaseAdmin
      .from('email_accounts').select('id').eq('user_id', userId).eq('email', email).maybeSingle();
    if (dup) return { email, ok: false, error: 'already connected to this account' };

    const { data: crossUserDup } = await supabaseAdmin
      .from('email_accounts').select('id').eq('email', email).neq('user_id', userId).limit(1).maybeSingle();
    if (crossUserDup) return { email, ok: false, error: 'already connected under another account on this platform' };

    const account = {
      type, email,
      smtp_host: String(smtp_host).trim(), smtp_port: smtp_port ? Number(smtp_port) : 465,
      smtp_user: email, smtp_pass: pass,
      imap_host: imap_host ? String(imap_host).trim() : null, imap_port: imap_port ? Number(imap_port) : 993,
    };

    const verify = await verifyAccountCredentials(account);
    if (!verify.ok) return { email, ok: false, error: verify.error };

    const { error: insertErr } = await supabaseAdmin.from('email_accounts').insert({
      user_id: userId,
      type: account.type, email: account.email,
      smtp_host: account.smtp_host, smtp_port: account.smtp_port,
      smtp_user: account.smtp_user, smtp_pass: account.smtp_pass,
      imap_host: account.imap_host, imap_port: account.imap_port,
      status: 'warming', health_score: NEW_ACCOUNT_START_HEALTH,
      warmup_enabled: true, already_warmed_up: false,
      join_shared_network: joinSharedNetwork, daily_limit: DEFAULT_DAILY_LIMIT,
    });
    if (insertErr) return { email, ok: false, error: insertErr.message };

    await recordRateLimitHit(userId, 'email_account_bulk_add');
    return { email, ok: true };
  }

  const results: { email: string; ok: boolean; error?: string }[] = [];
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(processOne));
    results.push(...batchResults);
    // Stop early if the whole batch is failing the same way (e.g. shared
    // password genuinely wrong / provider-side block) — no point burning
    // through the rest of a long list making the same mistake repeatedly.
    const allFailedSameReason = batchResults.length >= 3 && batchResults.every(r => !r.ok)
      && new Set(batchResults.map(r => r.error)).size === 1;
    if (allFailedSameReason && i + CONCURRENCY < entries.length) {
      results.push(...entries.slice(i + CONCURRENCY).map(e => ({
        email: e.email, ok: false, error: 'skipped — stopped after a repeated failure above, check credentials/provider settings first',
      })));
      break;
    }
  }

  const succeeded = results.filter(r => r.ok).length;
  return NextResponse.json({ total: entries.length, succeeded, failed: results.length - succeeded, results });
}

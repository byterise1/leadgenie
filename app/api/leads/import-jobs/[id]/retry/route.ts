import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { batchSmtp } from '@/lib/smtp-check';
import { scoreEmail, EmailResult, JobSummary } from '@/lib/score-engine';

export const maxDuration = 300;

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: job } = await supabaseAdmin
    .from('lead_import_jobs')
    .select('id, user_id, status, results, summary')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!job || job.status !== 'done') return NextResponse.json({ error: 'Job not ready' }, { status: 400 });

  const results: EmailResult[] = job.results || [];

  // Only retry emails blocked by SMTP 550 — not syntax fails, dupes, unsub, or prev-bounced
  const retryable = results.filter(r =>
    r.smtp === 'invalid' && !r.is_bounce && !r.is_unsub && !r.pre_fail && !r.is_dupe_this_list
  );

  if (retryable.length === 0) {
    return NextResponse.json({ results, summary: job.summary, retried: 0 });
  }

  const retryEmails = retryable.map(r => r.email);
  const smtpMap = await batchSmtp(retryEmails, 20);

  const updatedResults = results.map(r => {
    if (!retryEmails.includes(r.email)) return r;
    const newSmtp = (smtpMap.get(r.email) || 'unknown') as any;
    if (newSmtp === 'invalid') return r; // still blocked, no change
    const scored = scoreEmail({
      smtp: newSmtp,
      provider: r.provider,
      prevBounced: r.is_bounce,
      isUnsub: r.is_unsub,
      isRoleBased: false,
    });
    return { ...r, smtp: newSmtp, score: scored.score, decision: scored.decision, reasons: scored.reasons };
  });

  const updatedSummary: JobSummary = {
    total: job.summary?.total ?? updatedResults.length,
    safe: updatedResults.filter(r => r.decision === 'safe').length,
    caution: updatedResults.filter(r => r.decision === 'caution').length,
    block: updatedResults.filter(r => r.decision === 'block').length,
    pre_failed: job.summary?.pre_failed ?? 0,
    file_dupes: job.summary?.file_dupes ?? 0,
    in_this_list: job.summary?.in_this_list ?? 0,
    cross_list: job.summary?.cross_list ?? 0,
  };

  await supabaseAdmin
    .from('lead_import_jobs')
    .update({ results: updatedResults, summary: updatedSummary })
    .eq('id', id);

  return NextResponse.json({ results: updatedResults, summary: updatedSummary, retried: retryable.length });
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications';

const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

const BOT_PATTERNS = [
  'googlebot', 'bingpreview', 'linkedinbot', 'twitterbot',
  'facebookexternalhit', 'bot/', 'crawler', 'spider',
  'wget/', 'curl/', 'python-requests', 'postmanruntime',
  'okhttp', 'go-http-client', 'apache-httpclient',
];

function isBot(ua: string): boolean {
  const lower = ua.toLowerCase();
  return BOT_PATTERNS.some(p => lower.includes(p));
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ua = req.headers.get('user-agent') || '';

  if (!isBot(ua)) {
    const cutoff = new Date(Date.now() - 30000).toISOString();
    const { data: updated } = await supabaseAdmin
      .from('sent_emails')
      .update({ opened_at: new Date().toISOString() })
      .eq('id', id)
      .is('opened_at', null)
      .or(`sent_at.is.null,sent_at.lt.${cutoff}`)
      .select('user_id, campaign_id, lead_id, lead:leads(email, first_name)')
      .maybeSingle();

    // Fire "lead opens email" notification if user has pref enabled
    if (updated?.user_id) {
      const { data: prof } = await supabaseAdmin
        .from('profiles').select('notif_lead_open').eq('id', updated.user_id).maybeSingle();
      if (prof?.notif_lead_open === true) {
        const lead = updated.lead as { email?: string; first_name?: string } | null;
        const who = lead?.first_name || lead?.email || 'A lead';
        await createNotification(
          updated.user_id,
          `${who} opened your email`,
          'info',
          updated.campaign_id ? `/dashboard/campaigns/${updated.campaign_id}` : '/dashboard/analytics',
        );
      }
    }

    // No matching sent_emails row — this id may be a warmup ping instead
    // (same tracking-pixel mechanism, separate table, IDs never collide
    // across the two since each is its own UUID space). Real open-tracking
    // for warmup, replacing the old "assume opened the instant found"
    // simulation in the warmup-engage worker — see 20260726_warmup_open_tracking.sql.
    if (!updated) {
      await supabaseAdmin
        .from('warmup_emails')
        .update({ opened_at: new Date().toISOString() })
        .eq('id', id)
        .is('opened_at', null)
        .or(`sent_at.is.null,sent_at.lt.${cutoff}`);
    }
  }

  return new NextResponse(GIF, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
    },
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

// Only block obvious non-email-client bots (search crawlers, HTTP tools)
// Do NOT block email client proxies (googleimageproxy, yahoo mail proxy) —
// that would prevent all Gmail/Yahoo opens from ever being counted.
const BOT_PATTERNS = [
  'googlebot',
  'bingpreview',
  'linkedinbot',
  'twitterbot',
  'facebookexternalhit',
  'bot/',
  'crawler',
  'spider',
  'wget/',
  'curl/',
  'python-requests',
  'postmanruntime',
  'okhttp',
  'go-http-client',
  'apache-httpclient',
];

function isBot(ua: string): boolean {
  const lower = ua.toLowerCase();
  return BOT_PATTERNS.some(p => lower.includes(p));
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ua = req.headers.get('user-agent') || '';

  if (!isBot(ua)) {
    // Only count opens that fire more than 30s after sending.
    // Gmail pre-fetches images within 5-15s of delivery — this guard filters
    // that false positive without blocking genuine opens that come later.
    // Also allow emails where sent_at is NULL (legacy rows before sent_at was added).
    const cutoff = new Date(Date.now() - 30000).toISOString();
    await supabaseAdmin
      .from('sent_emails')
      .update({ opened_at: new Date().toISOString() })
      .eq('id', id)
      .is('opened_at', null)
      .or(`sent_at.is.null,sent_at.lt.${cutoff}`);
  }

  return new NextResponse(GIF, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
    },
  });
}

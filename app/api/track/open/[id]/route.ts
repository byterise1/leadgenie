import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

// Known email scanner/proxy user-agents — don't count these as real opens
const BOT_PATTERNS = [
  'googleimageproxy',
  'via ggpht',
  'ggpht.com',
  'google-apps-script',
  'feedfetcher-google',
  'googlebot',
  'yahoo mail proxy',
  'yahoomailproxy',
  'bingpreview',
  'linkedinbot',
  'twitterbot',
  'facebookexternalhit',
  'preview',
  'scanner',
  'crawler',
  'spider',
  'bot/',
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

  // Blank UA = almost always a server-side pre-fetch (Gmail CDN, scanners)
  if (ua && !isBot(ua)) {
    await supabaseAdmin
      .from('sent_emails')
      .update({ opened_at: new Date().toISOString() })
      .eq('id', id)
      .is('opened_at', null);
  }

  return new NextResponse(GIF, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
    },
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

// Known email scanner/proxy user-agents — don't count these as real opens
const BOT_PATTERNS = [
  'googleimageproxy',
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
];

function isBot(ua: string): boolean {
  const lower = ua.toLowerCase();
  return BOT_PATTERNS.some(p => lower.includes(p));
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ua = req.headers.get('user-agent') || '';

  if (!isBot(ua)) {
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

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const BOT_PATTERNS = [
  'googlebot', 'bingpreview', 'linkedinbot', 'twitterbot',
  'facebookexternalhit', 'bot/', 'crawler', 'spider',
  'wget/', 'curl/', 'python-requests', 'postmanruntime',
  'okhttp', 'go-http-client', 'apache-httpclient',
  'microsoftpreview', 'safelinks', 'outlook-link-scanner',
];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = req.nextUrl.searchParams.get('url') || '';
  const ua = (req.headers.get('user-agent') || '').toLowerCase();
  const isBot = BOT_PATTERNS.some(p => ua.includes(p));

  // Only record the first real click (skip scanner bots)
  if (id && !isBot) {
    await supabaseAdmin
      .from('sent_emails')
      .update({ clicked_at: new Date().toISOString() })
      .eq('id', id)
      .is('clicked_at', null);
  }

  // Redirect to the original URL (or home if missing/invalid)
  const destination = url.startsWith('http') ? url : '/';
  return NextResponse.redirect(destination, { status: 302 });
}

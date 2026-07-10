import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  // Carries the "already warmed up" checkbox through Google's redirect round
  // trip — state is the only place we can stash app-specific context here.
  // user.id is a UUID (no colons), so splitting on ':' in the callback is safe.
  const alreadyWarmedUp = new URL(request.url).searchParams.get('already_warmed_up') === '1';
  const state = `${user.id}:${alreadyWarmedUp ? '1' : '0'}`;

  const forwardedHost = request.headers.get('x-forwarded-host');
  const { host } = new URL(request.url);
  // Google's registered redirect URIs are all https - always build the
  // callback URL as https regardless of the protocol the browser actually
  // used to reach this route, or a plain-http visit produces a redirect_uri
  // that can never match Google's console config (redirect_uri_mismatch).
  const siteOrigin = `https://${forwardedHost || host}`;

  const redirectUri = `${siteOrigin}/api/email-accounts/oauth/google/callback`;

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://mail.google.com/ https://www.googleapis.com/auth/userinfo.email',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

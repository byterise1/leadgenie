import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  const forwardedHost = request.headers.get('x-forwarded-host');
  const { host } = new URL(request.url);
  // Google's registered redirect URIs are all https - always build the
  // callback URL as https regardless of the protocol the browser actually
  // used to reach this route, or a plain-http visit produces a redirect_uri
  // that can never match Google's console config (redirect_uri_mismatch).
  const siteOrigin = `https://${forwardedHost || host}`;

  const redirectUri = `${siteOrigin}/api/admin/warmup/oauth/google/callback`;

  // Encode admin user id + marker so callback knows this is a pool account
  const state = `${user.id}:pool`;

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

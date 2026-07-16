import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const userId = searchParams.get('state');
  const oauthError = searchParams.get('error');

  const forwardedHost = request.headers.get('x-forwarded-host');
  const { host } = new URL(request.url);
  const siteOrigin = `https://${forwardedHost || host}`;
  const redirectUri = `${siteOrigin}/api/postmaster/oauth/google/callback`;
  const failUrl = `${siteOrigin}/dashboard/email-accounts?pm_error=oauth_failed`;

  if (oauthError || !code || !userId) return NextResponse.redirect(failUrl);

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  const tokens = await tokenRes.json();
  if (!tokens.refresh_token || !tokens.access_token) return NextResponse.redirect(failUrl);

  const infoRes = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const info = await infoRes.json();

  const { error } = await supabaseAdmin.from('postmaster_connections').upsert({
    user_id: userId,
    google_email: info.email || null,
    refresh_token: tokens.refresh_token,
    connected_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  if (error) {
    // Most likely cause: migration 20260716_postmaster_tools.sql hasn't been run yet.
    console.error('postmaster_connections upsert error:', error.message);
    return NextResponse.redirect(`${siteOrigin}/dashboard/email-accounts?pm_error=save_failed`);
  }

  return NextResponse.redirect(`${siteOrigin}/dashboard/email-accounts?pm_connected=1`);
}

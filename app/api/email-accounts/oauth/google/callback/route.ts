import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // user_id
  const oauthError = searchParams.get('error');

  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  const { origin } = new URL(request.url);
  const siteOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin;
  const redirectUri = `${siteOrigin}/api/email-accounts/oauth/google/callback`;
  const failUrl = `${siteOrigin}/dashboard/email-accounts?error=oauth_failed`;

  if (oauthError || !code || !state) return NextResponse.redirect(failUrl);

  // Exchange code for tokens
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

  // Get Gmail address
  const infoRes = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const info = await infoRes.json();
  if (!info.email) return NextResponse.redirect(failUrl);

  // Upsert account — store refresh token in smtp_pass
  await supabaseAdmin.from('email_accounts').upsert({
    user_id: state,
    type: 'gmail-oauth',
    email: info.email,
    smtp_user: info.email,
    smtp_pass: tokens.refresh_token,
    status: 'active',
    health_score: 85,
  }, { onConflict: 'user_id,email' });

  return NextResponse.redirect(`${siteOrigin}/dashboard/email-accounts?connected=gmail`);
}

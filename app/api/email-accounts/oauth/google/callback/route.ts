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

  // Ensure profile row exists for this user
  await supabaseAdmin.from('profiles').upsert({ id: state }, { onConflict: 'id', ignoreDuplicates: true });

  // Manual check-then-insert-or-update (no unique constraint on user_id+email yet)
  const { data: existingAccount } = await supabaseAdmin
    .from('email_accounts')
    .select('id')
    .eq('user_id', state)
    .eq('email', info.email)
    .maybeSingle();

  if (existingAccount) {
    await supabaseAdmin.from('email_accounts').update({
      smtp_pass: tokens.refresh_token,
      smtp_user: info.email,
      status: 'warming',
    }).eq('id', existingAccount.id);
  } else {
    // One mailbox = one identity, platform-wide — block if this Gmail is already
    // connected under a different account (regular or pool).
    const { data: crossUserDup } = await supabaseAdmin
      .from('email_accounts')
      .select('id')
      .eq('email', info.email)
      .neq('user_id', state)
      .limit(1)
      .maybeSingle();
    if (crossUserDup) return NextResponse.redirect(`${siteOrigin}/dashboard/email-accounts?error=already_connected`);

    await supabaseAdmin.from('email_accounts').insert({
      user_id: state,
      type: 'gmail-oauth',
      email: info.email,
      smtp_user: info.email,
      smtp_pass: tokens.refresh_token,
      status: 'warming',
      health_score: 50,
      warmup_enabled: true,
    });
  }

  const connectedParam = existingAccount ? 'gmail_refreshed' : 'gmail';
  return NextResponse.redirect(`${siteOrigin}/dashboard/email-accounts?connected=${connectedParam}`);
}

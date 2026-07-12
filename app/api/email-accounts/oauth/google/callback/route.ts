import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const rawState = searchParams.get('state'); // "userId:alreadyWarmedUp(0|1):joinSharedNetwork(0|1)"
  const [state, alreadyWarmedUpFlag, joinSharedNetworkFlag] = rawState ? rawState.split(':') : [null, '0', '1'];
  const alreadyWarmedUp = alreadyWarmedUpFlag === '1';
  const joinSharedNetwork = joinSharedNetworkFlag !== '0';
  const oauthError = searchParams.get('error');

  const forwardedHost = request.headers.get('x-forwarded-host');
  const { host } = new URL(request.url);
  // Must exactly match the https redirect_uri sent to Google in the initial
  // auth request, or the token exchange fails with redirect_uri_mismatch.
  const siteOrigin = `https://${forwardedHost || host}`;
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
      type: 'gmail-oauth',
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

    // "Already warmed up" (checkbox on the connect modal, carried through
    // Google's redirect via `state`) skips the 14-day ramp for real sending
    // — starts at a healthy 85 instead of the neutral 50 baseline — but
    // stays warmup_enabled=true so health keeps updating from real signals
    // instead of freezing. See campaignDailyCap() in lib/warmup-health.ts.
    const ALREADY_WARMED_START_HEALTH = 85;
    await supabaseAdmin.from('email_accounts').insert({
      user_id: state,
      type: 'gmail-oauth',
      email: info.email,
      smtp_user: info.email,
      smtp_pass: tokens.refresh_token,
      status: alreadyWarmedUp ? 'active' : 'warming',
      health_score: alreadyWarmedUp ? ALREADY_WARMED_START_HEALTH : 50,
      warmup_enabled: true,
      already_warmed_up: alreadyWarmedUp,
      join_shared_network: joinSharedNetwork,
    });
  }

  const connectedParam = existingAccount ? 'gmail_refreshed' : 'gmail';
  return NextResponse.redirect(`${siteOrigin}/dashboard/email-accounts?connected=${connectedParam}`);
}

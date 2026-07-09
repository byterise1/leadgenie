import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // format: "userId:pool"
  const oauthError = searchParams.get('error');

  const forwardedHost = request.headers.get('x-forwarded-host');
  const { host } = new URL(request.url);
  // Must exactly match the https redirect_uri sent to Google in the initial
  // auth request, or the token exchange fails with redirect_uri_mismatch.
  const siteOrigin = `https://${forwardedHost || host}`;

  const redirectUri = `${siteOrigin}/api/admin/warmup/oauth/google/callback`;
  const failUrl = `${siteOrigin}/admin/warmup?error=oauth_failed`;
  const alreadyUrl = `${siteOrigin}/admin/warmup?refreshed=gmail`;
  const successUrl = `${siteOrigin}/admin/warmup?connected=gmail`;

  if (oauthError || !code || !state) return NextResponse.redirect(failUrl);

  const [adminId, marker] = state.split(':');
  if (marker !== 'pool' || !adminId) return NextResponse.redirect(failUrl);

  // Verify the user is still an admin
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('is_admin').eq('id', adminId).single();
  if (!profile?.is_admin) return NextResponse.redirect(failUrl);

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

  // Check if this Gmail already exists (pool or non-pool)
  const { data: existing } = await supabaseAdmin
    .from('email_accounts')
    .select('id, is_pool_account')
    .eq('user_id', adminId)
    .eq('email', info.email)
    .maybeSingle();

  if (existing) {
    // Account already exists — update tokens + mark as pool account
    const { error: upErr } = await supabaseAdmin.from('email_accounts').update({
      smtp_pass: tokens.refresh_token,
      smtp_user: info.email,
      type: 'gmail-oauth',
      status: 'warming',
      warmup_enabled: true,
      is_pool_account: true,
    }).eq('id', existing.id);
    if (upErr) return NextResponse.redirect(`${siteOrigin}/admin/warmup?error=update_failed`);
    // Show "refreshed" if it was already a pool account, "connected" if newly promoted
    return NextResponse.redirect(existing.is_pool_account ? alreadyUrl : successUrl);
  } else {
    // One mailbox = one identity, platform-wide — block if this Gmail is already
    // connected under a different user's account.
    const { data: crossUserDup } = await supabaseAdmin
      .from('email_accounts')
      .select('id')
      .eq('email', info.email)
      .neq('user_id', adminId)
      .limit(1)
      .maybeSingle();
    if (crossUserDup) {
      return NextResponse.redirect(`${siteOrigin}/admin/warmup?error=insert_failed&msg=${encodeURIComponent(`${info.email} is already connected to a user account — remove it there first.`)}`);
    }

    const { error: insErr } = await supabaseAdmin.from('email_accounts').insert({
      user_id: adminId,
      type: 'gmail-oauth',
      email: info.email,
      smtp_user: info.email,
      smtp_pass: tokens.refresh_token,
      status: 'warming',
      health_score: 50,
      warmup_enabled: true,
      is_pool_account: true,
    });
    if (insErr) {
      const msg = encodeURIComponent(insErr.message ?? 'Unknown error');
      return NextResponse.redirect(`${siteOrigin}/admin/warmup?error=insert_failed&msg=${msg}`);
    }
  }

  return NextResponse.redirect(successUrl);
}

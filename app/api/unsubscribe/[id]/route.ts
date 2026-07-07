import { supabaseAdmin } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications';
import { checkCampaignAutoComplete } from '@/lib/campaign-scheduling';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: sentEmail } = await supabaseAdmin
    .from('sent_emails')
    .select('id,lead_id,campaign_id')
    .eq('id', id)
    .maybeSingle();

  if (!sentEmail) {
    return new Response(
      `<!DOCTYPE html><html><head><title>Invalid link</title><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f9fafb;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}</style>
</head><body>
<div style="background:#fff;max-width:420px;width:100%;border-radius:20px;padding:48px 32px;text-align:center;box-shadow:0 2px 16px rgba(0,0,0,.07)">
  <div style="width:52px;height:52px;background:#fef3c7;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:24px">⚠</div>
  <h2 style="font-size:20px;font-weight:700;color:#111827;margin-bottom:10px">Link not found</h2>
  <p style="color:#6b7280;font-size:14px;line-height:1.6">This unsubscribe link is no longer valid or has already been used.</p>
</div>
</body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  // Check if already unsubscribed
  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('status, first_name, email')
    .eq('id', sentEmail.lead_id)
    .maybeSingle();

  const alreadyUnsubbed = lead?.status === 'unsubscribed';

  if (!alreadyUnsubbed) {
    await Promise.all([
      supabaseAdmin.from('sent_emails').update({ unsubscribed_at: new Date().toISOString() }).eq('id', id),
      supabaseAdmin.from('leads').update({ status: 'unsubscribed' }).eq('id', sentEmail.lead_id),
      supabaseAdmin
        .from('campaign_leads')
        .update({ status: 'unsubscribed' })
        .eq('campaign_id', sentEmail.campaign_id)
        .eq('lead_id', sentEmail.lead_id),
    ]);

    // If this was the last pending/active lead in the campaign, mark it
    // completed — previously only the email-sending worker's own success
    // path did this, so a campaign whose final lead unsubscribed instead of
    // finishing normally would sit at "active" forever with nothing left to send.
    if (sentEmail.campaign_id) await checkCampaignAutoComplete(sentEmail.campaign_id);

    // Notify the campaign owner (if they have unsubscribe notifications enabled)
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('user_id, name')
      .eq('id', sentEmail.campaign_id)
      .maybeSingle();

    if (campaign?.user_id) {
      const { data: prof } = await supabaseAdmin
        .from('profiles').select('notif_unsubscribe').eq('id', campaign.user_id).maybeSingle();
      if (prof?.notif_unsubscribe !== false) {
        await createNotification(
          campaign.user_id,
          `${lead?.email || 'A lead'} unsubscribed from campaign "${campaign.name}"`,
          'info',
          '/dashboard/leads',
        );
      }
    }
  }

  const firstName = lead?.first_name?.trim() || '';
  const greeting = firstName ? `${firstName}, you're` : `You're`;

  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Unsubscribed</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background: #f3f4f6;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #fff;
      max-width: 440px;
      width: 100%;
      border-radius: 20px;
      padding: 48px 36px 40px;
      text-align: center;
      box-shadow: 0 2px 20px rgba(0,0,0,.08);
    }
    .icon-wrap {
      width: 64px;
      height: 64px;
      background: #f0fdf4;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .icon-wrap svg {
      width: 28px;
      height: 28px;
      stroke: #16a34a;
      stroke-width: 2.5;
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 10px;
      line-height: 1.3;
    }
    .sub {
      font-size: 14px;
      color: #6b7280;
      line-height: 1.65;
      margin-bottom: 28px;
    }
    .divider {
      border: none;
      border-top: 1px solid #f0f0f0;
      margin-bottom: 24px;
    }
    .detail {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      text-align: left;
      padding: 12px 0;
      border-bottom: 1px solid #f9fafb;
    }
    .detail:last-child { border-bottom: none; }
    .detail-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 15px;
    }
    .detail-text { font-size: 13px; color: #374151; line-height: 1.5; }
    .detail-text strong { color: #111827; font-weight: 600; display: block; margin-bottom: 1px; }
    .badge {
      display: inline-block;
      background: #f0fdf4;
      color: #15803d;
      font-size: 11px;
      font-weight: 700;
      border-radius: 999px;
      padding: 3px 10px;
      margin-bottom: 20px;
      letter-spacing: 0.4px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrap">
      <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
    <span class="badge">${alreadyUnsubbed ? 'Already unsubscribed' : 'Successfully unsubscribed'}</span>
    <h1>${greeting} all set</h1>
    <p class="sub">You've been removed from this mailing list. No more emails from this sender — ever.</p>
    <hr class="divider">
    <div class="detail">
      <div class="detail-icon" style="background:#eff6ff">📭</div>
      <div class="detail-text">
        <strong>No more emails</strong>
        You've been removed from this sender's mailing list immediately.
      </div>
    </div>
    <div class="detail">
      <div class="detail-icon" style="background:#fef9ec">🔒</div>
      <div class="detail-text">
        <strong>Your data is safe</strong>
        We don't share or sell contact information.
      </div>
    </div>
    <div class="detail">
      <div class="detail-icon" style="background:#f0fdf4">💬</div>
      <div class="detail-text">
        <strong>Changed your mind?</strong>
        Reply directly to any email from this sender to reconnect.
      </div>
    </div>
  </div>
</body>
</html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}

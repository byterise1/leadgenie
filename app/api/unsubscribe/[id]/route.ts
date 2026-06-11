import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: sentEmail } = await supabaseAdmin
    .from('sent_emails')
    .select('id,lead_id,campaign_id')
    .eq('id', id)
    .maybeSingle();

  if (!sentEmail) {
    return new Response(
      `<html><body style="font-family:Arial;text-align:center;padding:60px;color:#374151"><h2>Invalid unsubscribe link</h2><p style="color:#9ca3af">This link is no longer valid.</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  await Promise.all([
    supabaseAdmin.from('sent_emails').update({ unsubscribed_at: new Date().toISOString() }).eq('id', id),
    supabaseAdmin.from('leads').update({ status: 'unsubscribed' }).eq('id', sentEmail.lead_id),
    supabaseAdmin
      .from('campaign_leads')
      .update({ status: 'unsubscribed' })
      .eq('campaign_id', sentEmail.campaign_id)
      .eq('lead_id', sentEmail.lead_id),
  ]);

  return new Response(
    `<!DOCTYPE html>
<html>
<head><title>Unsubscribed</title><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;background:#f9fafb;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;margin:0">
  <div style="background:white;max-width:440px;width:100%;border-radius:16px;padding:40px 32px;text-align:center;box-shadow:0 1px 8px rgba(0,0,0,.08)">
    <div style="width:48px;height:48px;background:#ecfdf5;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:22px">✓</div>
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827;font-weight:700">You've been unsubscribed</h2>
    <p style="color:#6b7280;margin:0;font-size:14px;line-height:1.6">You won't receive any more emails from this sender. If this was a mistake, please contact the sender directly.</p>
  </div>
</body>
</html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}

import { Resend } from 'resend';

// Lazily constructed so a missing RESEND_API_KEY doesn't crash anything at
// import time — every caller here is a background/side-effect path (billing,
// notifications), never something a user request should fail on.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = '"Leads Add" <noreply@leadsgenie.site>';
const SITE_URL = process.env.SITE_URL || 'https://leadsgenie.site';

function emailShell(bodyHtml: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;margin:0">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
      <p style="font-size:18px;font-weight:700;color:#111;margin:0 0 20px">Leads Add</p>
      ${bodyHtml}
      <p style="font-size:12px;color:#9ca3af;margin:32px 0 0;padding-top:16px;border-top:1px solid #f1f5f9">Leads Add · leadsgenie.site</p>
    </div>
  </body></html>`;
}

// Every caller in this file swallows its own errors (logs, never throws) —
// a Resend hiccup or missing API key must never break the campaign/billing/
// notification code path that triggered the email. Email is a side effect,
// not a dependency of core app behavior.
export async function sendTransactionalEmail(opts: { to: string; subject: string; html: string; text?: string }): Promise<boolean> {
  if (!resend) {
    console.error('[resend] RESEND_API_KEY not set — skipping email:', opts.subject);
    return false;
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: emailShell(opts.html),
      ...(opts.text ? { text: opts.text } : {}),
    });
    if (error) { console.error('[resend] send failed:', error.message); return false; }
    return true;
  } catch (err: any) {
    console.error('[resend] send threw:', err.message);
    return false;
  }
}

// Looks up a user's real login email (from Supabase Auth, not the profile
// table — that's the only place a verified email address actually lives)
// and sends a branded notification. Used as an ADDITIONAL side effect
// alongside the existing in-app notifications.insert() calls, never a
// replacement — each call site decides independently whether to email,
// respecting whatever notification-preference gate already existed there.
export async function notifyUserByEmail(opts: {
  userId: string; subject: string; bodyHtml: string; link?: string;
}): Promise<void> {
  try {
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    const { data } = await supabaseAdmin.auth.admin.getUserById(opts.userId);
    const email = data.user?.email;
    if (!email) return;
    const linkHtml = opts.link
      ? `<p style="margin:24px 0 0"><a href="${SITE_URL}${opts.link}" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block">View in dashboard</a></p>`
      : '';
    await sendTransactionalEmail({ to: email, subject: opts.subject, html: `${opts.bodyHtml}${linkHtml}` });
  } catch (err: any) {
    console.error('[notifyUserByEmail] failed:', err.message);
  }
}

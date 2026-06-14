import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/mailer';
import { ImapFlow } from 'imapflow';

// Verify Gmail App Password via IMAP — imap.gmail.com:993 works from Railway,
// smtp.gmail.com is blocked. Same credentials work for both IMAP and SMTP.
async function verifyGmailAppPassword(email: string, pass: string): Promise<void> {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: email, pass: pass.replace(/\s+/g, '') },
    logger: false,
    tls: { rejectUnauthorized: false },
    connectionTimeout: 15000,
    socketTimeout: 20000,
  });
  await client.connect();
  await client.logout();
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const { data: account } = await supabaseAdmin
    .from('email_accounts')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  // Gmail App Password: verify via IMAP (works from Railway, same credentials as SMTP)
  if (account.type === 'gmail-app') {
    try {
      await verifyGmailAppPassword(account.smtp_user || account.email, account.smtp_pass);
      await supabaseAdmin.from('email_accounts').update({ status: 'active' }).eq('id', id);
      return NextResponse.json({ success: true, sentTo: null, note: 'Credentials verified via IMAP' });
    } catch (err: any) {
      const msg = err?.message || '';
      await supabaseAdmin.from('email_accounts').update({ status: 'error' }).eq('id', id);
      if (msg.includes('535') || msg.includes('auth') || msg.includes('Invalid') || msg.includes('credentials')) {
        return NextResponse.json({ error: 'Wrong App Password — go to myaccount.google.com/apppasswords and generate a new one.' }, { status: 500 });
      }
      if (msg.includes('IMAP access is disabled') || msg.includes('not enabled')) {
        return NextResponse.json({ error: 'Enable IMAP in Gmail settings: Settings → See all settings → Forwarding and POP/IMAP → Enable IMAP.' }, { status: 500 });
      }
      return NextResponse.json({ error: `IMAP check failed: ${msg}` }, { status: 500 });
    }
  }

  // All other account types: send a real test email via SMTP
  try {
    await sendEmail(account, {
      from: account.email,
      to: user.email!,
      subject: 'Lead Genie — Test Email',
      text: `Your sending account ${account.email} is connected and working correctly.\n\nSent from Lead Genie.`,
      html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111;max-width:480px">
        <p style="margin:0 0 12px 0"><strong>Test email from Lead Genie</strong></p>
        <p style="margin:0 0 12px 0">Your sending account <strong>${account.email}</strong> is connected and working correctly.</p>
        <p style="margin:0;color:#888;font-size:12px">Sent via Lead Genie campaign platform.</p>
      </div>`,
    });

    await supabaseAdmin.from('email_accounts').update({ status: 'active' }).eq('id', id);
    return NextResponse.json({ success: true, sentTo: user.email });
  } catch (err: any) {
    const msg = err?.message || 'Unknown error';
    const code = err?.responseCode;
    const errCode = err?.code || '';

    if (code === 535 || code === 401 || errCode === 'EAUTH' ||
        msg.includes('auth') || msg.includes('token') || msg.includes('credentials') || msg.includes('not enabled')) {
      await supabaseAdmin.from('email_accounts').update({ status: 'error' }).eq('id', id);
      return NextResponse.json({ error: 'Authentication failed — check your username and password.' }, { status: 500 });
    }
    if (errCode === 'ETIMEDOUT' || errCode === 'ECONNREFUSED' || errCode === 'ENOTFOUND' ||
        msg.includes('timeout') || msg.includes('ETIMEDOUT') || msg.includes('ECONNREFUSED')) {
      const host = account.smtp_host || 'SMTP server';
      return NextResponse.json({
        error: `Cannot reach ${host}:${account.smtp_port || 587} — the provider is blocking connections from cloud servers.`,
      }, { status: 500 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

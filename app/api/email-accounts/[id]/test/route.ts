import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/mailer';

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

    // Mark account as active on success
    await supabaseAdmin.from('email_accounts').update({ status: 'active' }).eq('id', id);

    return NextResponse.json({ success: true, sentTo: user.email });
  } catch (err: any) {
    const msg = err?.message || 'Unknown error';
    const code = err?.responseCode;
    // Mark as error on auth failures or config issues (535 covers Gmail API not enabled too)
    if (code === 535 || code === 401 || err?.code === 'EAUTH' ||
        msg.includes('auth') || msg.includes('token') || msg.includes('credentials') || msg.includes('not enabled')) {
      await supabaseAdmin.from('email_accounts').update({ status: 'error' }).eq('id', id);
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

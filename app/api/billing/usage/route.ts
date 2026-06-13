import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [campaigns, leads, emails, accounts, profile] = await Promise.all([
    supabaseAdmin.from('campaigns').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabaseAdmin.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabaseAdmin.from('sent_emails').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabaseAdmin.from('email_accounts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabaseAdmin.from('profiles').select('plan, credits_used, credits_total').eq('id', user.id).single(),
  ]);

  const plan = profile.data?.plan || 'free';
  const limits = plan === 'pro'
    ? { campaigns: Infinity, leads: Infinity, emails: 50000, accounts: Infinity }
    : plan === 'agency'
    ? { campaigns: Infinity, leads: Infinity, emails: 200000, accounts: Infinity }
    : { campaigns: 3, leads: 500, emails: 1000, accounts: 1 };

  return NextResponse.json({
    plan,
    credits_used: emails.count ?? 0,
    credits_total: profile.data?.credits_total ?? 100,
    usage: {
      campaigns: { used: campaigns.count ?? 0, max: limits.campaigns },
      leads: { used: leads.count ?? 0, max: limits.leads },
      emails: { used: emails.count ?? 0, max: limits.emails },
      accounts: { used: accounts.count ?? 0, max: limits.accounts },
    },
  });
  } catch (err) {
    console.error('Billing usage route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

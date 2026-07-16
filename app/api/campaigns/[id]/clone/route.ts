import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Clones a campaign (any status) into a brand-new draft — same schedule,
// steps, and sending accounts, but no leads/sends carried over, so it's
// safe to edit and relaunch without touching the original.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const { data: original, error: fetchErr } = await supabaseAdmin
    .from('campaigns')
    .select('*, campaign_accounts(account_id), email_steps(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchErr || !original) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

  const { id: _id, created_at: _ca, updated_at: _ua, campaign_accounts, email_steps, ...campaignFields } = original as Record<string, unknown> & {
    campaign_accounts: { account_id: string }[];
    email_steps: Record<string, unknown>[];
  };

  const { data: cloned, error: cloneErr } = await supabaseAdmin
    .from('campaigns')
    .insert({
      ...campaignFields,
      name: `${original.name} (Copy)`,
      status: 'draft',
    })
    .select()
    .single();

  if (cloneErr) return NextResponse.json({ error: cloneErr.message }, { status: 500 });

  if (email_steps?.length) {
    const stepRows = email_steps.map(s => {
      const { id: _sid, campaign_id: _cid, created_at: _sca, updated_at: _sua, ...rest } = s as Record<string, unknown>;
      return { ...rest, campaign_id: cloned.id };
    });
    const { error: stepsErr } = await supabaseAdmin.from('email_steps').insert(stepRows);
    if (stepsErr) {
      await supabaseAdmin.from('campaigns').delete().eq('id', cloned.id);
      return NextResponse.json({ error: 'Failed to clone email steps: ' + stepsErr.message }, { status: 500 });
    }
  }

  if (campaign_accounts?.length) {
    await supabaseAdmin.from('campaign_accounts').insert(
      campaign_accounts.map(ca => ({ campaign_id: cloned.id, account_id: ca.account_id })),
    );
  }

  return NextResponse.json(cloned);
}

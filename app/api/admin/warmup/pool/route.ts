import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single();
  return profile?.is_admin ? user : null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let data: Record<string, any>[] | null;
  let error: { message: string } | null;
  {
    const res = await supabaseAdmin
      .from('email_accounts')
      .select('id, email, type, status, health_score, warmup_enabled, warmup_day, warmup_target, sent_today, warmup_paused, warmup_pause_reason')
      .eq('user_id', admin.id)
      .eq('is_pool_account', true)
      .order('created_at', { ascending: true });
    data = res.data;
    error = res.error;
  }

  // Phase 1 migration not run yet — fall back to the pre-migration column set.
  if (error) {
    const fallback = await supabaseAdmin
      .from('email_accounts')
      .select('id, email, type, status, health_score, warmup_enabled, warmup_day, warmup_target, sent_today')
      .eq('user_id', admin.id)
      .eq('is_pool_account', true)
      .order('created_at', { ascending: true });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { email, type, smtp_host, smtp_port, smtp_user, smtp_pass, warmup_target } = body;

  if (!email || !smtp_host || !smtp_user || !smtp_pass) {
    return NextResponse.json({ error: 'email, smtp_host, smtp_user and smtp_pass are required' }, { status: 400 });
  }

  // Check if this email already exists for the admin (unique constraint)
  const { data: existing } = await supabaseAdmin
    .from('email_accounts')
    .select('id')
    .eq('user_id', admin.id)
    .eq('email', email)
    .maybeSingle();

  // One mailbox = one identity, platform-wide
  if (!existing) {
    const { data: crossUserDup } = await supabaseAdmin
      .from('email_accounts')
      .select('id')
      .eq('email', email)
      .neq('user_id', admin.id)
      .limit(1)
      .maybeSingle();
    if (crossUserDup) {
      return NextResponse.json({ error: `${email} is already connected to a user account on this platform — remove it there first, or use a different inbox for the pool.` }, { status: 409 });
    }
  }

  let result;
  if (existing) {
    // Promote existing account to pool account
    const { data, error } = await supabaseAdmin
      .from('email_accounts')
      .update({
        type: type || 'smtp',
        smtp_host,
        smtp_port: smtp_port || 587,
        smtp_user,
        smtp_pass,
        warmup_enabled: true,
        warmup_target: warmup_target || 40,
        health_score: 50,
        status: 'warming',
        is_pool_account: true,
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    result = data;
  } else {
    const { data, error } = await supabaseAdmin
      .from('email_accounts')
      .insert({
        user_id: admin.id,
        email,
        type: type || 'smtp',
        status: 'warming',
        smtp_host,
        smtp_port: smtp_port || 587,
        smtp_user,
        smtp_pass,
        warmup_enabled: true,
        warmup_target: warmup_target || 40,
        health_score: 50,
        is_pool_account: true,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    result = data;
  }

  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { id, warmup_target, promote } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (typeof warmup_target === 'number') updates.warmup_target = warmup_target;
  // promote=true: mark an existing admin account as a pool account
  if (promote === true) {
    updates.is_pool_account = true;
    updates.warmup_enabled = true;
    updates.status = 'warming';
  }
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('email_accounts')
    .update(updates)
    .eq('id', id)
    .eq('user_id', admin.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await req.json();
  // Demote from pool (keep account for sending, just remove pool flag)
  const { error } = await supabaseAdmin
    .from('email_accounts')
    .update({ is_pool_account: false, warmup_enabled: false })
    .eq('id', id)
    .eq('user_id', admin.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

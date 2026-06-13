import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return NextResponse.json({ ...data, email: user.email });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  const updates: Record<string, unknown> = {};

  // Profile fields
  if (body.full_name !== undefined) updates.full_name = body.full_name;
  if (body.company !== undefined) updates.company = body.company;
  if (body.website !== undefined) updates.website = body.website;
  if (body.timezone !== undefined) updates.timezone = body.timezone;
  if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url;

  // Sending defaults
  if (body.default_from_name !== undefined) updates.default_from_name = body.default_from_name;
  if (body.daily_limit !== undefined) updates.daily_limit = Number(body.daily_limit);
  if (body.min_delay !== undefined) updates.min_delay = Number(body.min_delay);
  if (body.from_hour !== undefined) updates.from_hour = body.from_hour;
  if (body.to_hour !== undefined) updates.to_hour = body.to_hour;
  if (body.active_days !== undefined) updates.active_days = body.active_days;

  // Notification prefs
  if (body.notif_new_reply !== undefined) updates.notif_new_reply = body.notif_new_reply;
  if (body.notif_campaign_complete !== undefined) updates.notif_campaign_complete = body.notif_campaign_complete;
  if (body.notif_warmup_alert !== undefined) updates.notif_warmup_alert = body.notif_warmup_alert;
  if (body.notif_lead_open !== undefined) updates.notif_lead_open = body.notif_lead_open;
  if (body.notif_weekly_report !== undefined) updates.notif_weekly_report = body.notif_weekly_report;
  if (body.notif_unsubscribe !== undefined) updates.notif_unsubscribe = body.notif_unsubscribe;

  if (!Object.keys(updates).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.full_name) {
    await supabase.auth.updateUser({ data: { full_name: body.full_name } });
  }

  return NextResponse.json({ ...data, email: user.email });
}

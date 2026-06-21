import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `tickets/${user.id}/${Date.now()}-${safeName}`;
  const bytes = await file.arrayBuffer();

  // Auto-create bucket if it doesn't exist (service role bypasses RLS)
  await supabaseAdmin.storage.createBucket('support-attachments', { public: true }).catch(() => {});

  const { error } = await supabaseAdmin.storage
    .from('support-attachments')
    .upload(path, bytes, { contentType: file.type || 'application/octet-stream' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: urlData } = supabaseAdmin.storage
    .from('support-attachments')
    .getPublicUrl(path);

  return NextResponse.json({ name: file.name, url: urlData.publicUrl });
}

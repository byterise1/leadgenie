import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('avatar') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: 'Max 2 MB' }, { status: 400 });
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Must be an image' }, { status: 400 });

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${user.id}.${ext}`;
  const bytes = await file.arrayBuffer();

  // Create bucket if it doesn't exist
  await supabaseAdmin.storage.createBucket('avatars', { public: true }).catch(() => {});

  const { error: upErr } = await supabaseAdmin.storage
    .from('avatars')
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: { publicUrl } } = supabaseAdmin.storage.from('avatars').getPublicUrl(path);

  // Cache-bust the URL so the browser always reloads the new image
  const avatarUrl = `${publicUrl}?v=${Date.now()}`;

  await supabaseAdmin.from('profiles').upsert(
    { id: user.id, avatar_url: avatarUrl },
    { onConflict: 'id' }
  );

  return NextResponse.json({ avatar_url: avatarUrl });
}

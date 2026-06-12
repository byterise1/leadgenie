import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = req.nextUrl.searchParams.get('url') || '';

  // Only record the first click
  if (id) {
    await supabaseAdmin
      .from('sent_emails')
      .update({ clicked_at: new Date().toISOString() })
      .eq('id', id)
      .is('clicked_at', null);
  }

  // Redirect to the original URL (or home if missing/invalid)
  const destination = url.startsWith('http') ? url : '/';
  return NextResponse.redirect(destination, { status: 302 });
}

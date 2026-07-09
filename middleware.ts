import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Railway terminates TLS at its edge and forwards internally over plain
  // http, so request.nextUrl.protocol is always "http" here - check the
  // forwarded header instead. Redirects any http:// visitor to https://
  // before anything else runs (auth, OAuth routes, etc.).
  if (
    process.env.NODE_ENV === 'production' &&
    request.headers.get('x-forwarded-proto') === 'http'
  ) {
    const url = request.nextUrl.clone();
    url.protocol = 'https:';
    return NextResponse.redirect(url, 308);
  }

  const path = request.nextUrl.pathname;
  const needsAuthCheck =
    path.startsWith('/dashboard') || path.startsWith('/admin') || path === '/login' || path === '/signup';
  if (!needsAuthCheck) return NextResponse.next();

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protect dashboard routes
  if (path.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Protect admin routes
  if (path.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Use service role to bypass RLS — anon key can silently fail in Edge middleware
    const supabaseService = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );
    const { data: profile } = await supabaseService
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    if (!profile?.is_admin) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  if ((path === '/login' || path === '/signup') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

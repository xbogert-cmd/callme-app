import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  // Start with a pass-through response; setAll may replace it to forward refreshed tokens.
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
          // Write refreshed tokens back to both the request and the response.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not add code between createServerClient and getUser —
  // it would interfere with the token refresh flow.
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Unauthenticated → send to login
  if (!user && pathname !== '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Already authenticated → send away from login
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Return supabaseResponse (not a plain NextResponse.next()) so refreshed
  // session cookies are forwarded to the browser.
  return supabaseResponse;
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals, static assets, API routes,
    // and the auth callback route (which handles its own session exchange).
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/|auth/).*)',
  ],
};

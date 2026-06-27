import { NextResponse, type NextRequest } from 'next/server';
import { flags } from '@/lib/env';
import { auth0 } from '@/lib/auth0';

/**
 * Auth0 proxy layer (Next.js 16 renamed `middleware` to `proxy`).
 * Auto-mounts the `/auth/*` routes: /auth/login, /auth/logout, /auth/callback,
 * /auth/profile, /auth/access-token, /auth/backchannel-logout.
 *
 * In MOCK mode (Auth0 unconfigured) it passes through so the app runs
 * end-to-end with zero env keys.
 */
export async function proxy(request: NextRequest) {
  if (!flags.hasAuth0) return NextResponse.next();

  // Always return the auth response (it forwards to your app routes by default).
  return auth0.middleware(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};

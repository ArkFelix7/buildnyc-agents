import { NextResponse, type NextRequest } from 'next/server';
import { flags } from '@/lib/env';
import { auth0 } from '@/lib/auth0';

/**
 * Auto-mounts the Auth0 `/auth/*` routes. In MOCK mode (Auth0 unconfigured) the
 * middleware passes through so the app runs end-to-end with zero env keys.
 */
export async function middleware(request: NextRequest) {
  if (!flags.hasAuth0) return NextResponse.next();
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

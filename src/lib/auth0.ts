import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { env } from './env';

/**
 * Singleton Auth0 v4 server client. Mounts `/auth/login`, `/auth/logout`,
 * `/auth/callback` etc. via the middleware (see src/middleware.ts).
 *
 * In MOCK mode (no Auth0 env) this is still constructed but never exercised —
 * the middleware short-circuits and `getSession()` guards on `flags.hasAuth0`.
 * The client secret is read from AUTH0_CLIENT_SECRET per env.ts conventions.
 */
export const auth0 = new Auth0Client({
  domain: env.auth0Domain,
  clientId: env.auth0ClientId,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  appBaseUrl: env.appUrl,
  secret: env.auth0Secret,
});

import 'server-only';
import type { SessionData } from '@auth0/nextjs-auth0/types';
import { auth0 } from './auth0';
import { flags, MOCK_MODE } from './env';
import { supabaseAdmin } from './supabase';
import type { Profile } from './types';

/**
 * Current Auth0 session, or null when Auth0 is unconfigured (mock mode).
 * Safe to call from server components and route handlers.
 */
export async function getSession(): Promise<SessionData | null> {
  if (!flags.hasAuth0) return null;
  return auth0.getSession();
}

/**
 * Lightweight identity for the signed-in user (no DB lookup).
 * Returns null when Auth0 is unconfigured (mock) or there's no session.
 */
export async function getSessionUser(): Promise<{
  auth0Id: string;
  email: string;
  name: string;
} | null> {
  const session = await getSession();
  const user = session?.user;
  if (!user?.sub) return null;
  return {
    auth0Id: user.sub,
    email: (user.email as string) ?? `${user.sub}@demo.dev`,
    name: (user.name as string) ?? (user.nickname as string) ?? 'Guest',
  };
}

/**
 * Resolve the signed-in user's profile row for a specific event.
 * Returns null when there's no session, no Supabase (MOCK_MODE), or no row yet.
 * Never throws — safe to call anywhere on the server.
 */
export async function getCurrentProfile(eventId: string): Promise<Profile | null> {
  if (MOCK_MODE) return null;

  const session = await getSession();
  const sub = session?.user?.sub;
  if (!sub) return null;

  const db = supabaseAdmin();
  if (!db) return null;

  const { data, error } = await db
    .from('profiles')
    .select('*')
    .eq('auth0_id', sub)
    .eq('event_id', eventId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Profile;
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, flags } from './env';

/**
 * Server-side admin client (service role) — bypasses RLS. Use for agent writes,
 * matching, seeding. NEVER import this into client components.
 *
 * Returns null in MOCK_MODE so callers fall back to seed data.
 */
let _admin: SupabaseClient | null = null;
export function supabaseAdmin(): SupabaseClient | null {
  if (!flags.hasSupabase) return null;
  if (!_admin) {
    _admin = createClient(env.supabaseUrl!, env.supabaseServiceKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _admin;
}

/** Anon client config for the browser (Realtime + RLS-guarded reads). */
export function supabasePublicConfig() {
  if (!flags.hasSupabasePublic) return null;
  return { url: env.supabaseUrl!, anonKey: env.supabaseAnonKey! };
}

import { supabaseAdmin } from './supabase';
import { MOCK_MODE } from './env';
import type { Event } from './types';

/**
 * Event access layer. Events are the top-level tenant; everything else scopes to
 * an event via event_id. Slug-routed at /{slug}.
 *
 * MOCK fallback: returns the seed `buildnyc26` event so the app runs with no DB.
 */

export const SLUG_RE = /^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$/;

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

const MOCK_EVENT: Event = {
  id: 'e0000000-0000-4000-a000-000000000001',
  slug: 'buildnyc26',
  name: 'Built in NYC',
  tagline: 'Your AI agent networks the room. You just show up.',
  description: 'A one-day AI hackathon in NYC.',
  starts_at: null,
  ends_at: null,
  organizer_auth0_id: 'seed|organizer',
  organizer_email: 'organizer@buildnyc.dev',
  admin_passcode: 'shipnyc',
  theme_color: '#6d5efc',
  matching_enabled: true,
  created_at: '2026-06-27T12:00:00Z',
};

export async function getEventBySlug(slug: string): Promise<Event | null> {
  const admin = supabaseAdmin();
  if (!admin) return slug === MOCK_EVENT.slug ? MOCK_EVENT : null;
  const { data } = await admin.from('events').select('*').eq('slug', slug).maybeSingle();
  return (data as Event) ?? null;
}

export async function getEventById(id: string): Promise<Event | null> {
  const admin = supabaseAdmin();
  if (!admin) return id === MOCK_EVENT.id ? MOCK_EVENT : null;
  const { data } = await admin.from('events').select('*').eq('id', id).maybeSingle();
  return (data as Event) ?? null;
}

export async function listEventsByOwner(auth0Id: string): Promise<Event[]> {
  const admin = supabaseAdmin();
  if (!admin) return [MOCK_EVENT];
  const { data } = await admin
    .from('events')
    .select('*')
    .eq('organizer_auth0_id', auth0Id)
    .order('created_at', { ascending: false });
  return (data as Event[]) ?? [];
}

export interface CreateEventInput {
  slug: string;
  name: string;
  tagline?: string;
  description?: string;
  organizer_auth0_id: string;
  organizer_email: string;
  admin_passcode?: string;
  theme_color?: string;
  matching_enabled?: boolean;
}

/** Returns { event } on success or { error } (e.g. slug taken). */
export async function createEvent(
  input: CreateEventInput,
): Promise<{ event?: Event; error?: string }> {
  if (!SLUG_RE.test(input.slug)) return { error: 'Invalid slug (3–40 chars, a–z 0–9 -).' };
  const admin = supabaseAdmin();
  if (!admin) return { error: 'Database not configured.' };
  const existing = await getEventBySlug(input.slug);
  if (existing) return { error: 'That URL is taken — pick another slug.' };
  const { data, error } = await admin
    .from('events')
    .insert({
      slug: input.slug,
      name: input.name,
      tagline: input.tagline ?? null,
      description: input.description ?? null,
      organizer_auth0_id: input.organizer_auth0_id,
      organizer_email: input.organizer_email,
      admin_passcode: input.admin_passcode ?? null,
      theme_color: input.theme_color ?? '#6d5efc',
      matching_enabled: input.matching_enabled ?? true,
    })
    .select('*')
    .single();
  if (error || !data) return { error: error?.message ?? 'Failed to create event.' };
  return { event: data as Event };
}

/** Admin = the Auth0 creator OR a request carrying the correct event passcode. */
export function isEventAdmin(
  event: Event,
  opts: { auth0Id?: string | null; passcode?: string | null },
): boolean {
  if (opts.auth0Id && opts.auth0Id === event.organizer_auth0_id) return true;
  if (event.admin_passcode && opts.passcode && opts.passcode === event.admin_passcode) return true;
  // In MOCK mode (no DB), allow admin so the dashboard is explorable.
  return MOCK_MODE;
}

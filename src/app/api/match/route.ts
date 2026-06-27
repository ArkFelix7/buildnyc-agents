import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runMatchesForProfile } from '@/lib/matching';
import { supabaseAdmin } from '@/lib/supabase';
import { getEventBySlug } from '@/lib/events';
import { BRAND } from '@/lib/constants';

export const maxDuration = 60;

const BodySchema = z.object({
  profileId: z.string().min(1),
  eventSlug: z.string().optional(),
});

/**
 * POST /api/match — run matching for a profile within its event.
 * Body: { profileId, eventSlug? }. Resolves the event from eventSlug, else from
 * the profile's own event_id. Returns { ok, conversations }.
 */
export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'profileId is required' }, { status: 400 });
  }
  const { profileId, eventSlug } = parsed.data;

  // Resolve event id.
  let eventId: string | null = null;
  if (eventSlug) {
    const ev = await getEventBySlug(eventSlug);
    eventId = ev?.id ?? null;
  } else {
    const db = supabaseAdmin();
    if (db) {
      const { data } = await db.from('profiles').select('event_id').eq('id', profileId).maybeSingle();
      eventId = (data?.event_id as string) ?? null;
    }
  }
  // MOCK fallback: default to the seed event.
  if (!eventId) {
    const ev = await getEventBySlug(BRAND.defaultEventSlug);
    eventId = ev?.id ?? 'e0000000-0000-4000-a000-000000000001';
  }

  try {
    const conversations = await runMatchesForProfile(profileId, eventId);
    return NextResponse.json({ ok: true, conversations });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Matching failed' },
      { status: 500 },
    );
  }
}

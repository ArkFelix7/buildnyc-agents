import { NextResponse } from 'next/server';
import { seedKnowledge } from '@/lib/concierge';
import { getEventBySlug } from '@/lib/events';
import { BRAND } from '@/lib/constants';

export const maxDuration = 60;

/**
 * POST /api/seed-knowledge — embed db/knowledge.json into an event's knowledge base.
 * Body: { eventSlug? } (defaults to the seed event). Idempotent per source+event.
 */
export async function POST(request: Request) {
  let slug = BRAND.defaultEventSlug;
  try {
    const body = await request.json();
    if (body?.eventSlug) slug = body.eventSlug;
  } catch {
    /* no body → default event */
  }

  const event = await getEventBySlug(slug);
  const eventId = event?.id ?? 'e0000000-0000-4000-a000-000000000001';

  try {
    const { inserted } = await seedKnowledge(eventId);
    return NextResponse.json({ ok: true, inserted });
  } catch (err) {
    console.error('[seed-knowledge] failed:', err);
    return NextResponse.json({ ok: false, error: 'Seeding failed' }, { status: 500 });
  }
}

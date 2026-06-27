import { NextResponse } from 'next/server';
import { z } from 'zod';
import { escalate } from '@/lib/concierge';
import { getEventBySlug } from '@/lib/events';
import { BRAND } from '@/lib/constants';

export const maxDuration = 30;

/**
 * POST /api/escalate — manually escalate a question to the event organizer.
 * Body: { question, eventSlug?, profileId? } → { ok, escalationId }.
 */
const BodySchema = z.object({
  question: z.string().min(1).max(1000),
  eventSlug: z.string().optional(),
  profileId: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'question is required' }, { status: 400 });
  }
  const { question, eventSlug, profileId } = parsed.data;

  const event = await getEventBySlug(eventSlug ?? BRAND.defaultEventSlug);
  const eventId = event?.id ?? 'e0000000-0000-4000-a000-000000000001';

  try {
    const { escalationId } = await escalate({ question, eventId, profileId });
    return NextResponse.json({ ok: true, escalationId });
  } catch (err) {
    console.error('[escalate] failed:', err);
    return NextResponse.json({ ok: false, error: 'Escalation failed' }, { status: 500 });
  }
}

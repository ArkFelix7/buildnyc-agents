import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { getEventBySlug, isEventAdmin } from '@/lib/events';
import { getSessionUser } from '@/lib/session';
import { addKnowledge } from '@/lib/concierge';

export const maxDuration = 60;

/** GET /api/events/[slug]/knowledge — list this event's knowledge chunks. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ chunks: [] });

  const { data } = await db
    .from('knowledge_base')
    .select('id, content, source, created_at')
    .eq('event_id', event.id)
    .order('created_at', { ascending: false })
    .limit(200);

  return NextResponse.json({ chunks: data ?? [] });
}

const PostSchema = z.object({
  content: z.string().min(1).max(50_000),
  source: z.string().max(80).optional(),
  passcode: z.string().optional(),
});

/** POST /api/events/[slug]/knowledge — admin pastes content; chunk + embed + store. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return NextResponse.json({ ok: false, error: 'Event not found' }, { status: 404 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = PostSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'content is required' }, { status: 400 });
  }

  const user = await getSessionUser();
  if (!isEventAdmin(event, { auth0Id: user?.auth0Id, passcode: parsed.data.passcode })) {
    return NextResponse.json({ ok: false, error: 'Not authorized' }, { status: 403 });
  }

  try {
    const { inserted } = await addKnowledge(
      event.id,
      parsed.data.content,
      parsed.data.source ?? 'organizer-paste',
    );
    return NextResponse.json({ ok: true, inserted });
  } catch (err) {
    console.error('[knowledge] add failed:', err);
    return NextResponse.json({ ok: false, error: 'Failed to add knowledge' }, { status: 500 });
  }
}

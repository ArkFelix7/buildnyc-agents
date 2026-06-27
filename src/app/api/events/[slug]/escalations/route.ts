import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getEventBySlug } from '@/lib/events';

export const maxDuration = 30;

/** GET /api/events/[slug]/escalations — list this event's escalations (admin inbox). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ escalations: [] });

  const { data } = await db
    .from('escalations')
    .select('id, question, answer, status, created_at, answered_at')
    .eq('event_id', event.id)
    .order('created_at', { ascending: false })
    .limit(100);

  return NextResponse.json({ escalations: data ?? [] });
}

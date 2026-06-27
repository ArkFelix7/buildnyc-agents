import { NextResponse } from 'next/server';
import { getEventBySlug } from '@/lib/events';

export const dynamic = 'force-dynamic';

/**
 * GET /api/events/[slug] — event metadata, or 404.
 * Next 16 route params are async.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }
  return NextResponse.json({ event });
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { escalate } from '@/lib/concierge';

export const maxDuration = 30;

/**
 * POST /api/escalate — manually escalate a question to the organizer.
 * Body: { question: string, profileId?: string } → { ok, escalationId }.
 */
const BodySchema = z.object({
  question: z.string().min(1).max(1000),
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

  try {
    const { escalationId } = await escalate(parsed.data);
    return NextResponse.json({ ok: true, escalationId });
  } catch (err) {
    console.error('[escalate] failed:', err);
    return NextResponse.json({ ok: false, error: 'Escalation failed' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runMatchesForProfile } from '@/lib/matching';

export const maxDuration = 60;

const BodySchema = z.object({
  profileId: z.string().min(1),
});

/**
 * POST /api/match — run matching for a profile: find candidates, score them,
 * create conversations, and kick off agent-to-agent dialogues.
 * Body: { profileId }. Returns { ok, conversations }.
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
    return NextResponse.json(
      { ok: false, error: 'profileId is required' },
      { status: 400 },
    );
  }

  try {
    const conversations = await runMatchesForProfile(parsed.data.profileId);
    return NextResponse.json({ ok: true, conversations });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Matching failed' },
      { status: 500 },
    );
  }
}

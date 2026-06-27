import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { seedProfileById } from '@/lib/mock-data';
import { sendMatchIntro } from '@/lib/email';
import { getEventBySlug } from '@/lib/events';
import { generateMatchCode } from '@/lib/match-code';
import type { Profile } from '@/lib/types';

export const maxDuration = 30;

const BodySchema = z.object({
  fromProfileId: z.string().min(1),
  toProfileId: z.string().min(1),
  eventSlug: z.string().optional(),
});

/**
 * POST /api/smash — record a "like" from one attendee to another.
 * On a mutual match, generate a shared match code, mark both rows mutual, store
 * the code, and email both people (each with the other's details + the code).
 * MOCK: a seed target always matches so the demo lights up.
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
      { ok: false, error: 'fromProfileId and toProfileId are required' },
      { status: 400 },
    );
  }
  const { fromProfileId, toProfileId, eventSlug } = parsed.data;

  if (fromProfileId === toProfileId) {
    return NextResponse.json({ ok: false, error: 'Cannot smash yourself' }, { status: 400 });
  }

  const event = eventSlug ? await getEventBySlug(eventSlug) : null;
  const eventName = event?.name ?? 'Orbit';
  const db = supabaseAdmin();

  // ── MOCK MODE ──────────────────────────────────────────────────────────────
  if (!db) {
    const target = seedProfileById(toProfileId);
    const mutual = Boolean(target);
    let matchCode: string | null = null;
    if (mutual && target) {
      matchCode = generateMatchCode();
      const me =
        seedProfileById(fromProfileId) ??
        ({ id: fromProfileId, name: 'You', email: 'you@demo.dev', role: null, bio: null, looking_for: null } as Profile);
      await sendMatchIntro(me, target, { matchCode, eventName });
    }
    return NextResponse.json({ ok: true, mutual, matchCode, mock: true });
  }

  // ── LIVE MODE ────────────────────────────────────────────────────────────────
  try {
    const { error: upsertError } = await db
      .from('matches')
      .upsert(
        { from_profile: fromProfileId, to_profile: toProfileId, event_id: event?.id ?? null },
        { onConflict: 'from_profile,to_profile', ignoreDuplicates: true },
      );
    if (upsertError) throw upsertError;

    const { data: reverse, error: reverseError } = await db
      .from('matches')
      .select('id, match_code')
      .eq('from_profile', toProfileId)
      .eq('to_profile', fromProfileId)
      .maybeSingle();
    if (reverseError) throw reverseError;

    if (!reverse) {
      return NextResponse.json({ ok: true, mutual: false });
    }

    // Mutual! Reuse an existing code if one was already assigned, else mint one.
    const matchCode = (reverse.match_code as string | null) ?? generateMatchCode();
    const pairFilter = `and(from_profile.eq.${fromProfileId},to_profile.eq.${toProfileId}),and(from_profile.eq.${toProfileId},to_profile.eq.${fromProfileId})`;

    const { error: mutualError } = await db
      .from('matches')
      .update({ mutual: true, match_code: matchCode })
      .or(pairFilter);
    if (mutualError) throw mutualError;

    const { data: profiles, error: profilesError } = await db
      .from('profiles')
      .select('*')
      .in('id', [fromProfileId, toProfileId]);
    if (profilesError) throw profilesError;

    const a = profiles?.find((p) => p.id === fromProfileId) as Profile | undefined;
    const b = profiles?.find((p) => p.id === toProfileId) as Profile | undefined;

    if (a && b) {
      const result = await sendMatchIntro(a, b, { matchCode, eventName });
      if (result.ok) {
        await db.from('matches').update({ email_sent: true }).or(pairFilter);
      }
    }

    return NextResponse.json({ ok: true, mutual: true, matchCode });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Smash failed' },
      { status: 500 },
    );
  }
}

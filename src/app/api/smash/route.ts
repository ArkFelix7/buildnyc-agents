import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { seedProfileById } from '@/lib/mock-data';
import { sendMatchIntro } from '@/lib/email';
import type { Profile } from '@/lib/types';

export const maxDuration = 30;

const BodySchema = z.object({
  fromProfileId: z.string().min(1),
  toProfileId: z.string().min(1),
});

/**
 * POST /api/smash — record a "like" from one attendee to another.
 * Body: { fromProfileId, toProfileId }.
 *
 * If the target has already liked the sender, it's a mutual match: both rows are
 * marked mutual, both profiles are loaded, and intro emails fire to each.
 *
 * MOCK mode (no Supabase): treat the like as mutual when the target is a seed
 * profile so the demo "smash" always lights up. Logs the would-be email.
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

  const { fromProfileId, toProfileId } = parsed.data;

  if (fromProfileId === toProfileId) {
    return NextResponse.json(
      { ok: false, error: 'Cannot smash yourself' },
      { status: 400 },
    );
  }

  const db = supabaseAdmin();

  // ── MOCK MODE ──────────────────────────────────────────────────────────────
  if (!db) {
    const target = seedProfileById(toProfileId);
    const mutual = Boolean(target); // demo-friendly: a seed target always matches
    if (mutual && target) {
      const me = seedProfileById(fromProfileId) ?? {
        id: fromProfileId,
        name: 'You',
        email: 'you@buildnyc.dev',
        role: null,
        bio: null,
        looking_for: null,
      } as Profile;
      // Log the would-be email (sendMatchIntro itself also logs in mock).
      await sendMatchIntro(me, target);
    }
    return NextResponse.json({ ok: true, mutual, mock: true });
  }

  // ── LIVE MODE ────────────────────────────────────────────────────────────────
  try {
    // Record the like (idempotent on the unique (from, to) pair).
    const { error: upsertError } = await db
      .from('matches')
      .upsert(
        { from_profile: fromProfileId, to_profile: toProfileId },
        { onConflict: 'from_profile,to_profile', ignoreDuplicates: true },
      );
    if (upsertError) throw upsertError;

    // Does the reverse like already exist?
    const { data: reverse, error: reverseError } = await db
      .from('matches')
      .select('id')
      .eq('from_profile', toProfileId)
      .eq('to_profile', fromProfileId)
      .maybeSingle();
    if (reverseError) throw reverseError;

    if (!reverse) {
      return NextResponse.json({ ok: true, mutual: false });
    }

    // Mutual! Mark both directions mutual.
    const { error: mutualError } = await db
      .from('matches')
      .update({ mutual: true })
      .or(
        `and(from_profile.eq.${fromProfileId},to_profile.eq.${toProfileId}),and(from_profile.eq.${toProfileId},to_profile.eq.${fromProfileId})`,
      );
    if (mutualError) throw mutualError;

    // Load both profiles and send intros.
    const { data: profiles, error: profilesError } = await db
      .from('profiles')
      .select('*')
      .in('id', [fromProfileId, toProfileId]);
    if (profilesError) throw profilesError;

    const a = profiles?.find((p) => p.id === fromProfileId) as Profile | undefined;
    const b = profiles?.find((p) => p.id === toProfileId) as Profile | undefined;

    if (a && b) {
      const result = await sendMatchIntro(a, b);
      if (result.ok) {
        await db
          .from('matches')
          .update({ email_sent: true })
          .or(
            `and(from_profile.eq.${fromProfileId},to_profile.eq.${toProfileId}),and(from_profile.eq.${toProfileId},to_profile.eq.${fromProfileId})`,
          );
      }
    }

    return NextResponse.json({ ok: true, mutual: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Smash failed' },
      { status: 500 },
    );
  }
}

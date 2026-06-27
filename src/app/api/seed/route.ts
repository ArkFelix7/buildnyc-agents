import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { embedText, toVectorLiteral } from '@/lib/ai';
import { generatePersona } from '@/lib/persona';
import { runMatchesForProfile } from '@/lib/matching';
import { SEED_PROFILES } from '@/lib/mock-data';
import { getEventBySlug } from '@/lib/events';
import { BRAND } from '@/lib/constants';
import type { Profile } from '@/lib/types';

// Embedding 8 profiles + persona generation + match pre-warm can take a while
// on live keys; give it headroom.
export const maxDuration = 120;

/** Build the text we embed for matching: role | skills | looking for | bio. */
function profileEmbeddingText(p: Profile): string {
  const skills = (p.skills ?? []).join(', ');
  return [
    p.role ?? 'builder',
    skills && `skills: ${skills}`,
    p.looking_for && `looking for: ${p.looking_for}`,
    p.bio,
  ]
    .filter(Boolean)
    .join(' | ');
}

/**
 * POST /api/seed — load the 8 demo builders into Supabase: embed → upsert →
 * generate persona, then pre-warm a couple of conversations so Mission Control
 * has live content. In MOCK mode (no Supabase) this is a no-op — the in-memory
 * SEED_PROFILES already power the UI.
 */
export async function POST() {
  const db = supabaseAdmin();
  if (!db) {
    return NextResponse.json({ ok: true, mock: true, seeded: 0, prewarmed: 0 });
  }

  const event = await getEventBySlug(BRAND.defaultEventSlug);
  const eventId = event?.id ?? 'e0000000-0000-4000-a000-000000000001';

  let seeded = 0;
  const errors: { profile: string; error: string }[] = [];

  for (const profile of SEED_PROFILES) {
    try {
      const vec = await embedText(profileEmbeddingText(profile));
      const { error } = await db
        .from('profiles')
        .upsert(
          {
            event_id: eventId,
            auth0_id: profile.auth0_id,
            name: profile.name,
            email: profile.email,
            role: profile.role,
            skills: profile.skills,
            looking_for: profile.looking_for,
            bio: profile.bio,
            embedding: toVectorLiteral(vec),
          },
          { onConflict: 'event_id,auth0_id' },
        );
      if (error) throw new Error(error.message);

      // Persona persists to profiles.agent_instructions internally.
      await generatePersona(profile);
      seeded += 1;
    } catch (err) {
      errors.push({
        profile: profile.name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Pre-warm a few conversations so the demo screen isn't empty. We resolve the
  // real DB ids (upsert may have assigned fresh uuids) by auth0_id, then run
  // matching for 3 of them. Best-effort: never fail the seed on this.
  let prewarmed = 0;
  try {
    const warmFor = SEED_PROFILES.slice(0, 3).map((p) => p.auth0_id);
    const { data: rows } = await db
      .from('profiles')
      .select('id, auth0_id')
      .in('auth0_id', warmFor);
    for (const row of rows ?? []) {
      try {
        const convos = await runMatchesForProfile(row.id as string, eventId);
        prewarmed += convos.length;
      } catch {
        // ignore per-profile match failures
      }
    }
  } catch {
    // ignore pre-warm failures entirely
  }

  return NextResponse.json({
    ok: errors.length === 0,
    seeded,
    prewarmed,
    ...(errors.length > 0 ? { errors } : {}),
  });
}

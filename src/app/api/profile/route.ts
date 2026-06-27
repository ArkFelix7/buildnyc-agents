import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth0 } from '@/lib/auth0';
import { flags } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabase';
import { embedText, toVectorLiteral } from '@/lib/ai';
import { getEventBySlug } from '@/lib/events';
import type { Profile, Role } from '@/lib/types';
import { ROLE_LABELS } from '@/lib/types';
import { generatePersona } from '@/lib/persona';
import { runMatchesForProfile } from '@/lib/matching';

export const maxDuration = 60;

const ROLES = Object.keys(ROLE_LABELS) as [Role, ...Role[]];

const BodySchema = z.object({
  eventSlug: z.string().min(1),
  name: z.string().min(1).max(80),
  email: z.string().email().optional(),
  avatar_style: z.string().max(40).optional(),
  avatar_seed: z.string().max(40).optional(),
  wants_matching: z.boolean().default(true),
  role: z.enum(ROLES).nullable().optional(),
  skills: z.array(z.string().min(1).max(40)).max(20).default([]),
  looking_for: z.string().max(200).optional().default(''),
  bio: z.string().max(300).optional().default(''),
});

/**
 * POST /api/profile — create/update the signed-in user's profile FOR AN EVENT.
 * Embeds + generates an agent persona + kicks off matching only when the user
 * opted into matching. Degrades to a fabricated mock profile with no DB.
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
      { ok: false, error: 'Invalid profile', issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }
  const b = parsed.data;

  const event = await getEventBySlug(b.eventSlug);
  if (!event) {
    return NextResponse.json({ ok: false, error: 'Event not found' }, { status: 404 });
  }
  const wantsMatching = b.wants_matching && event.matching_enabled;

  // (a) Identity from session, or fabricate in mock mode.
  let auth0_id: string;
  let email: string;
  if (flags.hasAuth0) {
    const session = await auth0.getSession();
    const user = session?.user;
    if (!user?.sub) {
      return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
    }
    auth0_id = user.sub;
    email = b.email ?? user.email ?? `${user.sub}@demo.dev`;
  } else {
    auth0_id = `mock|${b.name}`;
    email = b.email ?? `${b.name.replace(/\s+/g, '.').toLowerCase()}@demo.dev`;
  }

  const db = supabaseAdmin();

  // (b) MOCK fallback — fabricate a Profile so the UI flow works with no DB.
  if (!db) {
    const profile: Profile = {
      id: crypto.randomUUID(),
      event_id: event.id,
      auth0_id,
      name: b.name,
      email,
      role: b.role ?? null,
      skills: b.skills,
      looking_for: b.looking_for || null,
      bio: b.bio || null,
      agent_instructions: null,
      avatar_style: b.avatar_style ?? null,
      avatar_seed: b.avatar_seed ?? null,
      wants_matching: wantsMatching,
      open_to_connect: true,
      avatar_url: null,
      created_at: new Date().toISOString(),
    };
    return NextResponse.json({ ok: true, mock: true, profile });
  }

  // (c) Embedding only when the user wants matching.
  let embedding: string | null = null;
  if (wantsMatching) {
    const roleLabel = b.role ? ROLE_LABELS[b.role] : 'other';
    const input = `${roleLabel} | skills: ${b.skills.join(', ')} | looking for: ${b.looking_for} | ${b.bio}`;
    embedding = toVectorLiteral(await embedText(input));
  }

  // (d) Upsert (conflict on event_id + auth0_id).
  const { data, error } = await db
    .from('profiles')
    .upsert(
      {
        event_id: event.id,
        auth0_id,
        name: b.name,
        email,
        role: b.role ?? null,
        skills: b.skills,
        looking_for: b.looking_for || null,
        bio: b.bio || null,
        avatar_style: b.avatar_style ?? null,
        avatar_seed: b.avatar_seed ?? null,
        wants_matching: wantsMatching,
        embedding,
      },
      { onConflict: 'event_id,auth0_id' },
    )
    .select('*')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? 'Failed to save profile' },
      { status: 500 },
    );
  }
  const profile = data as Profile;

  // (e) Persona + matching only when opted in. Failures must not lose the profile.
  if (wantsMatching) {
    try {
      await generatePersona(profile);
      await runMatchesForProfile(profile.id, event.id);
    } catch (err) {
      console.error('[api/profile] persona/match failed (profile still saved):', err);
    }
  }

  return NextResponse.json({ ok: true, profile });
}

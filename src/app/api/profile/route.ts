import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth0 } from '@/lib/auth0';
import { flags, MOCK_MODE } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabase';
import { embedText, toVectorLiteral } from '@/lib/ai';
import type { Profile, Role } from '@/lib/types';
import { ROLE_LABELS } from '@/lib/types';
// Agent B modules — may not exist while this is built; they resolve at integration.
import { generatePersona } from '@/lib/persona';
import { runMatchesForProfile } from '@/lib/matching';

const ROLES = Object.keys(ROLE_LABELS) as [Role, ...Role[]];

const BodySchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email().optional(),
  role: z.enum(ROLES).nullable().optional(),
  skills: z.array(z.string().min(1).max(40)).max(20).default([]),
  looking_for: z.string().max(200).optional().default(''),
  bio: z.string().max(300).optional().default(''),
});

/**
 * POST /api/profile — create or update the signed-in user's profile, embed it,
 * generate an agent persona, and kick off matching. Degrades gracefully to a
 * fabricated mock profile when Supabase/Auth0 are unconfigured.
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
  const { name, role, skills, looking_for, bio } = parsed.data;

  // (a) Resolve identity from session, or fabricate in mock mode.
  let auth0_id: string;
  let email: string;
  if (flags.hasAuth0) {
    const session = await auth0.getSession();
    const user = session?.user;
    if (!user?.sub) {
      return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
    }
    auth0_id = user.sub;
    email = parsed.data.email ?? user.email ?? `${user.sub}@demo.dev`;
  } else {
    auth0_id = `mock|${name}`;
    email = parsed.data.email ?? `${name.replace(/\s+/g, '.').toLowerCase()}@demo.dev`;
  }

  // (b) Build embedding input + vector.
  const roleLabel = role ? ROLE_LABELS[role] : 'other';
  const input = `${roleLabel} | skills: ${skills.join(', ')} | looking for: ${looking_for} | ${bio}`;
  const vec = await embedText(input);

  const db = supabaseAdmin();

  // (c) MOCK fallback — fabricate a Profile so the UI flow works with no DB.
  if (!db || MOCK_MODE) {
    const profile: Profile = {
      id: crypto.randomUUID(),
      auth0_id,
      name,
      email,
      role: role ?? null,
      skills,
      looking_for: looking_for || null,
      bio: bio || null,
      agent_instructions: null,
      avatar_url: null,
      created_at: new Date().toISOString(),
    };
    return NextResponse.json({ ok: true, mock: true, profile });
  }

  // (d) Upsert the profile (conflict on auth0_id) and read back the row.
  const { data, error } = await db
    .from('profiles')
    .upsert(
      {
        auth0_id,
        name,
        email,
        role,
        skills,
        looking_for: looking_for || null,
        bio: bio || null,
        embedding: toVectorLiteral(vec),
      },
      { onConflict: 'auth0_id' },
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

  // (e) Persona generation + matching. Failures here must not lose the saved profile.
  try {
    await generatePersona(profile);
    await runMatchesForProfile(profile.id);
  } catch (err) {
    console.error('[api/profile] persona/match failed (profile still saved):', err);
  }

  // (f)
  return NextResponse.json({ ok: true, profile });
}

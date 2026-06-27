import { NextResponse } from 'next/server';
import { z } from 'zod';
import { MOCK_MODE } from '@/lib/env';
import { createEvent, slugify, SLUG_RE } from '@/lib/events';
import { getSessionUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  name: z.string().min(1).max(80),
  slug: z
    .string()
    .min(3)
    .max(40)
    .regex(SLUG_RE, 'Slug must be 3–40 chars: a–z, 0–9, hyphens.')
    .optional(),
  tagline: z.string().max(160).optional(),
  description: z.string().max(2000).optional(),
  organizer_email: z.string().email().optional(),
  admin_passcode: z.string().max(80).optional(),
  theme_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex color like #6d5efc.')
    .optional(),
  matching_enabled: z.boolean().optional(),
});

/**
 * POST /api/events — create an event owned by the signed-in user.
 *
 * Identity resolves from `getSessionUser()` (401 if absent, unless MOCK_MODE
 * fabricates one). Returns { ok, event } on success, or { ok:false, error }.
 * Slug-taken / mock-no-DB errors return 409.
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
      { ok: false, error: 'Invalid event', issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }
  const body = parsed.data;

  // Resolve organizer identity.
  const user = await getSessionUser();
  let organizer_auth0_id: string;
  let organizer_email: string;
  if (user) {
    organizer_auth0_id = user.auth0Id;
    organizer_email = body.organizer_email ?? user.email;
  } else if (MOCK_MODE) {
    organizer_auth0_id = 'mock|organizer';
    organizer_email = body.organizer_email ?? 'organizer@demo.dev';
  } else {
    return NextResponse.json(
      { ok: false, error: 'Sign in to create an event.' },
      { status: 401 },
    );
  }

  const slug = (body.slug ?? slugify(body.name)).trim();

  const { event, error } = await createEvent({
    slug,
    name: body.name,
    tagline: body.tagline,
    description: body.description,
    organizer_auth0_id,
    organizer_email,
    admin_passcode: body.admin_passcode,
    theme_color: body.theme_color,
    matching_enabled: body.matching_enabled,
  });

  if (error || !event) {
    return NextResponse.json({ ok: false, error: error ?? 'Failed to create event.' }, { status: 409 });
  }

  return NextResponse.json({ ok: true, event }, { status: 201 });
}

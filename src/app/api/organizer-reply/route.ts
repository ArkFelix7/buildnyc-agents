import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';

export const maxDuration = 30;

/**
 * POST /api/organizer-reply — the organizer answers an open escalation (PRD US-12).
 * Body: { escalationId: string, answer: string }.
 * Marks the escalation answered + stamps answered_at. For the demo, persisting the
 * reply is sufficient ("posts back" to the asker). MOCK (no DB): returns ok with note.
 */
const BodySchema = z.object({
  escalationId: z.string().min(1),
  answer: z.string().min(1).max(4000),
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
    return NextResponse.json(
      { ok: false, error: 'escalationId and answer are required' },
      { status: 400 },
    );
  }
  const { escalationId, answer } = parsed.data;

  const admin = supabaseAdmin();
  if (!admin) {
    // MOCK: nothing to persist; acknowledge so the demo flow completes.
    return NextResponse.json({ ok: true, mock: true });
  }

  const { error } = await admin
    .from('escalations')
    .update({ answer, status: 'answered', answered_at: new Date().toISOString() })
    .eq('id', escalationId);

  if (error) {
    console.error('[organizer-reply] update failed:', error);
    return NextResponse.json({ ok: false, error: 'Update failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { addKnowledge } from '@/lib/concierge';

export const maxDuration = 30;

/**
 * POST /api/organizer-reply — the organizer answers an open escalation.
 * Body: { escalationId, answer, saveToKb? }.
 * Marks the escalation answered, and (optionally) folds the Q&A back into the
 * event's knowledge base so the concierge self-improves. MOCK (no DB): acknowledges.
 */
const BodySchema = z.object({
  escalationId: z.string().min(1),
  answer: z.string().min(1).max(4000),
  saveToKb: z.boolean().optional().default(false),
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
  const { escalationId, answer, saveToKb } = parsed.data;

  const admin = supabaseAdmin();
  if (!admin) {
    return NextResponse.json({ ok: true, mock: true });
  }

  // Load the escalation (need event_id + question for save-to-KB).
  const { data: esc } = await admin
    .from('escalations')
    .select('id, event_id, question')
    .eq('id', escalationId)
    .maybeSingle();

  const { error } = await admin
    .from('escalations')
    .update({ answer, status: 'answered', answered_at: new Date().toISOString() })
    .eq('id', escalationId);

  if (error) {
    console.error('[organizer-reply] update failed:', error);
    return NextResponse.json({ ok: false, error: 'Update failed' }, { status: 500 });
  }

  // Self-improving KB: fold the confirmed Q&A back into the event's knowledge base.
  let savedToKb = false;
  if (saveToKb && esc?.event_id) {
    try {
      await addKnowledge(
        esc.event_id as string,
        `Q: ${esc.question}\nA: ${answer}`,
        'organizer-answer',
      );
      savedToKb = true;
    } catch (err) {
      console.error('[organizer-reply] save-to-kb failed:', err);
    }
  }

  return NextResponse.json({ ok: true, savedToKb });
}

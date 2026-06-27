import { NextResponse } from 'next/server';
import { z } from 'zod';
import { startConversation } from '@/lib/conversation';

export const maxDuration = 300;

const BodySchema = z.object({
  conversationId: z.string().min(1),
});

/**
 * POST /api/conversation/start — kick off an agent-to-agent conversation.
 * Fire-and-forget: returns { ok: true } immediately while the dialogue runs.
 * Body: { conversationId }.
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
      { ok: false, error: 'conversationId is required' },
      { status: 400 },
    );
  }

  // Fire-and-forget: don't await the (potentially long) dialogue.
  void startConversation(parsed.data.conversationId).catch(() => {
    /* errors are handled/contained inside startConversation */
  });

  return NextResponse.json({ ok: true });
}

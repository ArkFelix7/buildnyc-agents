import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { seedConversationCards } from '@/lib/mock-data';
import { TUNING } from '@/lib/constants';
import { getEventBySlug } from '@/lib/events';
import type { Conversation, ConversationCard, Message, ProfileBrief } from '@/lib/types';

export const dynamic = 'force-dynamic';

function toCard(
  conversation: Conversation,
  a: ProfileBrief,
  b: ProfileBrief,
  messages: Message[],
): ConversationCard {
  return {
    conversation,
    a,
    b,
    messages: [...messages].sort((m1, m2) => m1.turn_number - m2.turn_number),
  };
}

/**
 * GET /api/conversations?event=slug
 *   → { cards: ConversationCard[] } for the event's Mission Control screen.
 *
 * LIVE: active conversations for the event, newest first, joined with both
 *       profiles (generated-avatar fields) + recent messages.
 * MOCK: pre-baked seed cards. ?all=1 includes completed conversations.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const includeAll = url.searchParams.get('all') === '1';
  const eventSlug = url.searchParams.get('event');
  const db = supabaseAdmin();

  // ── MOCK MODE ──────────────────────────────────────────────────────────
  if (!db) {
    return NextResponse.json({ cards: seedConversationCards() });
  }

  const event = eventSlug ? await getEventBySlug(eventSlug) : null;

  try {
    let query = db
      .from('conversations')
      .select(
        `
        id, event_id, profile_a, profile_b, match_score, match_reason, summary, status, created_at,
        a:profiles!conversations_profile_a_fkey ( id, name, role, avatar_style, avatar_seed ),
        b:profiles!conversations_profile_b_fkey ( id, name, role, avatar_style, avatar_seed ),
        messages ( id, conversation_id, speaker, content, turn_number, created_at )
      `,
      )
      .order('created_at', { ascending: false })
      .limit(TUNING.maxConcurrentPairs);

    if (event) query = query.eq('event_id', event.id);
    if (!includeAll) query = query.eq('status', 'active');

    const { data, error } = await query;
    if (error) throw error;

    const cards: ConversationCard[] = (data ?? []).map((row: Record<string, unknown>) => {
      const conversation: Conversation = {
        id: row.id as string,
        event_id: (row.event_id as string | null) ?? null,
        profile_a: row.profile_a as string,
        profile_b: row.profile_b as string,
        match_score: (row.match_score as number | null) ?? null,
        match_reason: (row.match_reason as string | null) ?? null,
        summary: (row.summary as string | null) ?? null,
        status: row.status as Conversation['status'],
        created_at: row.created_at as string,
      };
      const rawA = (Array.isArray(row.a) ? row.a[0] : row.a) as ProfileBrief | undefined;
      const rawB = (Array.isArray(row.b) ? row.b[0] : row.b) as ProfileBrief | undefined;
      const fallback = (id: string): ProfileBrief => ({
        id,
        name: 'Builder',
        role: null,
        avatar_style: null,
        avatar_seed: null,
      });
      const messages = (row.messages as Message[] | null) ?? [];
      return toCard(
        conversation,
        rawA ?? fallback(conversation.profile_a),
        rawB ?? fallback(conversation.profile_b),
        messages,
      );
    });

    return NextResponse.json({ cards });
  } catch (err) {
    console.error('[api/conversations] query failed, falling back to seed:', err);
    return NextResponse.json({ cards: seedConversationCards() });
  }
}
